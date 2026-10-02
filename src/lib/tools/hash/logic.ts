/** Checksums of text and files: the SHA family by WebCrypto, and MD5 written here (WebCrypto does not have it). */

export const ALGORITHMS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

/** MD5 and SHA-1 are fine for checking a download, and broken for anything that has to resist an attacker. */
export const BROKEN: readonly Algorithm[] = ['MD5', 'SHA-1'];

const SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21].flatMap((_, i, all) =>
  i % 4 === 0 ? Array.from({ length: 4 }, () => all.slice(i, i + 4)).flat() : []
);
/** The 64 constants of MD5: the integer part of 2^32 × |sin(i + 1)|. */
const SINES = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

/** MD5 (RFC 1321). */
export function md5(bytes: Uint8Array): Uint8Array {
  // the message, a 1 bit, zeros, and the length in bits as 64 bits little-endian, to a multiple of 64 bytes
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (bytes.length * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bytes.length / 0x20000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = (f + a + SINES[i] + words[g]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((f << SHIFTS[i]) | (f >>> (32 - SHIFTS[i])))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const result = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((word, i) => result.setUint32(i * 4, word, true));
  return out;
}

/** The checksum of `bytes` by one algorithm. */
export async function digest(algorithm: Algorithm, bytes: Uint8Array): Promise<Uint8Array> {
  if (algorithm === 'MD5') return md5(bytes);
  return new Uint8Array(await crypto.subtle.digest(algorithm, bytes.slice().buffer));
}

export type Hashes = Record<Algorithm, Uint8Array>;

/** The checksum of `bytes` by every algorithm. */
export async function hashAll(bytes: Uint8Array): Promise<Hashes> {
  const all = await Promise.all(ALGORITHMS.map(async (algorithm) => [algorithm, await digest(algorithm, bytes)] as const));
  return Object.fromEntries(all) as Hashes;
}

export const toHex = (bytes: Uint8Array, upper = false) => {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return upper ? hex.toUpperCase() : hex;
};
export const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

export type Verdict =
  /** nothing to compare with */
  | { kind: 'none' }
  | { kind: 'match'; algorithm: Algorithm }
  /** it looks like a checksum of this algorithm (by its length), but it is another one */
  | { kind: 'mismatch'; algorithm: Algorithm }
  /** not a checksum of any of the algorithms */
  | { kind: 'unknown' };

/**
 * Compares a checksum someone gave you with the ones just computed. It may be written as hex in either case, with
 * spaces or colons, or as Base64; a file name behind it ("abc123  file.zip", as sha256sum prints it) is ignored.
 */
export function compare(expected: string, hashes: Hashes): Verdict {
  const text = expected.trim().split(/\s+/)[0] ?? '';
  if (!text) return { kind: 'none' };
  const hex = text.replace(/[:-]/g, '').toLowerCase();
  const isHex = /^[0-9a-f]+$/.test(hex);
  let sameLength: Algorithm | null = null;
  for (const algorithm of ALGORITHMS) {
    const bytes = hashes[algorithm];
    if ((isHex && hex === toHex(bytes)) || text === toBase64(bytes)) return { kind: 'match', algorithm };
    if ((isHex && hex.length === bytes.length * 2) || (!isHex && text.length === toBase64(bytes).length && /^[A-Za-z0-9+/]+=*$/.test(text)))
      sameLength ??= algorithm;
  }
  return sameLength ? { kind: 'mismatch', algorithm: sameLength } : { kind: 'unknown' };
}

/** "1.5 kB": the size of what was hashed. */
export function size(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} kB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}
