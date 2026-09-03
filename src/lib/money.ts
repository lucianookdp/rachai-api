// Splitting a total in cents must never lose or gain a cent to rounding.
// The remainder is handed out one cent at a time to the first participants
// in the list, which is deterministic and keeps the sum exact.
export function splitEqually(amountCents: number, participantCount: number): number[] {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error('amountCents must be a non-negative integer');
  }
  if (!Number.isInteger(participantCount) || participantCount <= 0) {
    throw new Error('participantCount must be a positive integer');
  }

  const base = Math.floor(amountCents / participantCount);
  const remainder = amountCents - base * participantCount;

  return Array.from({ length: participantCount }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}
