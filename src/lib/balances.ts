export interface ExpenseContribution {
  paidById: string;
  amountCents: number;
}

export interface ShareContribution {
  participantId: string;
  shareCents: number;
}

export interface PaymentContribution {
  fromId: string;
  toId: string;
  amountCents: number;
}

// Positive balance = the group owes this participant money (creditor).
// Negative balance = this participant owes the group money (debtor).
export function calculateNetBalances(params: {
  participantIds: string[];
  expenses: ExpenseContribution[];
  shares: ShareContribution[];
  payments: PaymentContribution[];
}): Map<string, number> {
  const balances = new Map(params.participantIds.map((id) => [id, 0]));

  const add = (id: string, delta: number) => balances.set(id, (balances.get(id) ?? 0) + delta);

  for (const expense of params.expenses) add(expense.paidById, expense.amountCents);
  for (const share of params.shares) add(share.participantId, -share.shareCents);

  // A recorded payment settles part of a debt: the payer's balance moves
  // toward zero (or positive), the recipient's moves toward zero (or negative).
  for (const payment of params.payments) {
    add(payment.fromId, payment.amountCents);
    add(payment.toId, -payment.amountCents);
  }

  return balances;
}
