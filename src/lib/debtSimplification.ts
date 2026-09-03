export interface ParticipantBalance {
  participantId: string;
  amountCents: number;
}

export interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
}

// Minimizes the number of transfers needed to settle a group by greedily
// matching the largest creditor with the largest debtor, over and over,
// until every balance reaches zero. This is not guaranteed to find the
// theoretical minimum (that variant of the problem is NP-hard), but it is a
// fast, well-known heuristic that performs close to optimal in practice.
export function simplifyDebts(balances: ParticipantBalance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.amountCents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const debtors = balances
    .filter((b) => b.amountCents < 0)
    .map((b) => ({ participantId: b.participantId, amountCents: -b.amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]!;
    const debtor = debtors[j]!;
    const amount = Math.min(creditor.amountCents, debtor.amountCents);

    if (amount > 0) {
      transfers.push({ fromId: debtor.participantId, toId: creditor.participantId, amountCents: amount });
    }

    creditor.amountCents -= amount;
    debtor.amountCents -= amount;

    if (creditor.amountCents === 0) i++;
    if (debtor.amountCents === 0) j++;
  }

  return transfers;
}
