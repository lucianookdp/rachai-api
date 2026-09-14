import { describe, expect, it } from 'vitest';
import { resolveShares } from './expenseShares.js';

const GROUP = new Set(['a', 'b', 'c']);

describe('resolveShares', () => {
  it('splits evenly among the given participantIds', () => {
    const result = resolveShares(1000, GROUP, { participantIds: ['a', 'b', 'c'] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shares.reduce((sum, s) => sum + s.shareCents, 0)).toBe(1000);
      expect(result.shares.map((s) => s.participantId)).toEqual(['a', 'b', 'c']);
    }
  });

  it('splits evenly among the whole group when participantIds is omitted', () => {
    const result = resolveShares(900, GROUP, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shares).toEqual([
        { participantId: 'a', shareCents: 300 },
        { participantId: 'b', shareCents: 300 },
        { participantId: 'c', shareCents: 300 },
      ]);
    }
  });

  it('rejects a participantId outside the group', () => {
    const result = resolveShares(1000, GROUP, { participantIds: ['a', 'z'] });
    expect(result).toEqual({ ok: false, error: 'participantIds contains someone outside this group' });
  });

  it('accepts explicit unequal shares that sum to amountCents', () => {
    const shares = [
      { participantId: 'a', shareCents: 700 },
      { participantId: 'b', shareCents: 300 },
    ];
    const result = resolveShares(1000, GROUP, { shares });
    expect(result).toEqual({ ok: true, shares });
  });

  it('rejects shares that do not sum to amountCents', () => {
    const shares = [
      { participantId: 'a', shareCents: 700 },
      { participantId: 'b', shareCents: 200 },
    ];
    const result = resolveShares(1000, GROUP, { shares });
    expect(result).toEqual({ ok: false, error: 'shares must add up to amountCents' });
  });

  it('rejects shares naming someone outside the group', () => {
    const shares = [{ participantId: 'z', shareCents: 1000 }];
    const result = resolveShares(1000, GROUP, { shares });
    expect(result).toEqual({ ok: false, error: 'shares contains someone outside this group' });
  });

  it('prefers explicit shares over participantIds when both are given', () => {
    const shares = [{ participantId: 'a', shareCents: 1000 }];
    const result = resolveShares(1000, GROUP, { shares, participantIds: ['a', 'b', 'c'] });
    expect(result).toEqual({ ok: true, shares });
  });
});
