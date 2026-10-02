import { decode as decodeBase64 } from '../base64/logic';

/** JSON Web Tokens (RFC 7519, signed as JWS, RFC 7515): reading one, and checking its signature with WebCrypto. */

export type Json = Record<string, unknown>;

export interface Jwt {
  header: Json;
  payload: Json;
  signature: Uint8Array;
  /** The first two parts as they were sent: this, not the decoded JSON, is what the signature covers */
  signed: string;
}

export type Parsed = { ok: true; jwt: Jwt } | { ok: false; error: 'parts' | 'base64' | 'json'; part?: 'header' | 'payload' | 'signature' };

function json(part: string): Json | 'base64' | 'json' {
  const decoded = decodeBase64(part);
  if (!decoded.ok || decoded.text === null) return 'base64';
  try {
    const value: unknown = JSON.parse(decoded.text);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : 'json';
  } catch {
    return 'json';
  }
}

/** Splits a token into its header, payload and signature. A "Bearer " prefix and surrounding whitespace are ignored. */
export function parse(token: string): Parsed {
  const parts = token
    .trim()
    .replace(/^Bearer\s+/i, '')
    .split('.');
  if (parts.length !== 3) return { ok: false, error: 'parts' };
  const header = json(parts[0]);
  if (typeof header === 'string') return { ok: false, error: header, part: 'header' };
  const payload = json(parts[1]);
  if (typeof payload === 'string') return { ok: false, error: payload, part: 'payload' };
  const signature = decodeBase64(parts[2]);
  if (!signature.ok) return { ok: false, error: 'base64', part: 'signature' };
  return { ok: true, jwt: { header, payload, signature: signature.bytes, signed: `${parts[0]}.${parts[1]}` } };
}

/** The registered claims that hold a time, as seconds since 1970. */
export const TIME_CLAIMS = ['exp', 'nbf', 'iat'] as const;

/** "2018-01-18 01:30:22 UTC". Always UTC, so the page reads the same on the server and in every time zone. */
export function utc(seconds: number): string {
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? String(seconds) : `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

export type Validity =
  | { state: 'no-expiry' }
  /** `seconds` until it expires */
  | { state: 'valid'; seconds: number }
  /** `seconds` since it expired */
  | { state: 'expired'; seconds: number }
  /** `seconds` until it becomes valid (nbf) */
  | { state: 'not-yet'; seconds: number };

/** Whether the token is inside its exp / nbf window at `now` (seconds since 1970). */
export function validity(payload: Json, now: number): Validity {
  const { exp, nbf } = payload;
  if (typeof nbf === 'number' && now < nbf) return { state: 'not-yet', seconds: Math.ceil(nbf - now) };
  if (typeof exp !== 'number') return { state: 'no-expiry' };
  return now >= exp ? { state: 'expired', seconds: Math.floor(now - exp) } : { state: 'valid', seconds: Math.ceil(exp - now) };
}

/** "2d 3h", "59m 12s", "8s": the two largest units. */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const units: [number, string][] = [
    [Math.floor(s / 86400), 'd'],
    [Math.floor((s % 86400) / 3600), 'h'],
    [Math.floor((s % 3600) / 60), 'm'],
    [s % 60, 's']
  ];
  const first = units.findIndex(([n]) => n > 0);
  if (first === -1) return '0s';
  return units
    .slice(first, first + 2)
    .filter(([n]) => n > 0)
    .map(([n, unit]) => `${n}${unit}`)
    .join(' ');
}

export type AlgorithmKind = 'hmac' | 'rsa' | 'ecdsa' | 'eddsa' | 'post-quantum' | 'none' | 'unknown';

/**
 * What kind of signature `alg` is. RSA and elliptic-curve signatures can be forged by a large quantum computer
 * (Shor's algorithm); an HMAC with a shared secret, and the ML-DSA family, can not.
 */
export function algorithm(alg: unknown): { kind: AlgorithmKind; quantumSafe: boolean | null } {
  if (typeof alg !== 'string') return { kind: 'unknown', quantumSafe: null };
  if (alg.toLowerCase() === 'none') return { kind: 'none', quantumSafe: null };
  if (/^HS(256|384|512)$/.test(alg)) return { kind: 'hmac', quantumSafe: true };
  if (/^(RS|PS)(256|384|512)$/.test(alg)) return { kind: 'rsa', quantumSafe: false };
  if (/^ES(256|384|512|256K)$/.test(alg)) return { kind: 'ecdsa', quantumSafe: false };
  if (/^(EdDSA|Ed25519|Ed448)$/.test(alg)) return { kind: 'eddsa', quantumSafe: false };
  if (/^(ML-DSA|SLH-DSA)/.test(alg)) return { kind: 'post-quantum', quantumSafe: true };
  return { kind: 'unknown', quantumSafe: null };
}

export type Verdict =
  | 'valid'
  | 'invalid'
  /** alg is "none": there is no signature to check */
  | 'unsigned'
  | 'no-key'
  /** the key could not be read, or does not fit the algorithm */
  | 'bad-key'
  /** an algorithm this browser's WebCrypto can't check */
  | 'unsupported';

interface Scheme {
  key: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams;
  check: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
}

function scheme(alg: string): Scheme | null {
  const bits = /(256|384|512)$/.exec(alg)?.[1];
  const hash = `SHA-${bits}`;
  if (/^HS(256|384|512)$/.test(alg)) return { key: { name: 'HMAC', hash }, check: 'HMAC' };
  if (/^RS(256|384|512)$/.test(alg)) return { key: { name: 'RSASSA-PKCS1-v1_5', hash }, check: 'RSASSA-PKCS1-v1_5' };
  if (/^PS(256|384|512)$/.test(alg)) return { key: { name: 'RSA-PSS', hash }, check: { name: 'RSA-PSS', saltLength: Number(bits) / 8 } };
  // ES512 uses the P-521 curve: that is not a typo
  if (/^ES(256|384|512)$/.test(alg)) return { key: { name: 'ECDSA', namedCurve: bits === '512' ? 'P-521' : `P-${bits}` }, check: { name: 'ECDSA', hash } };
  if (alg === 'EdDSA' || alg === 'Ed25519') return { key: 'Ed25519', check: 'Ed25519' };
  return null;
}

/** Reads a key: a shared secret for HMAC; for the others a public key as PEM ("BEGIN PUBLIC KEY") or as a JWK. */
async function importKey(text: string, alg: string, s: Scheme): Promise<CryptoKey> {
  if (alg.startsWith('HS')) return crypto.subtle.importKey('raw', new TextEncoder().encode(text), s.key, false, ['verify']);
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return crypto.subtle.importKey('jwk', JSON.parse(trimmed) as JsonWebKey, s.key, false, ['verify']);
  const pem = /-----BEGIN PUBLIC KEY-----([\s\S]+?)-----END PUBLIC KEY-----/.exec(trimmed);
  const der = pem && decodeBase64(pem[1]);
  if (!der?.ok) throw new Error('not a public key');
  return crypto.subtle.importKey('spki', der.bytes.slice().buffer, s.key, false, ['verify']);
}

/** Checks the signature with `key`. Nothing leaves the page: WebCrypto does the work. */
export async function verify(jwt: Jwt, key: string): Promise<Verdict> {
  const { alg } = jwt.header;
  if (algorithm(alg).kind === 'none') return 'unsigned';
  const s = typeof alg === 'string' ? scheme(alg) : null;
  if (!s || typeof alg !== 'string') return 'unsupported';
  if (!key.trim()) return 'no-key';
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await importKey(key, alg, s);
  } catch (e) {
    // an algorithm the browser does not know is reported as NotSupportedError; everything else is a problem with the key
    return e instanceof DOMException && e.name === 'NotSupportedError' ? 'unsupported' : 'bad-key';
  }
  try {
    const ok = await crypto.subtle.verify(s.check, cryptoKey, jwt.signature.slice().buffer, new TextEncoder().encode(jwt.signed));
    return ok ? 'valid' : 'invalid';
  } catch {
    return 'bad-key';
  }
}

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

/** Signs `payload` with HS256, for the sample token. */
export async function signHs256(payload: Json, secret: string): Promise<string> {
  const encode = (value: Json) => base64url(new TextEncoder().encode(JSON.stringify(value)));
  const signed = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  return `${signed}.${base64url(new Uint8Array(signature))}`;
}
