import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    jwtSecret: string;
    cookieDomain: string | undefined;
  }

  interface FastifyRequest {
    groupId?: string;
    groupRole?: 'editor' | 'viewer';
    adminId?: string;
    adminAuthMethod?: 'cookie' | 'bearer';
  }
}
