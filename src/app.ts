import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { Env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerGroupRoutes } from './routes/groups.js';

export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    trustProxy: true,
    bodyLimit: 1024 * 100, // 100kb: this API only ever accepts small JSON payloads
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 15552000, includeSubDomains: true },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(cookie, {
    secret: env.JWT_SECRET,
  });

  app.decorate('jwtSecret', env.JWT_SECRET);

  app.setErrorHandler((error: FastifyError | ZodError, _request, reply) => {
    if (error instanceof ZodError) {
      const message = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      return reply.status(400).send({ error: message });
    }

    app.log.error(error);
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    const message = statusCode < 500 ? error.message : 'Internal server error';
    reply.status(statusCode).send({ error: message });
  });

  app.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      return reply.status(503).send({ status: 'degraded', database: 'down' });
    }
  });

  await app.register(registerGroupRoutes, { prefix: '/groups' });
  await app.register(registerAdminRoutes, { prefix: '/admin' });

  return app;
}
