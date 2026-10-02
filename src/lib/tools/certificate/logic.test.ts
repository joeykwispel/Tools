import { X509Certificate, createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EC_CA, ED25519, RSA } from './fixtures';
import { fingerprint, formatName, parse, utc, validity, type Certificate } from './logic';

const certificate = (pem: string): Certificate => {
  const [first] = parse(pem);
  if (!first?.ok) throw new Error(first ? first.error : 'nothing parsed');
  return first.certificate;
};

/** Node reads the same certificates: what it finds is what this parser has to find. */
describe('against Node', () => {
  for (const [label, pem] of [
    ['RSA', RSA],
    ['EC CA', EC_CA],
    ['Ed25519', ED25519]
  ] as const)
    it(`reads the ${label} certificate the same way`, () => {
      const mine = certificate(pem);
      const node = new X509Certificate(pem);
      expect(mine.subject.map((p) => `${p.type}=${p.value}`).join('\n')).toBe(node.subject);
      expect(mine.issuer.map((p) => `${p.type}=${p.value}`).join('\n')).toBe(node.issuer);
      expect(mine.serial).toBe(node.serialNumber);
      expect(mine.notBefore).toBe(Date.parse(node.validFrom));
      expect(mine.notAfter).toBe(Date.parse(node.validTo));
      // Node only calls it a CA when its key usage also allows signing certificates
      expect((mine.isCA ?? false) && (!mine.keyUsage.length || mine.keyUsage.includes('keyCertSign'))).toBe(node.ca);
      expect(fingerprint(new Uint8Array(createHash('sha256').update(mine.der).digest()))).toBe(node.fingerprint256);
      const alt = mine.altNames.map((n) => `${{ DNS: 'DNS', IP: 'IP Address', email: 'email', URI: 'URI', other: 'other' }[n.type]}:${n.value}`).join(', ');
      expect(alt).toBe(node.subjectAltName ?? '');
      expect(mine.extendedKeyUsage.length).toBe(node.keyUsage?.length ?? 0);
    });
});

describe('the RSA certificate', () => {
  const cert = certificate(RSA);

  it('has its names, key and signature', () => {
    expect(formatName(cert.subject)).toBe('C=NL, ST=Gelderland, L=Druten, O=Example B.V., OU=Dev, CN=tools.example.test, emailAddress=dev@example.test');
    expect(cert.selfSigned).toBe(true);
    expect(cert.version).toBe(3);
    expect(cert.signature).toEqual({ name: 'SHA-256 with RSA', family: 'rsa', weak: false });
    expect(cert.publicKey).toEqual({ name: 'RSA', family: 'rsa', bits: 2048, curve: null });
  });

  it('has its alternative names and what it may be used for', () => {
    expect(cert.altNames).toEqual([
      { type: 'DNS', value: 'tools.example.test' },
      { type: 'DNS', value: '*.example.test' },
      { type: 'IP', value: '192.0.2.10' },
      { type: 'email', value: 'dev@example.test' },
      { type: 'URI', value: 'https://example.test/id' }
    ]);
    expect(cert.keyUsage).toEqual(['digitalSignature', 'keyEncipherment']);
    expect(cert.extendedKeyUsage).toEqual(['serverAuth', 'clientAuth']);
  });

  it('is valid for a year', () => {
    expect(Math.round((cert.notAfter - cert.notBefore) / 86_400_000)).toBe(365);
    expect(utc(cert.notBefore)).toMatch(/^2026-10-02 \d\d:\d\d:\d\d UTC$/);
  });
});

describe('the other certificates', () => {
  it('reads a certificate authority with an elliptic-curve key', () => {
    const cert = certificate(EC_CA);
    expect(cert.isCA).toBe(true);
    expect(cert.pathLength).toBe(1);
    expect(cert.keyUsage).toEqual(['keyCertSign', 'cRLSign']);
    expect(cert.signature).toEqual({ name: 'ECDSA with SHA-384', family: 'ecdsa', weak: false });
    expect(cert.publicKey).toEqual({ name: 'ECDSA', family: 'ecdsa', bits: 256, curve: 'P-256' });
  });

  it('reads an Ed25519 certificate', () => {
    const cert = certificate(ED25519);
    expect(cert.signature).toEqual({ name: 'Ed25519', family: 'eddsa', weak: false });
    expect(cert.publicKey).toEqual({ name: 'Ed25519', family: 'eddsa', bits: 256, curve: null });
    expect(formatName(cert.subject)).toBe('CN=ed.example.test');
    expect(cert.altNames).toEqual([]);
  });
});

describe('parse', () => {
  it('reads a chain of certificates, in order', () => {
    const all = parse(`${RSA}\n${EC_CA}\n\n${ED25519}\n`);
    expect(all.map((r) => r.ok && r.certificate.publicKey.name)).toEqual(['RSA', 'ECDSA', 'Ed25519']);
  });

  it('reads the Base64 without its BEGIN and END lines, and with Windows line endings', () => {
    const body = RSA.replace(/-----[A-Z ]+-----/g, '').trim();
    expect(parse(body)[0].ok).toBe(true);
    expect(parse(RSA.replace(/\n/g, '\r\n'))[0].ok).toBe(true);
  });

  it('warns about a private key, and names other kinds of block', () => {
    expect(parse('-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----')).toEqual([{ ok: false, error: 'privateKey', label: 'PRIVATE KEY' }]);
    expect(parse('-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----')[0]).toMatchObject({ error: 'privateKey' });
    expect(parse('-----BEGIN CERTIFICATE REQUEST-----\nMIIB\n-----END CERTIFICATE REQUEST-----')).toEqual([
      { ok: false, error: 'otherBlock', label: 'CERTIFICATE REQUEST' }
    ]);
  });

  it('says so when it is not a certificate', () => {
    expect(parse('')).toEqual([]);
    expect(parse('hello')).toEqual([{ ok: false, error: 'none' }]);
    expect(parse('-----BEGIN CERTIFICATE-----\n!!!\n-----END CERTIFICATE-----')).toEqual([{ ok: false, error: 'base64' }]);
    expect(parse('-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----')).toEqual([{ ok: false, error: 'structure' }]);
    // a certificate cut off halfway
    const half = RSA.split('\n').slice(0, 12).join('\n') + '\n-----END CERTIFICATE-----';
    expect(parse(half)).toEqual([{ ok: false, error: 'structure' }]);
  });
});

describe('validity', () => {
  const cert = { notBefore: Date.UTC(2026, 0, 1), notAfter: Date.UTC(2026, 11, 31) };

  it('says how long a certificate is still valid, or how long ago it expired', () => {
    expect(validity(cert, Date.UTC(2026, 11, 1))).toEqual({ state: 'valid', days: 30 });
    expect(validity(cert, Date.UTC(2027, 0, 10, 12))).toEqual({ state: 'expired', days: 10 });
    expect(validity(cert, Date.UTC(2025, 11, 25))).toEqual({ state: 'notYet', days: 7 });
  });
});

describe('utc and fingerprint', () => {
  it('writes a moment and a fingerprint the usual way', () => {
    expect(utc(Date.UTC(2026, 9, 2, 21, 2, 0))).toBe('2026-10-02 21:02:00 UTC');
    expect(fingerprint(new Uint8Array([0xb9, 0xa3, 0x04]))).toBe('B9:A3:04');
  });
});
