import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    jwtSecret: string;
  }

  interface FastifyRequest {
    groupId?: string;
    adminId?: string;
  }
}
