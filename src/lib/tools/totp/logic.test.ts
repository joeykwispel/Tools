import { describe, expect, it } from 'vitest';
import { counterAt, hotp, newSecret, parseUri, remaining, secretBytes, totp, toUri, type Algorithm } from './logic';

const ascii = (text: string) => new TextEncoder().encode(text);

/** The key of the test vectors in RFC 4226 and RFC 6238: "1234567890" repeated to the length of the hash. */
const KEY = '12345678901234567890';
const KEYS: Record<Algorithm, Uint8Array> = {
  'SHA-1': ascii(KEY),
  'SHA-256': ascii((KEY + KEY).slice(0, 32)),
  'SHA-512': ascii((KEY + KEY + KEY + KEY).slice(0, 64))
};

describe('hotp', () => {
  it('gives the codes of RFC 4226, appendix D', async () => {
    const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    const codes = await Promise.all(expected.map((_, counter) => hotp(KEYS['SHA-1'], counter)));
    expect(codes).toEqual(expected);
  });

  it('keeps the zeros in front', async () => {
    // RFC 6238 at 1111111109 seconds: 07081804
    expect(await hotp(KEYS['SHA-1'], 37037036, 8)).toBe('07081804');
    expect(await hotp(KEYS['SHA-1'], 37037036, 6)).toBe('081804');
  });

  it('takes a large counter, also one of more than 32 bits', async () => {
    // RFC 6238 at 20000000000 seconds
    expect(await hotp(KEYS['SHA-1'], 0x27bc86aa, 8)).toBe('65353130');
    expect(await hotp(KEYS['SHA-1'], 2 ** 32, 6)).toMatch(/^\d{6}$/);
    expect(await hotp(KEYS['SHA-1'], 2 ** 32, 6)).not.toBe(await hotp(KEYS['SHA-1'], 0, 6));
  });
});

describe('totp', () => {
  it('gives the codes of RFC 6238, appendix B', async () => {
    const vectors: [seconds: number, sha1: string, sha256: string, sha512: string][] = [
      [59, '94287082', '46119246', '90693936'],
      [1111111109, '07081804', '68084774', '25091201'],
      [1111111111, '14050471', '67062674', '99943326'],
      [1234567890, '89005924', '91819424', '93441116'],
      [2000000000, '69279037', '90698825', '38618901'],
      [20000000000, '65353130', '77737706', '47863826']
    ];
    for (const [seconds, sha1, sha256, sha512] of vectors) {
      const at = (algorithm: Algorithm) => totp(KEYS[algorithm], seconds * 1000, { algorithm, digits: 8, period: 30 });
      expect([await at('SHA-1'), await at('SHA-256'), await at('SHA-512')]).toEqual([sha1, sha256, sha512]);
    }
  });

  it('gives the next and the previous code', async () => {
    const key = KEYS['SHA-1'];
    expect(await totp(key, 59_000)).toBe('287082');
    expect(await totp(key, 59_000, undefined, 1)).toBe('359152');
    expect(await totp(key, 59_000, undefined, -1)).toBe('755224');
    expect(await totp(key, 60_000)).toBe('359152');
  });

  it('counts periods and the seconds left in one', () => {
    expect(counterAt(0)).toBe(0);
    expect(counterAt(29_999)).toBe(0);
    expect(counterAt(30_000)).toBe(1);
    expect(counterAt(59_000, 60)).toBe(0);
    expect(remaining(0)).toBe(30);
    expect(remaining(999)).toBe(30);
    expect(remaining(1_000)).toBe(29);
    expect(remaining(59_000)).toBe(1);
    expect(remaining(59_000, 60)).toBe(1);
    expect(remaining(61_000, 60)).toBe(59);
  });
});

describe('secretBytes and newSecret', () => {
  it('reads a secret as an authenticator shows it', () => {
    const expected = { ok: true, bytes: KEYS['SHA-1'] };
    expect(secretBytes('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')).toEqual(expected);
    expect(secretBytes('gezd gnbv gy3t qojq gezd gnbv gy3t qojq')).toEqual(expected);
    expect(secretBytes('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ====')).toEqual(expected);
  });

  it('says what is wrong with a secret', () => {
    expect(secretBytes('')).toEqual({ ok: false, error: 'empty' });
    expect(secretBytes('  ')).toEqual({ ok: false, error: 'empty' });
    expect(secretBytes('not base32!')).toEqual({ ok: false, error: 'characters' });
    expect(secretBytes('ABC')).toEqual({ ok: false, error: 'length' });
  });

  it('makes a secret of 160 bits', () => {
    expect(newSecret((bytes) => bytes.fill(0))).toBe('A'.repeat(32));
    expect(newSecret((bytes) => bytes.fill(255))).toBe('7'.repeat(32));
    const secret = newSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(secretBytes(secret)).toMatchObject({ ok: true });
    expect(newSecret()).not.toBe(secret);
  });
});

describe('parseUri and toUri', () => {
  it('reads the link of a 2FA QR code', () => {
    expect(
      parseUri('otpauth://totp/ACME%20Co:john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=30')
    ).toEqual({
      ok: true,
      account: { secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ', issuer: 'ACME Co', account: 'john.doe@email.com', algorithm: 'SHA-1', digits: 6, period: 30 }
    });
  });

  it('fills in what the link leaves out', () => {
    expect(parseUri('otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP')).toEqual({
      ok: true,
      account: { secret: 'JBSWY3DPEHPK3PXP', issuer: '', account: 'alice', algorithm: 'SHA-1', digits: 6, period: 30 }
    });
    // the issuer from the label, with the space some services put after the colon
    expect(parseUri('otpauth://totp/Example:%20alice?secret=JBSWY3DPEHPK3PXP&algorithm=sha256&digits=8&period=60')).toEqual({
      ok: true,
      account: { secret: 'JBSWY3DPEHPK3PXP', issuer: 'Example', account: 'alice', algorithm: 'SHA-256', digits: 8, period: 60 }
    });
    // the issuer as a parameter wins from the one in the label
    expect(parseUri('otpauth://totp/Old:alice?secret=JBSWY3DPEHPK3PXP&issuer=New')).toMatchObject({ account: { issuer: 'New', account: 'alice' } });
  });

  it('says what is wrong with a link', () => {
    expect(parseUri('https://example.com')).toEqual({ ok: false, error: 'scheme' });
    expect(parseUri('otpauth://other/alice?secret=JBSWY3DPEHPK3PXP')).toEqual({ ok: false, error: 'scheme' });
    expect(parseUri('otpauth://hotp/alice?secret=JBSWY3DPEHPK3PXP&counter=1')).toEqual({ ok: false, error: 'hotp' });
    expect(parseUri('otpauth://totp/alice')).toEqual({ ok: false, error: 'secret' });
    expect(parseUri('otpauth://totp/alice?secret=!!!')).toEqual({ ok: false, error: 'secret' });
    expect(parseUri('otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&algorithm=MD5')).toEqual({ ok: false, error: 'settings' });
    expect(parseUri('otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&digits=12')).toEqual({ ok: false, error: 'settings' });
    expect(parseUri('otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&period=0')).toEqual({ ok: false, error: 'settings' });
  });

  it('writes the link with every setting in it', () => {
    expect(toUri({ secret: 'jbsw y3dp ehpk 3pxp', issuer: 'ACME Co', account: 'john@example.com', algorithm: 'SHA-256', digits: 8, period: 60 })).toBe(
      'otpauth://totp/ACME%20Co:john%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60'
    );
    expect(toUri({ secret: 'JBSWY3DPEHPK3PXP', issuer: '', account: 'alice', algorithm: 'SHA-1', digits: 6, period: 30 })).toBe(
      'otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&algorithm=SHA1&digits=6&period=30'
    );
  });

  it('reads back what it wrote', () => {
    const account = { secret: 'JBSWY3DPEHPK3PXP', issuer: 'Tools & more', account: 'joey: test', algorithm: 'SHA-512' as const, digits: 7, period: 45 };
    expect(parseUri(toUri(account))).toEqual({ ok: true, account: { ...account, account: 'joey: test' } });
  });
});
