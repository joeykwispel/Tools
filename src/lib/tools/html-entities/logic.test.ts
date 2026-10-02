import { describe, expect, it } from 'vitest';
import { ENTITIES, decode, encode } from './logic';

describe('the entity table', () => {
  it('has the names at the right code points', () => {
    const at = (name: string) => String.fromCodePoint(ENTITIES.get(name)!);
    expect(at('nbsp')).toBe(' ');
    expect(at('copy')).toBe('©');
    expect(at('eacute')).toBe('é');
    expect(at('Uuml')).toBe('Ü');
    expect(at('yuml')).toBe('ÿ');
    expect(at('euro')).toBe('€');
    expect(at('hellip')).toBe('…');
    expect(at('rarr')).toBe('→');
    expect(at('Alpha')).toBe('Α');
    expect(at('Rho')).toBe('Ρ');
    expect(at('Sigma')).toBe('Σ');
    expect(at('Omega')).toBe('Ω');
    expect(at('alpha')).toBe('α');
    expect(at('sigmaf')).toBe('ς');
    expect(at('omega')).toBe('ω');
  });

  it('has no two names for one character', () => {
    const codes = [...ENTITIES.values()];
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('encode', () => {
  it('escapes the five special characters and nothing else by default', () => {
    expect(encode(`<a href="x?a=1&b=2">it's é</a>`)).toBe('&lt;a href=&quot;x?a=1&amp;b=2&quot;&gt;it&#39;s é&lt;/a&gt;');
  });

  it('can write everything outside ASCII by name, falling back to a number', () => {
    expect(encode('café €5 → ✓ 😀 ż', 'named')).toBe('caf&eacute; &euro;5 &rarr; &check; &#128512; &#380;');
  });

  it('can write everything outside ASCII by number', () => {
    expect(encode('café €5 😀', 'numeric')).toBe('caf&#233; &#8364;5 &#128512;');
  });

  it('does not escape twice what looks like a reference: that is up to the reader', () => {
    expect(encode('&amp;')).toBe('&amp;amp;');
  });
});

describe('decode', () => {
  it('reads names, decimal and hexadecimal references', () => {
    expect(decode('caf&eacute; &#8364;5 &#x1F600; &lt;b&gt; &amp;amp;')).toEqual({ text: 'café €5 😀 <b> &amp;', unknown: 0 });
    expect(decode('&#X41;&#x61;').text).toBe('Aa');
  });

  it('reverses encode at every level', () => {
    const text = `<p class="x">it's café €5 → 😀 & more</p>`;
    for (const level of ['special', 'named', 'numeric'] as const) expect(decode(encode(text, level)), level).toEqual({ text, unknown: 0 });
  });

  it('leaves what it does not know, and counts it', () => {
    expect(decode('&nope; &#0; &#xD800; &#99999999; &amp')).toEqual({ text: '&nope; &#0; &#xD800; &#99999999; &amp', unknown: 4 });
  });

  it('is case-sensitive, as HTML is', () => {
    expect(decode('&Eacute;&eacute;&EACUTE;')).toEqual({ text: 'Éé&EACUTE;', unknown: 1 });
  });
});
