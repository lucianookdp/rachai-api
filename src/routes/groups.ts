import argon2 from 'argon2';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { calculateNetBalances } from '../lib/balances.js';
import { extractBearerToken, signGroupToken, verifyGroupToken } from '../lib/auth.js';
import { simplifyDebts } from '../lib/debtSimplification.js';
import { generateGroupCode } from '../lib/groupCode.js';
import { splitEqually } from '../lib/money.js';
import { prisma } from '../lib/prisma.js';
import {
  addParticipantSchema,
  createExpenseSchema,
  createGroupSchema,
  joinGroupSchema,
  recordPaymentSchema,
  updateExpenseSchema,
} from '../schemas/group.js';

const MAX_CODE_GENERATION_ATTEMPTS = 5;

async function requireGroupAuth(request: FastifyRequest, reply: FastifyReply) {
  const app = request.server;
  const token = extractBearerToken(request.headers.authorization);
  const payload = token ? verifyGroupToken(token, app.jwtSecret) : null;

  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const { code } = request.params as { code: string };
  const group = await prisma.group.findUnique({ where: { code: code.toUpperCase() } });

  if (!group || !group.active || group.id !== payload.groupId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  request.groupId = group.id;
}

export async function registerGroupRoutes(app: FastifyInstance) {
  app.post('/', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const body = createGroupSchema.parse(request.body);
      const pinHash = await argon2.hash(body.pin, { type: argon2.argon2id });

      let code = '';
      for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
        const candidate = generateGroupCode();
        const existing = await prisma.group.findUnique({ where: { code: candidate } });
        if (!existing) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        return reply.status(500).send({ error: 'Could not generate a unique group code' });
      }

      const group = await prisma.group.create({
        data: { name: body.name, code, pinHash, currency: body.currency },
      });

      return reply.status(201).send({ code: group.code, name: group.name, currency: group.currency });
    },
  });

  app.post('/:code/join', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const { code } = request.params as { code: string };
      const body = joinGroupSchema.parse(request.body);

      const group = await prisma.group.findUnique({ where: { code: code.toUpperCase() } });
      if (!group || !group.active) {
        return reply.status(401).send({ error: 'Invalid code or PIN' });
      }

      const validPin = await argon2.verify(group.pinHash, body.pin);
      if (!validPin) {
        return reply.status(401).send({ error: 'Invalid code or PIN' });
      }

      const token = signGroupToken(group.id, app.jwtSecret);
      return { token, name: group.name, currency: group.currency };
    },
  });

  app.get('/:code', { preHandler: requireGroupAuth }, async (request) => {
    const group = await prisma.group.findUniqueOrThrow({ where: { id: request.groupId } });
    return { code: group.code, name: group.name, currency: group.currency, createdAt: group.createdAt };
  });

  app.post('/:code/participants', { preHandler: requireGroupAuth }, async (request, reply) => {
    const body = addParticipantSchema.parse(request.body);
    const participant = await prisma.participant.create({
      data: { groupId: request.groupId!, name: body.name },
    });
    return reply.status(201).send(participant);
  });

  app.get('/:code/participants', { preHandler: requireGroupAuth }, async (request) => {
    return prisma.participant.findMany({
      where: { groupId: request.groupId! },
      orderBy: { createdAt: 'asc' },
    });
  });

  app.post('/:code/expenses', { preHandler: requireGroupAuth }, async (request, reply) => {
    const body = createExpenseSchema.parse(request.body);
    const groupId = request.groupId!;

    const participants = await prisma.participant.findMany({ where: { groupId } });
    const participantIds = new Set(participants.map((p) => p.id));
    if (!participantIds.has(body.paidById)) {
      return reply.status(400).send({ error: 'paidById is not a participant in this group' });
    }

    const splitAmong = body.participantIds ?? [...participantIds];
    if (!splitAmong.every((id) => participantIds.has(id))) {
      return reply.status(400).send({ error: 'participantIds contains someone outside this group' });
    }

    const shares = splitEqually(body.amountCents, splitAmong.length);

    const expense = await prisma.expense.create({
      data: {
        groupId,
        description: body.description,
        amountCents: body.amountCents,
        paidById: body.paidById,
        shares: {
          create: splitAmong.map((participantId, index) => ({
            participantId,
            shareCents: shares[index]!,
          })),
        },
      },
      include: { shares: true },
    });

    return reply.status(201).send(expense);
  });

  app.get('/:code/expenses', { preHandler: requireGroupAuth }, async (request) => {
    return prisma.expense.findMany({
      where: { groupId: request.groupId! },
      include: { shares: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  app.patch('/:code/expenses/:id', { preHandler: requireGroupAuth }, async (request, reply) => {
    const { id } = request.params as { code: string; id: string };
    const body = updateExpenseSchema.parse(request.body);
    const groupId = request.groupId!;

    const existing = await prisma.expense.findFirst({ where: { id, groupId } });
    if (!existing) {
      return reply.status(404).send({ error: 'Expense not found' });
    }

    const participants = await prisma.participant.findMany({ where: { groupId } });
    const participantIds = new Set(participants.map((p) => p.id));

    const paidById = body.paidById ?? existing.paidById;
    if (!participantIds.has(paidById)) {
      return reply.status(400).send({ error: 'paidById is not a participant in this group' });
    }

    const amountCents = body.amountCents ?? existing.amountCents;
    const splitAmong =
      body.participantIds ??
      (await prisma.expenseShare.findMany({ where: { expenseId: id } })).map((s) => s.participantId);

    if (!splitAmong.every((pid) => participantIds.has(pid))) {
      return reply.status(400).send({ error: 'participantIds contains someone outside this group' });
    }

    const shares = splitEqually(amountCents, splitAmong.length);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.expenseShare.deleteMany({ where: { expenseId: id } });
      return tx.expense.update({
        where: { id },
        data: {
          description: body.description ?? existing.description,
          amountCents,
          paidById,
          shares: {
            create: splitAmong.map((participantId, index) => ({
              participantId,
              shareCents: shares[index]!,
            })),
          },
        },
        include: { shares: true },
      });
    });

    return updated;
  });

  app.delete('/:code/expenses/:id', { preHandler: requireGroupAuth }, async (request, reply) => {
    const { id } = request.params as { code: string; id: string };
    const existing = await prisma.expense.findFirst({ where: { id, groupId: request.groupId! } });
    if (!existing) {
      return reply.status(404).send({ error: 'Expense not found' });
    }
    await prisma.expense.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get('/:code/balances', { preHandler: requireGroupAuth }, async (request) => {
    const groupId = request.groupId!;

    const [participants, expenses, payments] = await Promise.all([
      prisma.participant.findMany({ where: { groupId } }),
      prisma.expense.findMany({ where: { groupId }, include: { shares: true } }),
      prisma.payment.findMany({ where: { groupId } }),
    ]);

    const shares = expenses.flatMap((expense) =>
      expense.shares.map((share) => ({ participantId: share.participantId, shareCents: share.shareCents })),
    );

    const netBalances = calculateNetBalances({
      participantIds: participants.map((p) => p.id),
      expenses: expenses.map((e) => ({ paidById: e.paidById, amountCents: e.amountCents })),
      shares,
      payments: payments.map((p) => ({ fromId: p.fromId, toId: p.toId, amountCents: p.amountCents })),
    });

    const balances = participants.map((p) => ({
      participantId: p.id,
      name: p.name,
      amountCents: netBalances.get(p.id) ?? 0,
    }));

    const suggestedTransfers = simplifyDebts(
      balances.map((b) => ({ participantId: b.participantId, amountCents: b.amountCents })),
    );

    const byId = new Map(participants.map((p) => [p.id, p.name]));
    return {
      balances,
      suggestedTransfers: suggestedTransfers.map((t) => ({
        ...t,
        fromName: byId.get(t.fromId),
        toName: byId.get(t.toId),
      })),
    };
  });

  app.post('/:code/payments', { preHandler: requireGroupAuth }, async (request, reply) => {
    const body = recordPaymentSchema.parse(request.body);
    const groupId = request.groupId!;

    const participants = await prisma.participant.findMany({ where: { groupId } });
    const participantIds = new Set(participants.map((p) => p.id));
    if (!participantIds.has(body.fromId) || !participantIds.has(body.toId)) {
      return reply.status(400).send({ error: 'fromId and toId must be participants in this group' });
    }

    const payment = await prisma.payment.create({
      data: { groupId, fromId: body.fromId, toId: body.toId, amountCents: body.amountCents },
    });

    return reply.status(201).send(payment);
  });

  app.get('/:code/payments', { preHandler: requireGroupAuth }, async (request) => {
    return prisma.payment.findMany({
      where: { groupId: request.groupId! },
      orderBy: { createdAt: 'desc' },
    });
  });
}
