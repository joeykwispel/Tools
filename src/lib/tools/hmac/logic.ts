import { decode as decodeBase64 } from '../base64/logic';
import { fromHex } from '../hex/logic';
import { toBase64, toHex } from '../hash/logic';

/** HMAC (RFC 2104) with WebCrypto: signing a message with a shared secret, the way webhooks and APIs prove where a message came from. */

export const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

/** How the key is written. */
export type KeyFormat = 'text' | 'hex' | 'base64';

/** The key as bytes, or null when it is not valid in the chosen format. Text is taken as UTF-8. */
export function keyBytes(key: string, format: KeyFormat): Uint8Array | null {
  if (format === 'text') return new TextEncoder().encode(key);
  const result = format === 'hex' ? fromHex(key) : decodeBase64(key);
  return result.ok ? result.bytes : null;
}

export async function hmac(algorithm: Algorithm, key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  // an empty key is allowed by HMAC, but not by WebCrypto's importKey: a key of one zero byte gives the same result
  const raw = key.length ? key : new Uint8Array(1);
  const cryptoKey = await crypto.subtle.importKey('raw', raw.slice().buffer, { name: 'HMAC', hash: algorithm }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, message.slice().buffer));
}

export type Verdict = { kind: 'none' } | { kind: 'match' } | { kind: 'mismatch' } | { kind: 'wrongLength'; expected: number; got: number };

/**
 * Compares a signature you were given with the one just made. It may be hex or Base64, and may carry the prefix a
 * service puts in front of it, like GitHub's "sha256=…".
 */
export function compare(given: string, signature: Uint8Array): Verdict {
  const text = given.trim().replace(/^(sha(1|256|384|512)|v1)=/i, '');
  if (!text) return { kind: 'none' };
  const hex = text.toLowerCase();
  if (hex === toHex(signature) || text === toBase64(signature)) return { kind: 'match' };
  // the length tells whether it was made with another algorithm, or has the right shape and a different value
  const bytes = /^[0-9a-f]+$/.test(hex) && hex.length % 2 === 0 ? hex.length / 2 : (decodeBase64(text) as { ok: boolean; bytes?: Uint8Array }).bytes?.length;
  if (bytes !== undefined && bytes !== signature.length) return { kind: 'wrongLength', expected: signature.length, got: bytes };
  return { kind: 'mismatch' };
}

export { toBase64, toHex };
