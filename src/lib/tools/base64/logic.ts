/** Base64 (RFC 4648), as pure functions over bytes and text. */

export type Decoded =
  { ok: true; bytes: Uint8Array; /** null when the bytes are not valid UTF-8 text */ text: string | null } | { ok: false; error: 'characters' | 'length' };

/** Bytes to Base64. `urlSafe` uses - and _ instead of + and /, and leaves the padding off (RFC 4648 section 5). */
export function encodeBytes(bytes: Uint8Array, urlSafe = false): string {
  let binary = '';
  // in pieces: String.fromCharCode can't take a large file as one argument list
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const base64 = btoa(binary);
  return urlSafe ? base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') : base64;
}

/** Text to Base64, as UTF-8, so every character works and not only Latin-1. */
export const encodeText = (text: string, urlSafe = false) => encodeBytes(new TextEncoder().encode(text), urlSafe);

/**
 * Base64 to bytes, and to text when the bytes are UTF-8. Accepts both alphabets, with or without padding,
 * and ignores whitespace and line breaks, the way Base64 is found in e-mails, PEM files and URLs.
 */
export function decode(input: string): Decoded {
  const clean = input.replace(/\s+/g, '').replaceAll('-', '+').replaceAll('_', '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) return { ok: false, error: 'characters' };
  // 4 characters make 3 bytes; a single left-over character can't make a byte
  if (clean.length % 4 === 1) return { ok: false, error: 'length' };
  const binary = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  let text: string | null;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = null;
  }
  return { ok: true, bytes, text };
}

/** "1.5 kB", for telling how large the input and output are. */
export function size(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
