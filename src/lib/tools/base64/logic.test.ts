import { describe, expect, it } from 'vitest';
import { decode, encodeBytes, encodeText, size } from './logic';

/** The test vectors of RFC 4648, section 10. */
const RFC: [string, string][] = [
  ['', ''],
  ['f', 'Zg=='],
  ['fo', 'Zm8='],
  ['foo', 'Zm9v'],
  ['foob', 'Zm9vYg=='],
  ['fooba', 'Zm9vYmE='],
  ['foobar', 'Zm9vYmFy']
];

const text = (input: string) => {
  const d = decode(input);
  return d.ok ? d.text : `error: ${d.error}`;
};

describe('encode', () => {
  it('matches the RFC 4648 test vectors', () => {
    for (const [plain, encoded] of RFC) expect(encodeText(plain), plain).toBe(encoded);
  });

  it('encodes text as UTF-8, so characters outside Latin-1 work', () => {
    expect(encodeText('Zoë ✓ 😀')).toBe('Wm/DqyDinJMg8J+YgA==');
  });

  it('has a URL-safe form without + / and padding', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    expect(encodeBytes(bytes)).toBe('+//+');
    expect(encodeBytes(bytes, true)).toBe('-__-');
    expect(encodeText('f', true)).toBe('Zg');
  });

  it('handles more bytes than fit in one call to String.fromCharCode', () => {
    const big = new Uint8Array(200_000).map((_, i) => i % 256);
    const round = decode(encodeBytes(big));
    expect(round.ok && round.bytes.length).toBe(200_000);
    expect(round.ok && round.bytes[199_999]).toBe(199_999 % 256);
  });
});

describe('decode', () => {
  it('matches the RFC 4648 test vectors', () => {
    for (const [plain, encoded] of RFC) expect(text(encoded), encoded).toBe(plain);
  });

  it('reads UTF-8 back', () => {
    expect(text('Wm/DqyDinJMg8J+YgA==')).toBe('Zoë ✓ 😀');
  });

  it('accepts the URL-safe alphabet and missing padding', () => {
    expect(text('Zg')).toBe('f');
    expect(text('Zm8')).toBe('fo');
    const d = decode('-__-');
    expect(d.ok && [...d.bytes]).toEqual([0xfb, 0xff, 0xfe]);
  });

  it('ignores whitespace and line breaks', () => {
    expect(text(' Zm9v\r\nYmFy \n')).toBe('foobar');
  });

  it('gives the bytes but no text when they are not UTF-8', () => {
    const d = decode('/w==');
    expect(d.ok && d.text).toBeNull();
    expect(d.ok && [...d.bytes]).toEqual([0xff]);
  });

  it('reports characters that are not Base64, and a length that can not be right', () => {
    expect(decode('Zm9v!')).toEqual({ ok: false, error: 'characters' });
    expect(decode('héllo')).toEqual({ ok: false, error: 'characters' });
    expect(decode('Zm9vY')).toEqual({ ok: false, error: 'length' });
  });
});

describe('size', () => {
  it('writes a number of bytes the short way', () => {
    expect(size(0)).toBe('0 B');
    expect(size(999)).toBe('999 B');
    expect(size(1500)).toBe('1.5 kB');
    expect(size(2_400_000)).toBe('2.4 MB');
  });
});
