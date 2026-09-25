import { describe, expect, it } from 'vitest';
import { normalizePixKey } from './pixKey.js';

describe('normalizePixKey', () => {
  it('accepts random keys, e-mail, phone with +55 and CNPJ, in bank-app form', () => {
    expect(normalizePixKey(' 123E4567-E89B-12D3-A456-426614174000 ')).toEqual({
      ok: true,
      key: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(normalizePixKey('Maria@Example.com')).toEqual({ ok: true, key: 'maria@example.com' });
    expect(normalizePixKey('+55 (11) 98765-4321')).toEqual({ ok: true, key: '+5511987654321' });
    expect(normalizePixKey('11.222.333/0001-81')).toEqual({ ok: true, key: '11222333000181' });
  });

  it('refuses a CPF, because the whole group can read the key', () => {
    expect(normalizePixKey('123.456.789-09')).toEqual({ ok: false, error: 'cpf_not_allowed' });
    // Eleven bare digits could be a phone without +55 too; either way it isn't accepted.
    expect(normalizePixKey('11987654321')).toEqual({ ok: false, error: 'cpf_not_allowed' });
  });

  it('refuses anything else', () => {
    for (const junk of ['', 'abc', '+1 555 0100', '11.222.333/0001-80', 'a@b', `${'x'.repeat(80)}@example.com`]) {
      expect(normalizePixKey(junk)).toEqual({ ok: false, error: 'invalid_pix_key' });
    }
  });
});
