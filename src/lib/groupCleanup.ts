import type { FastifyInstance } from 'fastify';
import { prisma } from './prisma.js';

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function deleteStaleGroups(app: FastifyInstance): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  // Participants/Expenses/Payments cascade-delete with the Group (see schema.prisma).
  const { count } = await prisma.group.deleteMany({ where: { lastActivityAt: { lt: cutoff } } });
  if (count > 0) {
    app.log.info(`Deleted ${count} group(s) with no activity in over 30 days`);
  }
}

// Runs inside the API process itself rather than a separate cron service,
// since Railway keeps this service running continuously anyway.
export function scheduleGroupCleanup(app: FastifyInstance): void {
  void deleteStaleGroups(app).catch((error) => app.log.error(error, 'Group cleanup sweep failed'));

  const timer = setInterval(() => {
    void deleteStaleGroups(app).catch((error) => app.log.error(error, 'Group cleanup sweep failed'));
  }, SWEEP_INTERVAL_MS);
  timer.unref();

  app.addHook('onClose', () => {
    clearInterval(timer);
  });
}
