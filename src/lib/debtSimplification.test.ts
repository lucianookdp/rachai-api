import { describe, expect, it } from 'vitest';
import { simplifyDebts, type ParticipantBalance } from './debtSimplification.js';

function balanceOf(transfers: ReturnType<typeof simplifyDebts>, balances: ParticipantBalance[]) {
  const net = new Map(balances.map((b) => [b.participantId, 0]));
  for (const b of balances) net.set(b.participantId, b.amountCents);
  for (const t of transfers) {
    net.set(t.fromId, (net.get(t.fromId) ?? 0) + t.amountCents);
    net.set(t.toId, (net.get(t.toId) ?? 0) - t.amountCents);
  }
  return net;
}

describe('simplifyDebts', () => {
  it('returns no transfers for an empty group', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('returns no transfers when everyone is already settled', () => {
    expect(simplifyDebts([{ participantId: 'a', amountCents: 0 }])).toEqual([]);
  });

  it('settles two people with a single transfer', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'a', amountCents: 1000 },
      { participantId: 'b', amountCents: -1000 },
    ];
    expect(simplifyDebts(balances)).toEqual([{ fromId: 'b', toId: 'a', amountCents: 1000 }]);
  });

  it('zeroes out every balance for a typical group', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'a', amountCents: 3000 },
      { participantId: 'b', amountCents: -1000 },
      { participantId: 'c', amountCents: -2000 },
    ];
    const transfers = simplifyDebts(balances);
    const net = balanceOf(transfers, balances);
    for (const amount of net.values()) expect(amount).toBe(0);
  });

  it('never produces more transfers than participants minus one', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'a', amountCents: 500 },
      { participantId: 'b', amountCents: 700 },
      { participantId: 'c', amountCents: -300 },
      { participantId: 'd', amountCents: -900 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(balances.length - 1);
    const net = balanceOf(transfers, balances);
    for (const amount of net.values()) expect(amount).toBe(0);
  });

  it('handles duplicate amounts among creditors and debtors', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'a', amountCents: 500 },
      { participantId: 'b', amountCents: 500 },
      { participantId: 'c', amountCents: -500 },
      { participantId: 'd', amountCents: -500 },
    ];
    const transfers = simplifyDebts(balances);
    const net = balanceOf(transfers, balances);
    for (const amount of net.values()) expect(amount).toBe(0);
  });

  it('ignores participants who are already settled, mixed in with active ones', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'a', amountCents: 0 },
      { participantId: 'b', amountCents: 1000 },
      { participantId: 'c', amountCents: -1000 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers.every((t) => t.fromId !== 'a' && t.toId !== 'a')).toBe(true);
    const net = balanceOf(transfers, balances);
    for (const amount of net.values()) expect(amount).toBe(0);
  });

  it('handles a single large group without leaving any balance unsettled', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'p1', amountCents: 12345 },
      { participantId: 'p2', amountCents: -333 },
      { participantId: 'p3', amountCents: 222 },
      { participantId: 'p4', amountCents: -9876 },
      { participantId: 'p5', amountCents: -2358 },
    ];
    const transfers = simplifyDebts(balances);
    const net = balanceOf(transfers, balances);
    for (const amount of net.values()) expect(amount).toBe(0);
  });
});
