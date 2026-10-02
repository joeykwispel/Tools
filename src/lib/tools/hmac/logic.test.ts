import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compare, hmac, keyBytes, toBase64, toHex } from './logic';

const utf8 = (text: string) => new TextEncoder().encode(text);

describe('hmac', () => {
  it('matches the test cases of RFC 4231 and RFC 2202', async () => {
    // test case 1: a key of twenty 0x0b bytes, "Hi There"
    const key = new Uint8Array(20).fill(0x0b);
    expect(toHex(await hmac('SHA-256', key, utf8('Hi There')))).toBe('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
    // test case 2: the key "Jefe"
    const jefe = utf8('Jefe');
    const message = utf8('what do ya want for nothing?');
    expect(toHex(await hmac('SHA-256', jefe, message))).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
    expect(toHex(await hmac('SHA-512', jefe, message))).toBe(
      '164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737'
    );
    expect(toHex(await hmac('SHA-1', jefe, message))).toBe('effcdf6ae5eb2fa2d27416d5f184df9c259a7c79');
  });

  it('agrees with Node for every algorithm, a long key and an empty one', async () => {
    const message = utf8('{"event":"push","ref":"refs/heads/main"}');
    for (const algorithm of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const)
      for (const key of [utf8('secret'), new Uint8Array(200).fill(7), new Uint8Array()]) {
        const node = createHmac(algorithm.replace('-', '').toLowerCase(), key).update(message).digest('hex');
        expect(toHex(await hmac(algorithm, key, message)), `${algorithm}, key of ${key.length}`).toBe(node);
      }
  });
});

describe('keyBytes', () => {
  it('reads a key written as text, hex or Base64', () => {
    expect(keyBytes('Jefe', 'text')).toEqual(utf8('Jefe'));
    expect(keyBytes('4a656665', 'hex')).toEqual(utf8('Jefe'));
    expect(keyBytes('SmVmZQ==', 'base64')).toEqual(utf8('Jefe'));
    expect(keyBytes('', 'text')).toEqual(new Uint8Array());
  });

  it('gives null for a key that is not valid in its format', () => {
    expect(keyBytes('xyz', 'hex')).toBeNull();
    expect(keyBytes('abc', 'hex')).toBeNull();
    expect(keyBytes('!!!', 'base64')).toBeNull();
  });
});

describe('compare', () => {
  it('matches a signature in hex, Base64, upper case, or with the prefix of a webhook', async () => {
    const signature = await hmac('SHA-256', utf8('Jefe'), utf8('what do ya want for nothing?'));
    const hex = toHex(signature);
    expect(compare(hex, signature)).toEqual({ kind: 'match' });
    expect(compare(hex.toUpperCase(), signature)).toEqual({ kind: 'match' });
    expect(compare(`sha256=${hex}`, signature)).toEqual({ kind: 'match' });
    expect(compare(`  ${toBase64(signature)}\n`, signature)).toEqual({ kind: 'match' });
  });

  it('tells a wrong value from a signature made with another algorithm', async () => {
    const signature = await hmac('SHA-256', utf8('Jefe'), utf8('what do ya want for nothing?'));
    const other = await hmac('SHA-256', utf8('Jeff'), utf8('what do ya want for nothing?'));
    expect(compare(toHex(other), signature)).toEqual({ kind: 'mismatch' });
    const sha1 = await hmac('SHA-1', utf8('Jefe'), utf8('what do ya want for nothing?'));
    expect(compare(toHex(sha1), signature)).toEqual({ kind: 'wrongLength', expected: 32, got: 20 });
  });

  it('says nothing for an empty value', async () => {
    expect(compare('  ', new Uint8Array(32))).toEqual({ kind: 'none' });
    expect(compare('sha256=', new Uint8Array(32))).toEqual({ kind: 'none' });
  });
});
