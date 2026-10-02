/** Hexadecimal and Base32 (RFC 4648), as pure functions over bytes. */

export type Bytes = { ok: true; bytes: Uint8Array } | { ok: false; error: 'characters' | 'length' };

export type Separator = '' | ' ' | ':';

/** Bytes to hex: two digits per byte, optionally separated and in upper case. */
export const toHex = (bytes: Uint8Array, separator: Separator = '', upper = false): string => {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(separator);
  return upper ? hex.toUpperCase() : hex;
};

/**
 * Hex to bytes. Accepts what hex looks like in the wild: upper or lower case, with spaces, colons, dashes, commas or
 * line breaks between the bytes, and with 0x or \x in front of them.
 */
export function fromHex(text: string): Bytes {
  const digits = text.replace(/0x|\\x/gi, '').replace(/[\s:,-]/g, '');
  if (!/^[0-9a-fA-F]*$/.test(digits)) return { ok: false, error: 'characters' };
  if (digits.length % 2) return { ok: false, error: 'length' };
  return { ok: true, bytes: Uint8Array.from(digits.match(/../g) ?? [], (pair) => parseInt(pair, 16)) };
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Bytes to Base32: 5 bits per character, padded with = to a multiple of 8 characters unless `padding` is off. */
export function toBase32(bytes: Uint8Array, padding = true): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return padding ? out.padEnd(Math.ceil(out.length / 8) * 8, '=') : out;
}

/** Base32 to bytes. Case does not matter; padding, spaces and dashes are ignored (authenticator secrets come in groups). */
export function fromBase32(text: string): Bytes {
  const clean = text.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (!/^[A-Z2-7]*$/.test(clean)) return { ok: false, error: 'characters' };
  // 8 characters make 5 bytes; these left-over lengths can't come from whole bytes
  if ([1, 3, 6].includes(clean.length % 8)) return { ok: false, error: 'length' };
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    buffer = (buffer << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return { ok: true, bytes: Uint8Array.from(bytes) };
}

/** The bytes as text, or null when they are not valid UTF-8. */
export function toText(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
