import { describe, expect, it } from 'vitest';
import { algorithm, duration, parse, signHs256, utc, validity, verify, type Jwt } from './logic';

/** The example token of jwt.io, signed with HS256 and the secret "your-256-bit-secret". */
const EXAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const jwt = (token: string): Jwt => {
  const parsed = parse(token);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.jwt;
};

const base64url = (bytes: Uint8Array | string) => Buffer.from(bytes as Uint8Array).toString('base64url');

/** Signs a token with a freshly made key pair, so the public-key algorithms are tested against real signatures. */
async function signed(alg: string, key: RsaHashedKeyGenParams | EcKeyGenParams | string, sign: AlgorithmIdentifier | RsaPssParams | EcdsaParams) {
  const pair = (await crypto.subtle.generateKey(key, true, ['sign', 'verify'])) as CryptoKeyPair;
  const input = `${base64url(JSON.stringify({ alg, typ: 'JWT' }))}.${base64url(JSON.stringify({ sub: 'ada' }))}`;
  const signature = new Uint8Array(await crypto.subtle.sign(sign, pair.privateKey, new TextEncoder().encode(input)));
  const spki = Buffer.from(await crypto.subtle.exportKey('spki', pair.publicKey)).toString('base64');
  return {
    token: `${input}.${base64url(signature)}`,
    pem: `-----BEGIN PUBLIC KEY-----\n${spki.match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`,
    jwk: JSON.stringify(await crypto.subtle.exportKey('jwk', pair.publicKey))
  };
}

describe('parse', () => {
  it('reads the header and the payload', () => {
    const { header, payload, signature, signed } = jwt(EXAMPLE);
    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(payload).toEqual({ sub: '1234567890', name: 'John Doe', iat: 1516239022 });
    expect(signature).toHaveLength(32);
    expect(signed).toBe(EXAMPLE.slice(0, EXAMPLE.lastIndexOf('.')));
  });

  it('ignores a Bearer prefix and whitespace around the token', () => {
    expect(parse(`  Bearer ${EXAMPLE}\n`).ok).toBe(true);
    expect(parse(`bearer   ${EXAMPLE}`).ok).toBe(true);
  });

  it('accepts a token without a signature (alg none)', () => {
    const unsigned = `${base64url('{"alg":"none"}')}.${base64url('{"sub":"x"}')}.`;
    expect(jwt(unsigned).signature).toHaveLength(0);
  });

  it('says what is wrong with something that is not a token', () => {
    expect(parse('')).toEqual({ ok: false, error: 'parts' });
    expect(parse('a.b')).toEqual({ ok: false, error: 'parts' });
    expect(parse('a.b.c.d')).toEqual({ ok: false, error: 'parts' });
    expect(parse('!!!.e30.x')).toEqual({ ok: false, error: 'base64', part: 'header' });
    expect(parse(`${base64url('not json')}.e30.x`)).toEqual({ ok: false, error: 'json', part: 'header' });
    expect(parse(`e30.${base64url('[1,2]')}.x`)).toEqual({ ok: false, error: 'json', part: 'payload' });
    expect(parse('e30.e30.!!!')).toEqual({ ok: false, error: 'base64', part: 'signature' });
  });
});

describe('validity', () => {
  const now = 1_700_000_000;

  it('counts down to exp and up from it', () => {
    expect(validity({ exp: now + 90 }, now)).toEqual({ state: 'valid', seconds: 90 });
    expect(validity({ exp: now - 90 }, now)).toEqual({ state: 'expired', seconds: 90 });
    // exp is the moment from which the token must be refused
    expect(validity({ exp: now }, now)).toEqual({ state: 'expired', seconds: 0 });
  });

  it('respects nbf', () => {
    expect(validity({ nbf: now + 30, exp: now + 90 }, now)).toEqual({ state: 'not-yet', seconds: 30 });
    expect(validity({ nbf: now - 30, exp: now + 90 }, now)).toEqual({ state: 'valid', seconds: 90 });
  });

  it('says so when there is no expiry, or it is not a number', () => {
    expect(validity({}, now)).toEqual({ state: 'no-expiry' });
    expect(validity({ exp: 'tomorrow' }, now)).toEqual({ state: 'no-expiry' });
  });
});

describe('duration and utc', () => {
  it('writes a duration in its two largest units', () => {
    expect(duration(0)).toBe('0s');
    expect(duration(8)).toBe('8s');
    expect(duration(59 * 60 + 12)).toBe('59m 12s');
    expect(duration(3600)).toBe('1h');
    expect(duration(2 * 86400 + 3 * 3600 + 59)).toBe('2d 3h');
  });

  it('writes a time claim as UTC', () => {
    expect(utc(1516239022)).toBe('2018-01-18 01:30:22 UTC');
    expect(utc(Number.MAX_VALUE)).toBe(String(Number.MAX_VALUE));
  });
});

describe('algorithm', () => {
  it('knows which signatures a quantum computer could forge', () => {
    expect(algorithm('HS256')).toEqual({ kind: 'hmac', quantumSafe: true });
    expect(algorithm('RS256')).toEqual({ kind: 'rsa', quantumSafe: false });
    expect(algorithm('PS512')).toEqual({ kind: 'rsa', quantumSafe: false });
    expect(algorithm('ES384')).toEqual({ kind: 'ecdsa', quantumSafe: false });
    expect(algorithm('EdDSA')).toEqual({ kind: 'eddsa', quantumSafe: false });
    expect(algorithm('ML-DSA-65')).toEqual({ kind: 'post-quantum', quantumSafe: true });
  });

  it('flags an unsigned token and does not guess about the rest', () => {
    expect(algorithm('none').kind).toBe('none');
    expect(algorithm('NONE').kind).toBe('none');
    expect(algorithm('XYZ').kind).toBe('unknown');
    expect(algorithm(undefined).kind).toBe('unknown');
  });
});

describe('verify', () => {
  it('accepts the right secret and refuses a wrong one (HS256)', async () => {
    expect(await verify(jwt(EXAMPLE), 'your-256-bit-secret')).toBe('valid');
    expect(await verify(jwt(EXAMPLE), 'wrong secret')).toBe('invalid');
    expect(await verify(jwt(EXAMPLE), '  ')).toBe('no-key');
  });

  it('refuses a token whose payload was changed', async () => {
    const [header, , signature] = EXAMPLE.split('.');
    const forged = `${header}.${base64url('{"sub":"1234567890","name":"John Doe","admin":true}')}.${signature}`;
    expect(await verify(jwt(forged), 'your-256-bit-secret')).toBe('invalid');
  });

  it('checks RSA signatures with a PEM or a JWK public key', async () => {
    const rsa = { modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
    const rs = await signed('RS256', { name: 'RSASSA-PKCS1-v1_5', ...rsa }, 'RSASSA-PKCS1-v1_5');
    expect(await verify(jwt(rs.token), rs.pem)).toBe('valid');
    expect(await verify(jwt(rs.token), rs.jwk)).toBe('valid');
    const ps = await signed('PS256', { name: 'RSA-PSS', ...rsa }, { name: 'RSA-PSS', saltLength: 32 });
    expect(await verify(jwt(ps.token), ps.pem)).toBe('valid');
    // another key pair's public key
    expect(await verify(jwt(rs.token), ps.pem.replace('BEGIN', 'BEGIN'))).not.toBe('valid');
  });

  it('checks elliptic-curve signatures', async () => {
    const es256 = await signed('ES256', { name: 'ECDSA', namedCurve: 'P-256' }, { name: 'ECDSA', hash: 'SHA-256' });
    expect(await verify(jwt(es256.token), es256.pem)).toBe('valid');
    expect(await verify(jwt(es256.token), es256.jwk)).toBe('valid');
    const es512 = await signed('ES512', { name: 'ECDSA', namedCurve: 'P-521' }, { name: 'ECDSA', hash: 'SHA-512' });
    expect(await verify(jwt(es512.token), es512.pem)).toBe('valid');
    const other = await signed('ES256', { name: 'ECDSA', namedCurve: 'P-256' }, { name: 'ECDSA', hash: 'SHA-256' });
    expect(await verify(jwt(es256.token), other.pem)).toBe('invalid');
  });

  it('checks Ed25519 signatures', async () => {
    const ed = await signed('EdDSA', 'Ed25519', 'Ed25519');
    expect(await verify(jwt(ed.token), ed.pem)).toBe('valid');
  });

  it('says so when the key can not be read, or there is nothing to check', async () => {
    const es = await signed('ES256', { name: 'ECDSA', namedCurve: 'P-256' }, { name: 'ECDSA', hash: 'SHA-256' });
    expect(await verify(jwt(es.token), 'just some text')).toBe('bad-key');
    expect(await verify(jwt(es.token), '{"kty":"oct"}')).toBe('bad-key');
    expect(await verify(jwt(`${base64url('{"alg":"none"}')}.e30.`), 'x')).toBe('unsigned');
    expect(await verify(jwt(`${base64url('{"alg":"ML-DSA-65"}')}.e30.AAAA`), 'x')).toBe('unsupported');
    expect(await verify(jwt(`${base64url('{}')}.e30.AAAA`), 'x')).toBe('unsupported');
  });
});

describe('signHs256', () => {
  it('makes a token that verifies with the same secret', async () => {
    const token = await signHs256({ sub: 'ada', exp: 2_000_000_000 }, 'secret');
    expect(jwt(token).payload).toEqual({ sub: 'ada', exp: 2_000_000_000 });
    expect(await verify(jwt(token), 'secret')).toBe('valid');
    expect(await verify(jwt(token), 'Secret')).toBe('invalid');
  });
});
