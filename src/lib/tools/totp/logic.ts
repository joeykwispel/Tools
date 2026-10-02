import { fromBase32, toBase32 } from '../hex/logic';
import { hmac } from '../hmac/logic';

/**
 * One-time codes the way an authenticator app makes them: HOTP (RFC 4226) from a secret and a counter, and TOTP
 * (RFC 6238), where the counter is the number of periods since 1970. The HMAC itself is WebCrypto's.
 */

export const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-512'] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

export interface Settings {
  algorithm: Algorithm;
  /** How long a code is: 6 nearly everywhere, at most 8 */
  digits: number;
  /** How many seconds a code is valid: 30 nearly everywhere */
  period: number;
}

/** What every authenticator app assumes when nothing else is said. */
export const DEFAULTS: Settings = { algorithm: 'SHA-1', digits: 6, period: 30 };

export const MIN_DIGITS = 6;
export const MAX_DIGITS = 8;

/** The code for one value of the counter. */
export async function hotp(key: Uint8Array, counter: number, digits = DEFAULTS.digits, algorithm: Algorithm = DEFAULTS.algorithm): Promise<string> {
  // the counter as 8 bytes, most significant first; a JavaScript number has no 64 bits to shift, so in two halves
  const message = new Uint8Array(8);
  const view = new DataView(message.buffer);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = await hmac(algorithm, key, message);
  // "dynamic truncation": the last four bits say where in the HMAC the 31 bits of the code start
  const offset = mac[mac.length - 1] & 15;
  const number = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(number % 10 ** digits).padStart(digits, '0');
}

/** Which period a moment (in milliseconds since 1970) falls in. */
export const counterAt = (time: number, period = DEFAULTS.period) => Math.floor(time / 1000 / period);

/** How many whole seconds the code of this moment is still valid: from `period` down to 1. */
export const remaining = (time: number, period = DEFAULTS.period) => period - (Math.floor(time / 1000) % period);

/** The code at a moment. `offset` 1 gives the next code, -1 the previous one. */
export const totp = (key: Uint8Array, time: number, settings: Settings = DEFAULTS, offset = 0) =>
  hotp(key, counterAt(time, settings.period) + offset, settings.digits, settings.algorithm);

export type Key = { ok: true; bytes: Uint8Array } | { ok: false; error: 'empty' | 'characters' | 'length' };

/** A secret as it is shown when you set up 2FA (Base32, any case, spaces and dashes allowed) to the bytes of the key. */
export function secretBytes(secret: string): Key {
  const result = fromBase32(secret);
  if (!result.ok) return result;
  return result.bytes.length ? result : { ok: false, error: 'empty' };
}

/** A new secret of 160 bits (what RFC 4226 recommends), as 32 Base32 characters. */
export function newSecret(random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
  return toBase32(random(new Uint8Array(20)), false);
}

export interface Account extends Settings {
  secret: string;
  /** The service the code is for, like "GitHub" */
  issuer: string;
  /** Whose account, like "joey@example.com" */
  account: string;
}

export type Parsed = { ok: true; account: Account } | { ok: false; error: 'scheme' | 'hotp' | 'secret' | 'settings' };

const URI_ALGORITHMS: Record<string, Algorithm> = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' };

const decode = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

/**
 * Reads the link inside the QR code of a 2FA set-up ("Key URI format"):
 * otpauth://totp/Issuer:account?secret=…&issuer=…&algorithm=SHA1&digits=6&period=30
 */
export function parseUri(uri: string): Parsed {
  // by hand: browsers do not agree on how to split a link with a scheme they do not know
  const match = /^otpauth:\/\/([a-z]+)\/([^?#]*)(?:\?([^#]*))?/i.exec(uri.trim());
  if (!match) return { ok: false, error: 'scheme' };
  const [, type, rawLabel, query = ''] = match;
  if (type.toLowerCase() === 'hotp') return { ok: false, error: 'hotp' };
  if (type.toLowerCase() !== 'totp') return { ok: false, error: 'scheme' };

  const params = new URLSearchParams(query);
  const secret = params.get('secret') ?? '';
  if (!secretBytes(secret).ok) return { ok: false, error: 'secret' };

  // the label is "issuer:account" or only "account"; an issuer given as a parameter wins
  const label = decode(rawLabel) ?? rawLabel;
  const colon = label.indexOf(':');
  const issuer = params.get('issuer') ?? (colon < 0 ? '' : label.slice(0, colon));
  const account = (colon < 0 ? label : label.slice(colon + 1)).trim();

  const algorithm = URI_ALGORITHMS[(params.get('algorithm') ?? 'SHA1').toUpperCase()];
  const digits = Number(params.get('digits') ?? DEFAULTS.digits);
  const period = Number(params.get('period') ?? DEFAULTS.period);
  if (!algorithm || !Number.isInteger(digits) || digits < MIN_DIGITS || digits > MAX_DIGITS || !Number.isInteger(period) || period < 1) {
    return { ok: false, error: 'settings' };
  }
  return { ok: true, account: { secret, issuer: issuer.trim(), account, algorithm, digits, period } };
}

/** The link an authenticator app reads from a QR code. Every setting is written out, so nothing is left to a default. */
export function toUri({ secret, issuer, account, algorithm, digits, period }: Account): string {
  const label = [issuer, account].filter(Boolean).map(encodeURIComponent).join(':');
  const params = [
    `secret=${secret.replace(/[\s=-]/g, '').toUpperCase()}`,
    ...(issuer ? [`issuer=${encodeURIComponent(issuer)}`] : []),
    `algorithm=${algorithm.replace('-', '')}`,
    `digits=${digits}`,
    `period=${period}`
  ];
  return `otpauth://totp/${label}?${params.join('&')}`;
}
