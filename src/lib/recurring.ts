import { resolveShares } from './expenseShares.js';
import { touchGroupActivity } from './groupActivity.js';
import { prisma } from './prisma.js';

// Catching up after a long absence stops here; a group idle that long has
// normally been swept by the 30-day cleanup anyway.
const MAX_CATCH_UP_MONTHS = 12;

/** "YYYY-MM" in UTC. */
export function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function nextPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** The months after lastPeriod whose day has arrived by `now`, oldest first. */
export function duePeriods(lastPeriod: string, dayOfMonth: number, now: Date): string[] {
  const current = periodOf(now);
  const due: string[] = [];
  let period = nextPeriod(lastPeriod);
  while (due.length < MAX_CATCH_UP_MONTHS && (period < current || (period === current && now.getUTCDate() >= dayOfMonth))) {
    due.push(period);
    period = nextPeriod(period);
  }
  return due;
}

function dueDate(period: string, dayOfMonth: number): Date {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, month - 1, dayOfMonth, 12));
}

/**
 * Adds every monthly expense that has come due since the group was last
 * opened. There is no cron job to babysit: this runs on each authenticated
 * request, and for a group without recurring expenses it is one indexed query.
 */
export async function materializeRecurring(groupId: string, now = new Date()): Promise<number> {
  const templates = await prisma.recurringExpense.findMany({ where: { groupId } });
  const due = templates
    .map((template) => ({ template, periods: duePeriods(template.lastPeriod, template.dayOfMonth, now) }))
    .filter(({ periods }) => periods.length > 0);
  if (due.length === 0) return 0;

  const participants = await prisma.participant.findMany({ where: { groupId }, select: { id: true } });
  const groupParticipantIds = new Set(participants.map((p) => p.id));

  let created = 0;
  for (const { template, periods } of due) {
    const resolved = resolveShares(template.amountCents, groupParticipantIds, {
      participantIds: template.participantIds,
    });
    if (!resolved.ok) continue;

    created += await prisma.$transaction(async (tx) => {
      // Claim the months before adding them. Two requests opening the group
      // at once both get here; the one that loses this update (the row no
      // longer has the old lastPeriod) adds nothing. The unique
      // (recurringId, recurringPeriod) index backs this up.
      const claim = await tx.recurringExpense.updateMany({
        where: { id: template.id, lastPeriod: template.lastPeriod },
        data: { lastPeriod: periods[periods.length - 1]! },
      });
      if (claim.count === 0) return 0;

      for (const period of periods) {
        await tx.expense.create({
          data: {
            groupId,
            description: template.description,
            amountCents: template.amountCents,
            paidById: template.paidById,
            category: template.category,
            recurringId: template.id,
            recurringPeriod: period,
            createdAt: dueDate(period, template.dayOfMonth),
            shares: { create: resolved.shares },
          },
        });
      }
      return periods.length;
    });
  }

  if (created > 0) await touchGroupActivity(groupId);
  return created;
}
