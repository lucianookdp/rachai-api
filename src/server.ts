import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { ensureAdminSeeded } from './lib/adminBootstrap.js';

const env = loadEnv();
await ensureAdminSeeded(env);
const app = await buildApp(env);

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
