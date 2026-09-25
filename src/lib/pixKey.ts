export type PixKeyResult = { ok: true; key: string } | { ok: false; error: 'cpf_not_allowed' | 'invalid_pix_key' };

const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+55\d{10,11}$/;

function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  const check = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, i) => total + weight * Number(digits[i]), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

/**
 * A Pix key in the form a bank app expects, or why it was refused. Random
 * keys, e-mail, phone (with +55) and CNPJ are accepted. A CPF never is: the
 * key is visible to everyone who has the group link, view-only visitors
 * included, and a CPF is not something to hand to all of them.
 */
export function normalizePixKey(raw: string): PixKeyResult {
  const value = raw.trim();
  if (EVP.test(value)) return { ok: true, key: value.toLowerCase() };
  if (value.includes('@')) {
    const email = value.toLowerCase();
    return email.length <= 77 && EMAIL.test(email) ? { ok: true, key: email } : { ok: false, error: 'invalid_pix_key' };
  }
  if (value.startsWith('+')) {
    const phone = value.replace(/[\s().-]/g, '');
    return PHONE.test(phone) ? { ok: true, key: phone } : { ok: false, error: 'invalid_pix_key' };
  }
  const digits = value.replace(/[\s./-]/g, '');
  if (/^\d{11}$/.test(digits)) return { ok: false, error: 'cpf_not_allowed' };
  if (isValidCnpj(digits)) return { ok: true, key: digits };
  return { ok: false, error: 'invalid_pix_key' };
}
