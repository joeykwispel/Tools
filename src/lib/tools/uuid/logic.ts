/**
 * Making identifiers: UUID v4 and v7 (RFC 9562), ULID and NanoID. Every function takes its random bytes as an argument,
 * so the page can give it the browser's secure random numbers and the tests can give it known ones.
 */

/** Fills a byte array of the asked length with random bytes. */
export type RandomBytes = (length: number) => Uint8Array;

/** The browser's cryptographically secure random numbers. */
export const secureRandom: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const dashed = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

/** A random UUID (version 4): 122 random bits. */
export function uuidV4(random: RandomBytes = secureRandom): string {
  const bytes = random(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return dashed(hex(bytes));
}

/** A UUID that sorts by time (version 7): 48 bits of Unix time in milliseconds, then 74 random bits. */
export function uuidV7(time: number, random: RandomBytes = secureRandom): string {
  const bytes = random(16);
  let ms = Math.floor(time);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return dashed(hex(bytes));
}

/** Crockford's Base32: no I, L, O or U, so it can be read aloud and typed over without mistakes. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A ULID: 10 characters of time (milliseconds) and 16 random characters; sorts by time, like a v7 UUID, but shorter. */
export function ulid(time: number, random: RandomBytes = secureRandom): string {
  let out = '';
  let ms = Math.floor(time);
  for (let i = 0; i < 10; i++) {
    out = CROCKFORD[ms % 32] + out;
    ms = Math.floor(ms / 32);
  }
  // 16 characters of 5 bits: 80 random bits, taken from 10 bytes
  const bytes = random(10);
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}

/** The NanoID alphabet: 64 characters that are safe in a URL. */
export const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

/** A NanoID: `size` random characters from a URL-safe alphabet. 64 characters fit a byte evenly, so none is more likely than another. */
export function nanoid(size = 21, random: RandomBytes = secureRandom): string {
  return [...random(size)].map((byte) => NANOID_ALPHABET[byte & 63]).join('');
}

export type Kind = 'uuid4' | 'uuid7' | 'ulid' | 'nanoid';

export interface Options {
  uppercase?: boolean;
  /** For NanoID: how many characters */
  size?: number;
}

/** `count` identifiers of one kind. Those that hold a time all get `time`, plus their own random part. */
export function generate(
  kind: Kind,
  count: number,
  time: number,
  { uppercase = false, size = 21 }: Options = {},
  random: RandomBytes = secureRandom
): string[] {
  const n = Math.max(0, Math.min(Math.floor(count) || 0, 1000));
  const length = Math.max(2, Math.min(Math.floor(size) || 21, 128));
  return Array.from({ length: n }, () => {
    if (kind === 'ulid') return ulid(time, random);
    if (kind === 'nanoid') return nanoid(length, random);
    const id = kind === 'uuid4' ? uuidV4(random) : uuidV7(time, random);
    return uppercase ? id.toUpperCase() : id;
  });
}

export type Inspected =
  | {
      kind: 'uuid';
      version: number;
      /** RFC 9562, Microsoft, NCS or a reserved value */ variant: 'rfc' | 'microsoft' | 'ncs' | 'reserved';
      time: number | null;
    }
  | { kind: 'nil' }
  | { kind: 'max' }
  | { kind: 'ulid'; time: number }
  | { kind: 'unknown' };

/** What an identifier is, and the moment it was made if it holds one (UUID v1, v6 and v7, and ULID). */
export function inspect(id: string): Inspected {
  const text = id
    .trim()
    .replace(/^urn:uuid:/i, '')
    .replace(/^\{|\}$/g, '');
  if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(text)) {
    const h = text.replaceAll('-', '').toLowerCase();
    if (/^0+$/.test(h)) return { kind: 'nil' };
    if (/^f+$/.test(h)) return { kind: 'max' };
    const version = parseInt(h[12], 16);
    const top = parseInt(h[16], 16);
    const variant = top < 8 ? 'ncs' : top < 12 ? 'rfc' : top < 14 ? 'microsoft' : 'reserved';
    let time: number | null = null;
    if (variant === 'rfc' && version === 7) time = parseInt(h.slice(0, 12), 16);
    if (variant === 'rfc' && (version === 1 || version === 6)) {
      // 60 bits of 100-nanosecond steps since 15 October 1582, in a different order for v1 and v6
      const stamp = version === 1 ? h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8) : h.slice(0, 12) + h.slice(13, 16);
      time = Number((BigInt(`0x${stamp}`) - 122192928000000000n) / 10000n);
    }
    return { kind: 'uuid', version, variant, time };
  }
  if (/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(text)) {
    const time = [...text.slice(0, 10).toUpperCase()].reduce((sum, ch) => sum * 32 + CROCKFORD.indexOf(ch), 0);
    return { kind: 'ulid', time };
  }
  return { kind: 'unknown' };
}
