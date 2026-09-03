import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticator } from 'otplib';
import { extractBearerToken, signAdminTempToken, signAdminToken, verifyAdminTempToken, verifyAdminToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { adminLoginSchema, adminTotpVerifySchema } from '../schemas/admin.js';

const SESSION_COOKIE = 'rachai_admin_session';
const CSRF_COOKIE = 'rachai_admin_csrf';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function issueSession(reply: FastifyReply, app: FastifyInstance, adminId: string): string {
  const sessionToken = signAdminToken(adminId, app.jwtSecret);
  const csrfToken = randomBytes(24).toString('hex');

  reply.setCookie(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: true,
    // The admin frontend and this API are on different domains, and a
    // SameSite=Strict cookie is never sent on a cross-site request no
    // matter what CORS allows. The exact-origin CORS allowlist plus the
    // double-submit CSRF token are what actually protect this cookie.
    sameSite: 'none',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  reply.setCookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return sessionToken;
}

// Accepts either an Authorization: Bearer token or the session cookie, so
// this keeps working whether the admin frontend ends up on the same domain
// as the API (cookie) or a different one, where a cross-site cookie can be
// silently dropped by the browser (bearer).
async function requireAdminAuth(request: FastifyRequest, reply: FastifyReply) {
  const app = request.server;
  const bearerToken = extractBearerToken(request.headers.authorization);
  const sessionToken = bearerToken ?? request.cookies[SESSION_COOKIE];
  const payload = sessionToken ? verifyAdminToken(sessionToken, app.jwtSecret) : null;

  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  request.adminId = payload.adminId;
  request.adminAuthMethod = bearerToken ? 'bearer' : 'cookie';
}

// Cookies alone are not enough CSRF protection for state-changing requests,
// so a cookie-authenticated mutation also requires this header to match the
// readable cookie set at login (the classic double-submit pattern). A bearer
// token carries no such risk: a forged cross-site request can't attach an
// Authorization header it doesn't have, so there is nothing to check.
function requireCsrf(request: FastifyRequest, reply: FastifyReply): void {
  if (request.adminAuthMethod === 'bearer') return;

  const cookieValue = request.cookies[CSRF_COOKIE];
  const headerValue = request.headers['x-csrf-token'];
  if (!cookieValue || !headerValue || cookieValue !== headerValue) {
    reply.status(403).send({ error: 'Invalid CSRF token' });
  }
}

async function logAdminAction(adminId: string, action: string, targetType?: string, targetId?: string) {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId },
  });
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post('/auth/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const body = adminLoginSchema.parse(request.body);
      const admin = await prisma.adminUser.findUnique({ where: { email: body.email } });

      const genericError = () => reply.status(401).send({ error: 'Invalid credentials' });

      if (!admin) return genericError();
      const validPassword = await argon2.verify(admin.passwordHash, body.password);
      if (!validPassword) return genericError();

      if (admin.totpEnabled) {
        const tempToken = signAdminTempToken(admin.id, app.jwtSecret);
        return { requiresTotp: true, tempToken };
      }

      const token = issueSession(reply, app, admin.id);
      return { requiresTotp: false, token };
    },
  });

  app.post('/auth/totp/verify', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const body = adminTotpVerifySchema.parse(request.body);
      const payload = verifyAdminTempToken(body.tempToken, app.jwtSecret);
      if (!payload) {
        return reply.status(401).send({ error: 'Invalid or expired login attempt' });
      }

      const admin = await prisma.adminUser.findUnique({ where: { id: payload.adminId } });
      if (!admin?.totpSecret || !authenticator.check(body.code, admin.totpSecret)) {
        return reply.status(401).send({ error: 'Invalid code' });
      }

      const token = issueSession(reply, app, admin.id);
      return { ok: true, token };
    },
  });

  app.post('/auth/logout', { preHandler: requireAdminAuth }, async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.post('/totp/setup', { preHandler: requireAdminAuth }, async (request) => {
    const secret = authenticator.generateSecret();
    await prisma.adminUser.update({ where: { id: request.adminId }, data: { totpSecret: secret } });
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: request.adminId } });
    const otpauthUrl = authenticator.keyuri(admin.email, 'Rachai Admin', secret);
    return { otpauthUrl };
  });

  app.post('/totp/enable', { preHandler: [requireAdminAuth, requireCsrf] }, async (request, reply) => {
    const body = adminTotpVerifySchema.pick({ code: true }).parse(request.body);
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: request.adminId } });

    if (!admin.totpSecret || !authenticator.check(body.code, admin.totpSecret)) {
      return reply.status(400).send({ error: 'Invalid code' });
    }

    await prisma.adminUser.update({ where: { id: admin.id }, data: { totpEnabled: true } });
    await logAdminAction(admin.id, 'enable_totp');
    return { ok: true };
  });

  app.get('/dashboard/stats', { preHandler: requireAdminAuth }, async () => {
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalGroups, activeGroups, totalExpenses, volume] = await Promise.all([
      prisma.group.count(),
      prisma.group.count({ where: { active: true, updatedAt: { gte: activeSince } } }),
      prisma.expense.count(),
      prisma.expense.aggregate({ _sum: { amountCents: true } }),
    ]);

    const groupsByDay = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
      FROM "Group"
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `;

    return {
      totalGroups,
      activeGroups,
      totalExpenses,
      totalVolumeCents: volume._sum.amountCents ?? 0,
      groupsByDay: groupsByDay.map((row) => ({ day: row.day, count: Number(row.count) })),
    };
  });

  app.get('/dashboard/groups', { preHandler: requireAdminAuth }, async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Number(query.limit) || 50, 200);

    const groups = await prisma.group.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        active: true,
        createdAt: true,
        _count: { select: { participants: true, expenses: true } },
      },
    });

    return groups;
  });

  app.post('/groups/:id/deactivate', { preHandler: [requireAdminAuth, requireCsrf] }, async (request) => {
    const { id } = request.params as { id: string };
    const group = await prisma.group.update({ where: { id }, data: { active: false } });
    await logAdminAction(request.adminId!, 'deactivate_group', 'group', id);
    return { code: group.code, active: group.active };
  });

  app.delete('/groups/:id', { preHandler: [requireAdminAuth, requireCsrf] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.group.delete({ where: { id } });
    await logAdminAction(request.adminId!, 'delete_group', 'group', id);
    return reply.status(204).send();
  });

  app.get('/audit-log', { preHandler: requireAdminAuth }, async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Number(query.limit) || 100, 500);

    return prisma.adminAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { email: true } } },
    });
  });
}
