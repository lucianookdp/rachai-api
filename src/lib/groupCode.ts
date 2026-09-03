import { randomBytes } from 'node:crypto';

// Unambiguous alphabet: no 0/O, no 1/I/L, so a code read aloud or typed by
// hand is hard to mistype.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateGroupCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}
