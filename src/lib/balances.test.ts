import { describe, expect, it } from 'vitest';
import { calculateNetBalances } from './balances.js';

describe('calculateNetBalances', () => {
  it('returns zero for every participant when there is no activity', () => {
    const balances = calculateNetBalances({
      participantIds: ['a', 'b'],
      expenses: [],
      shares: [],
      payments: [],
    });
    expect(balances.get('a')).toBe(0);
    expect(balances.get('b')).toBe(0);
  });

  it('credits the payer and debits each share', () => {
    const balances = calculateNetBalances({
      participantIds: ['a', 'b', 'c'],
      expenses: [{ paidById: 'a', amountCents: 900 }],
      shares: [
        { participantId: 'a', shareCents: 300 },
        { participantId: 'b', shareCents: 300 },
        { participantId: 'c', shareCents: 300 },
      ],
      payments: [],
    });
    expect(balances.get('a')).toBe(600);
    expect(balances.get('b')).toBe(-300);
    expect(balances.get('c')).toBe(-300);
  });

  it('applies a recorded payment toward the debt it settles', () => {
    const balances = calculateNetBalances({
      participantIds: ['a', 'b'],
      expenses: [{ paidById: 'a', amountCents: 1000 }],
      shares: [
        { participantId: 'a', shareCents: 500 },
        { participantId: 'b', shareCents: 500 },
      ],
      payments: [{ fromId: 'b', toId: 'a', amountCents: 500 }],
    });
    expect(balances.get('a')).toBe(0);
    expect(balances.get('b')).toBe(0);
  });

  it('accumulates balances across multiple expenses', () => {
    const balances = calculateNetBalances({
      participantIds: ['a', 'b'],
      expenses: [
        { paidById: 'a', amountCents: 1000 },
        { paidById: 'b', amountCents: 400 },
      ],
      shares: [
        { participantId: 'a', shareCents: 500 },
        { participantId: 'b', shareCents: 500 },
        { participantId: 'a', shareCents: 200 },
        { participantId: 'b', shareCents: 200 },
      ],
      payments: [],
    });
    expect(balances.get('a')).toBe(300);
    expect(balances.get('b')).toBe(-300);
  });
});
