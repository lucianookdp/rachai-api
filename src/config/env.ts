import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Comma-separated list, so the API can serve a frontend mid-migration
  // between two domains (e.g. the old GitHub Pages URL and a new custom one)
  // without ever falling back to a permissive wildcard origin.
  CORS_ORIGIN: z
    .string()
    .min(1, 'CORS_ORIGIN is required')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Optional. Set to the shared parent domain (e.g. ".userachai.com.br") once
  // the frontend and this API are on subdomains of the same registrable
  // domain, so the admin session cookie can be scoped to both instead of
  // being dropped as third-party. Leave unset when they're on unrelated
  // domains — cross-site SameSite=None plus the bearer-token fallback keep
  // the admin panel working either way.
  COOKIE_DOMAIN: z.string().optional(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return result.data;
}
