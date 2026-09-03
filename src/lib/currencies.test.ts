import { describe, expect, it } from 'vitest';
import { isSupportedCurrency } from './currencies.js';

describe('isSupportedCurrency', () => {
  it('accepts common currency codes', () => {
    expect(isSupportedCurrency('USD')).toBe(true);
    expect(isSupportedCurrency('BRL')).toBe(true);
    expect(isSupportedCurrency('EUR')).toBe(true);
    expect(isSupportedCurrency('JPY')).toBe(true);
  });

  it('rejects unknown or malformed codes', () => {
    expect(isSupportedCurrency('XXX')).toBe(false);
    expect(isSupportedCurrency('usd')).toBe(false);
    expect(isSupportedCurrency('')).toBe(false);
    expect(isSupportedCurrency('DOLLAR')).toBe(false);
  });
});
