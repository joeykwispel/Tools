import { decode as decodeBase64 } from '../base64/logic';

/**
 * Reading an X.509 certificate (RFC 5280): its DER bytes are walked here, without a library and without the browser,
 * which has no API to look inside a certificate.
 */

class DerError extends Error {}

/** One element of DER: a tag, a length and a value, which is either bytes or more elements. */
interface Element {
  /** 0 universal, 1 application, 2 context-specific ([0], [1], …), 3 private */
  tagClass: number;
  /** The tag number: 2 INTEGER, 6 OID, 16 SEQUENCE, … or the n of [n] */
  tag: number;
  constructed: boolean;
  /** The value */
  bytes: Uint8Array;
  /** The whole element, tag and length included */
  raw: Uint8Array;
  children: Element[];
}

function readElement(data: Uint8Array, start: number): { element: Element; end: number } {
  let i = start;
  const need = (count: number) => {
    if (i + count > data.length) throw new DerError('truncated');
  };
  need(2);
  const first = data[i++];
  let tag = first & 0x1f;
  if (tag === 0x1f) {
    // a tag number of 31 or more is written in the bytes that follow, seven bits at a time
    tag = 0;
    let byte: number;
    do {
      need(1);
      byte = data[i++];
      tag = tag * 128 + (byte & 0x7f);
    } while (byte & 0x80);
  }
  need(1);
  let length = data[i++];
  if (length & 0x80) {
    const count = length & 0x7f;
    // DER has no "length unknown" form, and nothing here is larger than four bytes can say
    if (count === 0 || count > 4) throw new DerError('length');
    need(count);
    length = 0;
    for (let n = 0; n < count; n++) length = length * 256 + data[i++];
  }
  need(length);
  const bytes = data.subarray(i, i + length);
  const constructed = (first & 0x20) !== 0;
  const children: Element[] = [];
  if (constructed)
    for (let at = 0; at < bytes.length;) {
      const child = readElement(bytes, at);
      children.push(child.element);
      at = child.end;
    }
  return { element: { tagClass: first >> 6, tag, constructed, bytes, raw: data.subarray(start, i + length), children }, end: i + length };
}

const isUniversal = (e: Element | undefined, tag: number): e is Element => !!e && e.tagClass === 0 && e.tag === tag;
const context = (e: Element | undefined, tag: number): e is Element => !!e && e.tagClass === 2 && e.tag === tag;
function expect(e: Element | undefined, tag: number): Element {
  if (!isUniversal(e, tag)) throw new DerError('structure');
  return e;
}

/** An object identifier as dotted numbers: 2.5.4.3. */
function oid(e: Element): string {
  const { bytes } = expect(e, 6);
  const parts: number[] = [];
  let value = 0;
  bytes.forEach((byte, i) => {
    value = value * 128 + (byte & 0x7f);
    if (byte & 0x80) return;
    // the first two numbers share one value: 40 × first + second
    if (i === 0 || parts.length === 0) parts.push(Math.min(2, Math.floor(value / 40)), value - 40 * Math.min(2, Math.floor(value / 40)));
    else parts.push(value);
    value = 0;
  });
  return parts.join('.');
}

const hex = (bytes: Uint8Array) =>
  [...bytes]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

function text(e: Element): string {
  // BMPString is UTF-16 and UniversalString UTF-32, both big-endian; the others are (a subset of) UTF-8 or Latin-1
  if (e.tag === 30) return new TextDecoder('utf-16be').decode(e.bytes);
  if (e.tag === 28)
    return [...Array(e.bytes.length / 4).keys()]
      .map((i) => String.fromCodePoint(new DataView(e.bytes.buffer, e.bytes.byteOffset + i * 4, 4).getUint32(0)))
      .join('');
  if (e.tag === 20) return new TextDecoder('latin1').decode(e.bytes);
  return new TextDecoder().decode(e.bytes);
}

/** UTCTime (two-digit year: 50–99 is 19xx, 00–49 is 20xx) or GeneralizedTime, as milliseconds since 1970. */
function time(e: Element): number {
  const value = new TextDecoder().decode(e.bytes);
  const match =
    e.tag === 23 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/.exec(value) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\.\d+)?Z$/.exec(value);
  if (!match || (e.tag !== 23 && e.tag !== 24)) throw new DerError('time');
  const year = e.tag === 23 ? Number(match[1]) + (Number(match[1]) < 50 ? 2000 : 1900) : Number(match[1]);
  return Date.UTC(year, Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] ?? 0));
}

/** The attribute types of a name, by their usual short name. */
const NAME_TYPES: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.9': 'street',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.17': 'postalCode',
  '2.5.4.42': 'GN',
  '2.5.4.97': 'organizationIdentifier',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '0.9.2342.19200300.100.1.25': 'DC',
  '0.9.2342.19200300.100.1.1': 'UID'
};

export interface NamePart {
  /** CN, O, C, … or the OID when it has no usual short name */
  type: string;
  value: string;
}

function name(e: Element): NamePart[] {
  return expect(e, 16).children.flatMap((set) =>
    expect(set, 17).children.map((pair) => {
      const [type, value] = expect(pair, 16).children;
      const id = oid(type);
      return { type: NAME_TYPES[id] ?? id, value: text(value) };
    })
  );
}

export type KeyFamily = 'rsa' | 'ecdsa' | 'eddsa' | 'post-quantum' | 'unknown';

interface Known {
  name: string;
  family: KeyFamily;
}

const ALGORITHMS: Record<string, Known> = {
  '1.2.840.113549.1.1.1': { name: 'RSA', family: 'rsa' },
  '1.2.840.113549.1.1.4': { name: 'MD5 with RSA', family: 'rsa' },
  '1.2.840.113549.1.1.5': { name: 'SHA-1 with RSA', family: 'rsa' },
  '1.2.840.113549.1.1.10': { name: 'RSA-PSS', family: 'rsa' },
  '1.2.840.113549.1.1.11': { name: 'SHA-256 with RSA', family: 'rsa' },
  '1.2.840.113549.1.1.12': { name: 'SHA-384 with RSA', family: 'rsa' },
  '1.2.840.113549.1.1.13': { name: 'SHA-512 with RSA', family: 'rsa' },
  '1.2.840.10045.2.1': { name: 'ECDSA', family: 'ecdsa' },
  '1.2.840.10045.4.1': { name: 'ECDSA with SHA-1', family: 'ecdsa' },
  '1.2.840.10045.4.3.2': { name: 'ECDSA with SHA-256', family: 'ecdsa' },
  '1.2.840.10045.4.3.3': { name: 'ECDSA with SHA-384', family: 'ecdsa' },
  '1.2.840.10045.4.3.4': { name: 'ECDSA with SHA-512', family: 'ecdsa' },
  '1.3.101.112': { name: 'Ed25519', family: 'eddsa' },
  '1.3.101.113': { name: 'Ed448', family: 'eddsa' },
  '2.16.840.1.101.3.4.3.17': { name: 'ML-DSA-44', family: 'post-quantum' },
  '2.16.840.1.101.3.4.3.18': { name: 'ML-DSA-65', family: 'post-quantum' },
  '2.16.840.1.101.3.4.3.19': { name: 'ML-DSA-87', family: 'post-quantum' }
};
/** Signatures made with these are no longer accepted by browsers. */
const WEAK = new Set(['1.2.840.113549.1.1.4', '1.2.840.113549.1.1.5', '1.2.840.10045.4.1']);

const CURVES: Record<string, { name: string; bits: number }> = {
  '1.2.840.10045.3.1.7': { name: 'P-256', bits: 256 },
  '1.3.132.0.34': { name: 'P-384', bits: 384 },
  '1.3.132.0.35': { name: 'P-521', bits: 521 },
  '1.3.132.0.10': { name: 'secp256k1', bits: 256 }
};

const KEY_USAGES = [
  'digitalSignature',
  'nonRepudiation',
  'keyEncipherment',
  'dataEncipherment',
  'keyAgreement',
  'keyCertSign',
  'cRLSign',
  'encipherOnly',
  'decipherOnly'
];
const EXTENDED_USAGES: Record<string, string> = {
  '1.3.6.1.5.5.7.3.1': 'serverAuth',
  '1.3.6.1.5.5.7.3.2': 'clientAuth',
  '1.3.6.1.5.5.7.3.3': 'codeSigning',
  '1.3.6.1.5.5.7.3.4': 'emailProtection',
  '1.3.6.1.5.5.7.3.8': 'timeStamping',
  '1.3.6.1.5.5.7.3.9': 'OCSPSigning'
};

export interface AltName {
  type: 'DNS' | 'IP' | 'email' | 'URI' | 'other';
  value: string;
}

export interface Certificate {
  /** 1, 2 or 3 */
  version: number;
  /** Hex, upper case */
  serial: string;
  subject: NamePart[];
  issuer: NamePart[];
  /** Subject and issuer are the same: it vouches for itself */
  selfSigned: boolean;
  /** Milliseconds since 1970 */
  notBefore: number;
  notAfter: number;
  signature: { name: string; family: KeyFamily; weak: boolean };
  publicKey: { name: string; family: KeyFamily; /** Key size in bits, when it can be told */ bits: number | null; curve: string | null };
  altNames: AltName[];
  /** null when the certificate does not say */
  isCA: boolean | null;
  pathLength: number | null;
  keyUsage: string[];
  extendedKeyUsage: string[];
  /** The certificate as it was, for fingerprints */
  der: Uint8Array;
}

function ip(bytes: Uint8Array): string {
  if (bytes.length === 4) return bytes.join('.');
  const groups = [...Array(bytes.length / 2).keys()].map((i) => ((bytes[i * 2] << 8) | bytes[i * 2 + 1]).toString(16));
  return groups.join(':');
}

function publicKey(info: Element): Certificate['publicKey'] {
  const [algorithm, key] = expect(info, 16).children;
  const [id, parameters] = expect(algorithm, 16).children;
  const algorithmId = oid(id);
  const known = ALGORITHMS[algorithmId] ?? { name: algorithmId, family: 'unknown' as const };
  let bits: number | null = null;
  let curve: string | null = null;
  if (known.family === 'rsa') {
    // the key is itself DER, after one byte that counts the unused bits: SEQUENCE { modulus, exponent }
    const modulus = expect(readElement(expect(key, 3).bytes.subarray(1), 0).element, 16).children[0];
    const n = expect(modulus, 2).bytes;
    const start = n.findIndex((byte) => byte !== 0);
    bits = start === -1 ? 0 : (n.length - start - 1) * 8 + (32 - Math.clz32(n[start]));
  } else if (known.family === 'ecdsa' && isUniversal(parameters, 6)) {
    const found = CURVES[oid(parameters)];
    curve = found?.name ?? oid(parameters);
    bits = found?.bits ?? null;
  } else if (known.name === 'Ed25519') bits = 256;
  else if (known.name === 'Ed448') bits = 456;
  return { ...known, bits, curve };
}

function parseDer(der: Uint8Array): Certificate {
  const { element: certificate, end } = readElement(der, 0);
  if (end !== der.length) throw new DerError('trailing');
  const [tbs, signatureAlgorithm] = expect(certificate, 16).children;
  const fields = [...expect(tbs, 16).children];
  // the version is optional: without it, it is 1
  const version = context(fields[0], 0) ? expect(fields.shift()!.children[0], 2).bytes[0] + 1 : 1;
  const [serial, , issuer, validity, subject, keyInfo, ...rest] = fields;
  const [notBefore, notAfter] = expect(validity, 16).children;
  const signatureId = oid(expect(signatureAlgorithm, 16).children[0]);
  const signature = ALGORITHMS[signatureId] ?? { name: signatureId, family: 'unknown' as const };
  const subjectName = name(subject);
  const issuerName = name(issuer);

  const out: Certificate = {
    version,
    serial: hex(expect(serial, 2).bytes).replace(/^(00)+(?=.)/, ''),
    subject: subjectName,
    issuer: issuerName,
    selfSigned: hex(subject.raw) === hex(issuer.raw),
    notBefore: time(notBefore),
    notAfter: time(notAfter),
    signature: { ...signature, weak: WEAK.has(signatureId) },
    publicKey: publicKey(keyInfo),
    altNames: [],
    isCA: null,
    pathLength: null,
    keyUsage: [],
    extendedKeyUsage: [],
    der
  };

  // extensions are in [3]: SEQUENCE of { id, critical?, value as an OCTET STRING that holds DER again }
  const extensions = rest.find((e) => context(e, 3))?.children[0];
  for (const extension of extensions ? expect(extensions, 16).children : []) {
    const parts = expect(extension, 16).children;
    const id = oid(parts[0]);
    const value = readElement(expect(parts.at(-1), 4).bytes, 0).element;
    if (id === '2.5.29.17') {
      out.altNames = expect(value, 16).children.map((n): AltName => {
        if (n.tag === 2) return { type: 'DNS', value: text(n) };
        if (n.tag === 7) return { type: 'IP', value: ip(n.bytes) };
        if (n.tag === 1) return { type: 'email', value: text(n) };
        if (n.tag === 6) return { type: 'URI', value: text(n) };
        return { type: 'other', value: hex(n.bytes) };
      });
    } else if (id === '2.5.29.19') {
      const [ca, pathLength] = expect(value, 16).children;
      out.isCA = isUniversal(ca, 1) ? ca.bytes[0] !== 0 : false;
      const length = isUniversal(ca, 2) ? ca : pathLength;
      out.pathLength = isUniversal(length, 2) ? length.bytes.reduce((sum, byte) => sum * 256 + byte, 0) : null;
    } else if (id === '2.5.29.15') {
      // a BIT STRING: one byte that counts the unused bits, then the bits, the first one in the highest place
      const bits = expect(value, 3).bytes.subarray(1);
      out.keyUsage = KEY_USAGES.filter((_, i) => ((bits[i >> 3] ?? 0) & (0x80 >> (i & 7))) !== 0);
    } else if (id === '2.5.29.37') {
      out.extendedKeyUsage = expect(value, 16).children.map((usage) => EXTENDED_USAGES[oid(usage)] ?? oid(usage));
    }
  }
  return out;
}

export type ErrorKind =
  /** nothing that looks like a certificate */
  | 'none'
  /** a private key was pasted: that should not happen */
  | 'privateKey'
  /** a PEM block of another kind: a request, a public key, … */
  | 'otherBlock'
  | 'base64'
  /** the bytes are not a certificate */
  | 'structure';

export type Parsed = { ok: true; certificate: Certificate } | { ok: false; error: ErrorKind; label?: string };

/**
 * Reads every certificate in a text: PEM blocks (one, or a chain), or the Base64 of one certificate without the
 * BEGIN and END lines. A block that is not a certificate gets an error of its own.
 */
export function parse(input: string): Parsed[] {
  const blocks = [...input.matchAll(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g)];
  if (!input.trim()) return [];
  const read = (base64: string): Parsed => {
    const decoded = decodeBase64(base64);
    if (!decoded.ok) return { ok: false, error: 'base64' };
    try {
      return { ok: true, certificate: parseDer(decoded.bytes) };
    } catch {
      return { ok: false, error: 'structure' };
    }
  };
  if (!blocks.length) return [/^[A-Za-z0-9+/=\s]+$/.test(input) && input.trim().length > 100 ? read(input) : { ok: false, error: 'none' }];
  return blocks.map(([, label, body]) => {
    if (label.includes('PRIVATE KEY')) return { ok: false, error: 'privateKey', label };
    if (label !== 'CERTIFICATE' && label !== 'TRUSTED CERTIFICATE' && label !== 'X509 CERTIFICATE') return { ok: false, error: 'otherBlock', label };
    return read(body);
  });
}

/** A name on one line, the way OpenSSL prints it: C=NL, O=Example, CN=example.test. */
export const formatName = (parts: readonly NamePart[]) => parts.map((p) => `${p.type}=${p.value}`).join(', ');

export type Validity = { state: 'valid' | 'expired' | 'notYet'; /** Whole days until it expires, since it expired, or until it starts */ days: number };

export function validity(certificate: Pick<Certificate, 'notBefore' | 'notAfter'>, now: number): Validity {
  const days = (ms: number) => Math.floor(ms / 86_400_000);
  if (now < certificate.notBefore) return { state: 'notYet', days: days(certificate.notBefore - now) };
  if (now > certificate.notAfter) return { state: 'expired', days: days(now - certificate.notAfter) };
  return { state: 'valid', days: days(certificate.notAfter - now) };
}

/** "2026-10-02 21:02:00 UTC": always UTC, so it reads the same everywhere. */
export const utc = (ms: number) => `${new Date(ms).toISOString().slice(0, 19).replace('T', ' ')} UTC`;

/** Bytes as hex with colons, the way fingerprints are written: B9:A3:B4:… */
export const fingerprint = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
