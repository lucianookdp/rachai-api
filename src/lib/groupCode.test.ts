import { describe, expect, it } from 'vitest';
import { generateGroupCode } from './groupCode.js';

describe('generateGroupCode', () => {
  it('generates a code of the requested length', () => {
    expect(generateGroupCode(6)).toHaveLength(6);
    expect(generateGroupCode(8)).toHaveLength(8);
  });

  it('only uses unambiguous uppercase letters and digits', () => {
    const code = generateGroupCode(6);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
  });

  it('does not repeat across a sample small enough that a collision would signal a real bug', () => {
    // 32^6 possible codes: with 300 draws, collision probability is ~0.001%
    // under true randomness, so any duplicate here points to a broken generator.
    const codes = new Set(Array.from({ length: 300 }, () => generateGroupCode()));
    expect(codes.size).toBe(300);
  });
});
