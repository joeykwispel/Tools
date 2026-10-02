import { describe, expect, it } from 'vitest';
import { decode, encode } from './logic';

describe('encode', () => {
  it('escapes everything that is not safe in a value', () => {
    expect(encode('a b&c=d/e?f#g')).toBe('a%20b%26c%3Dd%2Fe%3Ff%23g');
    expect(encode("AZaz09-_.!~*'()")).toBe("AZaz09-_.!~*'()");
  });

  it('encodes characters outside ASCII as UTF-8', () => {
    expect(encode('zoë')).toBe('zo%C3%AB');
    expect(encode('€')).toBe('%E2%82%AC');
    expect(encode('😀')).toBe('%F0%9F%98%80');
  });

  it('keeps the structure of a whole URL', () => {
    expect(encode('https://example.com/a b/?q=zoë&x=1#top', 'url')).toBe('https://example.com/a%20b/?q=zo%C3%AB&x=1#top');
  });

  it('can write a space as +, and then escapes a real +', () => {
    expect(encode('a b+c', 'component', true)).toBe('a+b%2Bc');
    expect(encode('q=a b+c', 'url', true)).toBe('q=a+b%2Bc');
  });

  it('does not throw on half an emoji', () => {
    expect(encode('a\ud83d')).toBe('a%EF%BF%BD');
  });
});

describe('decode', () => {
  it('reverses encode', () => {
    for (const text of ['a b&c=d/e?f#g', 'zoë € 😀', 'https://example.com/a b/?q=1', '100% sure', 'a+b'])
      expect(decode(encode(text)), text).toEqual({ text, invalid: 0 });
  });

  it('reads + as a space only when asked', () => {
    expect(decode('a+b%2Bc').text).toBe('a+b+c');
    expect(decode('a+b%2Bc', true).text).toBe('a b+c');
  });

  it('accepts lower-case hex', () => {
    expect(decode('zo%c3%ab').text).toBe('zoë');
  });

  it('leaves a % that is not an escape, and counts it', () => {
    expect(decode('100% sure')).toEqual({ text: '100% sure', invalid: 1 });
    expect(decode('%zz and %4')).toEqual({ text: '%zz and %4', invalid: 2 });
  });

  it('decodes what it can around bytes that are not UTF-8', () => {
    // %FF is never valid UTF-8; %C3 alone is half a character
    expect(decode('a%20b%FFc%C3%AB')).toEqual({ text: 'a b%FFcë', invalid: 1 });
    expect(decode('%C3')).toEqual({ text: '%C3', invalid: 1 });
    expect(decode('%E2%82%AC%FF%20')).toEqual({ text: '€%FF ', invalid: 1 });
  });
});
