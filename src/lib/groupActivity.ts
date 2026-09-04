import { prisma } from './prisma.js';

// Called from every participant/expense/payment mutation so the cleanup
// sweep can tell a group that's still being used from one that's just old.
export async function touchGroupActivity(groupId: string): Promise<void> {
  await prisma.group.update({ where: { id: groupId }, data: { lastActivityAt: new Date() } });
}
