import { describe, expect, it } from 'vitest';
import { duePeriods, nextPeriod, periodOf } from './recurring.js';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('recurring periods', () => {
  it('rolls over the year', () => {
    expect(nextPeriod('2026-12')).toBe('2027-01');
    expect(nextPeriod('2026-09')).toBe('2026-10');
    expect(periodOf(at('2026-01-05'))).toBe('2026-01');
  });

  it("adds the month only once its day has arrived", () => {
    expect(duePeriods('2026-09', 5, at('2026-10-04'))).toEqual([]);
    expect(duePeriods('2026-09', 5, at('2026-10-05'))).toEqual(['2026-10']);
  });

  it('catches up on every missed month, oldest first', () => {
    expect(duePeriods('2026-07', 10, at('2026-10-01'))).toEqual(['2026-08', '2026-09']);
    expect(duePeriods('2026-07', 10, at('2026-10-10'))).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('never catches up more than a year', () => {
    expect(duePeriods('2020-01', 1, at('2026-10-01'))).toHaveLength(12);
  });

  it('adds nothing for the month already generated', () => {
    expect(duePeriods('2026-10', 1, at('2026-10-31'))).toEqual([]);
  });
});
