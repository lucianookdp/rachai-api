import { describe, expect, it } from 'vitest';
import { splitEqually } from './money.js';

describe('splitEqually', () => {
  it('splits an evenly divisible amount with no remainder', () => {
    expect(splitEqually(3000, 3)).toEqual([1000, 1000, 1000]);
  });

  it('hands out the remainder one cent at a time to the first participants', () => {
    expect(splitEqually(1000, 3)).toEqual([334, 333, 333]);
  });

  it('always sums back to the original amount', () => {
    for (const [amount, count] of [[1, 7], [9999, 4], [100, 6], [1, 1]] as const) {
      const shares = splitEqually(amount, count);
      expect(shares.reduce((sum, share) => sum + share, 0)).toBe(amount);
    }
  });

  it('handles a zero amount', () => {
    expect(splitEqually(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it('handles a single participant', () => {
    expect(splitEqually(500, 1)).toEqual([500]);
  });

  it('rejects a non-positive participant count', () => {
    expect(() => splitEqually(100, 0)).toThrow();
    expect(() => splitEqually(100, -1)).toThrow();
  });

  it('rejects a negative amount', () => {
    expect(() => splitEqually(-100, 2)).toThrow();
  });

  it('rejects non-integer input', () => {
    expect(() => splitEqually(10.5, 2)).toThrow();
    expect(() => splitEqually(100, 2.5)).toThrow();
  });
});
