import { describe, expect, it } from 'vitest';
import { clean, inspect, summarise } from './logic';

describe('inspect', () => {
  it('gives the code point and the UTF-8 bytes of each character', () => {
    expect(inspect('Aé€😀').map((c) => [c.char, c.label, c.utf8])).toEqual([
      ['A', 'U+0041', '41'],
      ['é', 'U+00E9', 'C3 A9'],
      ['€', 'U+20AC', 'E2 82 AC'],
      ['😀', 'U+1F600', 'F0 9F 98 80']
    ]);
  });

  it('names the characters you can not see', () => {
    const found = inspect('a\u200Bb\u00A0c\uFEFFd\u00ADe\u200D');
    expect(found.filter((c) => c.kind !== 'visible').map((c) => [c.label, c.kind, c.name])).toEqual([
      ['U+200B', 'invisible', 'ZERO WIDTH SPACE'],
      ['U+00A0', 'space', 'NO-BREAK SPACE'],
      ['U+FEFF', 'invisible', 'ZERO WIDTH NO-BREAK SPACE (BYTE ORDER MARK)'],
      ['U+00AD', 'invisible', 'SOFT HYPHEN'],
      ['U+200D', 'invisible', 'ZERO WIDTH JOINER']
    ]);
  });

  it('tells ordinary whitespace from the unusual kind', () => {
    expect(inspect(' \t\n\r').map((c) => c.kind)).toEqual(['whitespace', 'whitespace', 'whitespace', 'whitespace']);
    expect(inspect('\u2009\u3000\u202F').map((c) => c.kind)).toEqual(['space', 'space', 'space']);
  });

  it('flags characters that change the direction of text, and control characters', () => {
    expect(inspect('\u202E\u2066\u200F').map((c) => c.kind)).toEqual(['bidi', 'bidi', 'bidi']);
    expect(inspect('\u0000\u001B\u007F').map((c) => c.kind)).toEqual(['control', 'control', 'control']);
  });

  it('recognises combining marks, variation selectors and half a surrogate pair', () => {
    expect(inspect('e\u0301').map((c) => c.kind)).toEqual(['visible', 'combining']);
    expect(inspect('\uFE0F')[0]).toMatchObject({ kind: 'invisible', name: 'VARIATION SELECTOR-16' });
    expect(inspect('a\uD83D')[1]).toMatchObject({ kind: 'invalid', label: 'U+D83D', utf8: 'EF BF BD' });
  });
});

describe('summarise', () => {
  it('counts what a reader sees, and what is stored', () => {
    // a family: four people joined by three zero-width joiners
    expect(summarise('👨‍👩‍👧‍👦')).toEqual({ graphemes: 1, codePoints: 7, utf16: 11, utf8: 25, hidden: 3 });
    expect(summarise('e\u0301')).toEqual({ graphemes: 1, codePoints: 2, utf16: 2, utf8: 3, hidden: 0 });
    expect(summarise('')).toEqual({ graphemes: 0, codePoints: 0, utf16: 0, utf8: 0, hidden: 0 });
  });

  it('counts the hidden characters', () => {
    expect(summarise('a\u200Bb\u00A0c').hidden).toBe(2);
    expect(summarise('plain text\n').hidden).toBe(0);
  });
});

describe('clean', () => {
  it('removes invisible characters and makes unusual spaces ordinary', () => {
    expect(clean('pass\u200Bword\u00A0here\uFEFF')).toBe('password here');
    expect(clean('soft\u00ADhyphen')).toBe('softhyphen');
    expect(clean('thin\u2009space')).toBe('thin space');
  });

  it('removes characters that change the direction of the text, and control characters', () => {
    expect(clean('if (admin\u202E) {')).toBe('if (admin) {');
    expect(clean('a\u0000b\u001Bc')).toBe('abc');
  });

  it('keeps tabs, line breaks, accents and whole emoji', () => {
    expect(clean('a\tb\r\nc')).toBe('a\tb\r\nc');
    expect(clean('e\u0301')).toBe('e\u0301');
    expect(clean('👨‍👩‍👧‍👦 ❤️')).toBe('👨‍👩‍👧‍👦 ❤️');
  });

  it('turns the line and paragraph separators into line breaks', () => {
    expect(clean('a\u2028b\u2029c')).toBe('a\nb\nc');
  });
});
