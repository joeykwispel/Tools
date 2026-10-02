import { describe, expect, it } from 'vitest';
import { fromBase32, fromHex, toBase32, toHex, toText } from './logic';

const utf8 = (s: string) => new TextEncoder().encode(s);
const text = (r: ReturnType<typeof fromHex>) => (r.ok ? toText(r.bytes) : `error: ${r.error}`);

/** The Base32 test vectors of RFC 4648, section 10. */
const RFC: [string, string][] = [
  ['', ''],
  ['f', 'MY======'],
  ['fo', 'MZXQ===='],
  ['foo', 'MZXW6==='],
  ['foob', 'MZXW6YQ='],
  ['fooba', 'MZXW6YTB'],
  ['foobar', 'MZXW6YTBOI======']
];

describe('hex', () => {
  it('writes bytes as two digits each, with a separator and in upper case if asked', () => {
    expect(toHex(utf8('Hi!'))).toBe('486921');
    expect(toHex(utf8('Hi!'), ' ')).toBe('48 69 21');
    expect(toHex(new Uint8Array([0, 10, 255]), ':', true)).toBe('00:0A:FF');
    expect(toHex(utf8('é'))).toBe('c3a9');
    expect(toHex(new Uint8Array())).toBe('');
  });

  it('reads hex the way it is found', () => {
    for (const input of ['486921', '48 69 21', '48:69:21', '48-69-21', '0x48, 0x69, 0x21', '\\x48\\x69\\x21', '48\n69\n21', '48 69 21 '.toLowerCase()])
      expect(text(fromHex(input)), input).toBe('Hi!');
    expect(text(fromHex('C3A9'))).toBe('é');
    expect(text(fromHex(''))).toBe('');
  });

  it('reports characters that are not hex, and half a byte', () => {
    expect(fromHex('48 6g')).toEqual({ ok: false, error: 'characters' });
    expect(fromHex('486')).toEqual({ ok: false, error: 'length' });
  });

  it('goes round for every byte value', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const round = fromHex(toHex(all, ':', true));
    expect(round.ok && [...round.bytes]).toEqual([...all]);
  });
});

describe('Base32', () => {
  it('matches the RFC 4648 test vectors, both ways', () => {
    for (const [plain, encoded] of RFC) {
      expect(toBase32(utf8(plain)), plain).toBe(encoded);
      expect(text(fromBase32(encoded)), encoded).toBe(plain);
    }
  });

  it('can leave the padding off, and reads it back without', () => {
    expect(toBase32(utf8('f'), false)).toBe('MY');
    expect(text(fromBase32('MZXW6YTBOI'))).toBe('foobar');
  });

  it('ignores case, spaces and dashes', () => {
    expect(text(fromBase32('mzxw 6ytb-oi'))).toBe('foobar');
  });

  it('reports characters outside the alphabet, and lengths that can not be right', () => {
    expect(fromBase32('MZXW1')).toEqual({ ok: false, error: 'characters' });
    expect(fromBase32('M0XW')).toEqual({ ok: false, error: 'characters' });
    expect(fromBase32('M')).toEqual({ ok: false, error: 'length' });
    expect(fromBase32('MZX')).toEqual({ ok: false, error: 'length' });
  });

  it('goes round for every byte value', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const round = fromBase32(toBase32(all));
    expect(round.ok && [...round.bytes]).toEqual([...all]);
  });
});

describe('toText', () => {
  it('gives null for bytes that are not UTF-8', () => {
    expect(toText(new Uint8Array([0xff, 0xfe]))).toBeNull();
    expect(toText(utf8('zoë'))).toBe('zoë');
  });
});
