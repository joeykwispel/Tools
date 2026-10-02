import { describe, expect, it } from 'vitest';
import { escape, unescape } from './logic';

/** The start of a unicode escape, put together here so the test file never holds one that is not meant as one. */
const U = '\\' + 'u';
const text = (r: ReturnType<typeof unescape>) => (r.ok ? r.text : `error: ${r.error} at ${r.at}`);

describe('escape for JSON', () => {
  it('gives the contents of a JSON string', () => {
    const raw = 'She said "hi"\n\tC:\\temp';
    expect(escape(raw, 'json')).toBe('She said \\"hi\\"\\n\\tC:\\\\temp');
    expect(JSON.parse(escape(raw, 'json', { quotes: true }))).toBe(raw);
  });

  it('escapes control characters, and everything outside ASCII when asked', () => {
    expect(escape(String.fromCharCode(1), 'json')).toBe(`${U}0001`);
    expect(escape('é', 'json')).toBe('é');
    expect(escape('é€', 'json', { ascii: true })).toBe(`${U}00e9${U}20ac`);
    // an emoji is two UTF-16 units, so two escapes
    expect(escape('😀', 'json', { ascii: true })).toBe(`${U}d83d${U}de00`);
    expect(JSON.parse(escape('zoë 😀', 'json', { ascii: true, quotes: true }))).toBe('zoë 😀');
  });
});

describe('escape for JavaScript', () => {
  it('gives a single-quoted string literal', () => {
    const raw = `it's a "test"\nC:\\temp`;
    const literal = escape(raw, 'js', { quotes: true });
    expect(literal).toBe(`'it\\'s a "test"\\nC:\\\\temp'`);
    expect(new Function(`return ${literal}`)()).toBe(raw);
  });

  it('escapes control characters and the line separators', () => {
    const raw = `a${String.fromCharCode(0)}b${String.fromCharCode(0x2028)}c${String.fromCharCode(11)}`;
    const literal = escape(raw, 'js', { quotes: true });
    expect(literal).toBe(`'a${U}0000b${U}2028c\\v'`);
    expect(new Function(`return ${literal}`)()).toBe(raw);
  });
});

describe('escape for a regular expression', () => {
  it('makes a pattern that matches the text and nothing else', () => {
    const raw = 'a.b*c? (1+1) [x-y] {2} ^$ | / \\';
    const pattern = new RegExp(`^${escape(raw, 'regex')}$`);
    expect(pattern.test(raw)).toBe(true);
    expect(pattern.test('aXb*c? (1+1) [x-y] {2} ^$ | / \\')).toBe(false);
    expect(escape('price: $5.00', 'regex')).toBe('price: \\$5\\.00');
  });
});

describe('escape for a shell', () => {
  it('wraps the text in single quotes, stepping outside them for a single quote', () => {
    expect(escape('hello world', 'shell')).toBe("'hello world'");
    expect(escape("it's $HOME; rm -rf *", 'shell')).toBe("'it'\\''s $HOME; rm -rf *'");
    expect(escape('', 'shell')).toBe("''");
  });
});

describe('unescape', () => {
  it('reverses escape for every target', () => {
    const samples = ['plain', `it's a "test"`, 'tab\there\nnew line', 'C:\\temp\\file.txt', 'zoë €5 😀', 'a.b*c (x) [y] {z} $ ^ | / -', "'; DROP TABLE x; --"];
    for (const target of ['json', 'js', 'regex', 'shell'] as const)
      for (const raw of samples) {
        expect(text(unescape(escape(raw, target), target)), `${target}: ${raw}`).toBe(raw);
        expect(text(unescape(escape(raw, target, { quotes: true, ascii: true }), target)), `${target} quoted: ${raw}`).toBe(raw);
      }
  });

  it('reads every kind of escape in a JavaScript string', () => {
    expect(text(unescape(`a\\x41${U}00e9${U}{1F600}\\0\\q\\/`, 'js'))).toBe(`aAé😀${String.fromCharCode(0)}q/`);
    expect(text(unescape('"double" and `backtick`', 'js'))).toBe('"double" and `backtick`');
    expect(text(unescape('`quoted`', 'js'))).toBe('quoted');
    expect(text(unescape('one \\\ntwo', 'js'))).toBe('one two');
  });

  it('says where an escape is broken', () => {
    expect(unescape('abc\\', 'json')).toEqual({ ok: false, error: 'escape', at: 3 });
    expect(unescape(`ab${U}12`, 'json')).toEqual({ ok: false, error: 'escape', at: 2 });
    expect(unescape('"ab\\xZZ"', 'js')).toEqual({ ok: false, error: 'escape', at: 3 });
    expect(unescape(`${U}{110000}`, 'js')).toEqual({ ok: false, error: 'escape', at: 0 });
  });

  it('only undoes escaped symbols in a regular expression', () => {
    expect(text(unescape('\\$5\\.00 \\d+ \\n', 'regex'))).toBe('$5.00 \\d+ \\n');
  });

  it('reads the ways a shell word can be quoted', () => {
    expect(text(unescape(`plain\\ word 'single $x' "double \\"q\\" \\$y \\n"`, 'shell'))).toBe('plain word single $x double "q" $y \\n');
    expect(unescape("it's open", 'shell')).toEqual({ ok: false, error: 'quote', at: 2 });
    expect(unescape('"open', 'shell')).toEqual({ ok: false, error: 'quote', at: 0 });
    expect(unescape('end\\', 'shell')).toEqual({ ok: false, error: 'escape', at: 3 });
  });
});
