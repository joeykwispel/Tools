import { describe, expect, it } from 'vitest';
import { MAX_MATCHES, evaluate, groupNames, replace, run, segments } from './logic';

const matches = (pattern: string, flags: string, text: string) => {
  const r = run(pattern, flags, text);
  if (!r.ok) throw new Error(r.error);
  return r.matches;
};

describe('run', () => {
  it('finds every match with the g flag, and only the first without it', () => {
    expect(matches('\\d+', 'g', 'a1 b22 c333').map((m) => [m.text, m.index, m.end])).toEqual([
      ['1', 1, 2],
      ['22', 4, 6],
      ['333', 8, 11]
    ]);
    expect(matches('\\d+', '', 'a1 b22 c333').map((m) => m.text)).toEqual(['1']);
  });

  it('follows the i, m and s flags', () => {
    expect(matches('hello', 'g', 'Hello hello')).toHaveLength(1);
    expect(matches('hello', 'gi', 'Hello hello')).toHaveLength(2);
    expect(matches('^b', 'g', 'a\nb')).toHaveLength(0);
    expect(matches('^b', 'gm', 'a\nb')).toHaveLength(1);
    expect(matches('a.b', 'g', 'a\nb')).toHaveLength(0);
    expect(matches('a.b', 'gs', 'a\nb')).toHaveLength(1);
  });

  it('gives numbered and named groups, and undefined for a group that took no part', () => {
    const [m] = matches('(?<year>\\d{4})-(\\d{2})(-(?<day>\\d{2}))?', '', 'on 2026-10');
    expect(m.text).toBe('2026-10');
    expect(m.groups).toEqual([
      { name: 'year', value: '2026' },
      { name: '2', value: '10' },
      { name: '3', value: undefined },
      { name: 'day', value: undefined }
    ]);
  });

  it('does not loop forever on a pattern that matches nothing at all', () => {
    expect(matches('', 'g', 'abc')).toEqual([]);
    expect(matches('x*', 'g', 'ab').map((m) => m.index)).toEqual([0, 1, 2]);
    expect(matches('\\b', 'g', 'ab cd').map((m) => m.index)).toEqual([0, 2, 3, 5]);
  });

  it('steps over a whole emoji with the u flag', () => {
    expect(matches('x*', 'gu', '😀a').map((m) => m.index)).toEqual([0, 2, 3]);
    expect(matches('.', 'gu', '😀a').map((m) => m.text)).toEqual(['😀', 'a']);
  });

  it('reports an invalid pattern instead of throwing', () => {
    const r = run('(', 'g', 'abc');
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.error).toMatch(/Unterminated group|Invalid regular expression/);
  });

  it('ignores flags it does not offer', () => {
    expect(matches('a', 'gyzd', 'ba ba')).toHaveLength(2);
  });

  it('stops at the limit and says so', () => {
    const r = run('a', 'g', 'a'.repeat(MAX_MATCHES + 5));
    expect(r.ok && r.matches.length).toBe(MAX_MATCHES);
    expect(r.ok && r.truncated).toBe(true);
    const exact = run('a', 'g', 'a'.repeat(MAX_MATCHES));
    expect(exact.ok && exact.truncated).toBe(false);
  });
});

describe('groupNames', () => {
  it('names the capturing groups in order and skips the ones that do not capture', () => {
    expect(groupNames('(a)(?:b)(?<c>c)(?=d)(?!e)(?<=f)(?<!g)(h)')).toEqual([null, 'c', null]);
  });

  it('is not fooled by escaped parentheses or ones inside a character class', () => {
    expect(groupNames('\\((a)[()\\]](?<b>b)\\\\(c)')).toEqual([null, 'b', null]);
  });
});

describe('replace', () => {
  it('replaces the first match, or every match with the g flag', () => {
    expect(replace('a', '', 'banana', 'o')).toBe('bonana');
    expect(replace('a', 'g', 'banana', 'o')).toBe('bonono');
  });

  it('understands $1, $<name> and $&', () => {
    expect(replace('(\\d+)-(?<m>\\d+)', 'g', '2026-10', '$<m>/$1 [$&]')).toBe('10/2026 [2026-10]');
  });

  it('gives null for an empty or invalid pattern', () => {
    expect(replace('', 'g', 'abc', 'x')).toBeNull();
    expect(replace('(', 'g', 'abc', 'x')).toBeNull();
  });
});

describe('evaluate', () => {
  it('gives the matches and the replaced text together', () => {
    const out = evaluate({ pattern: 'o', flags: 'g', text: 'foo', replacement: '0' });
    expect(out.result.ok && out.result.matches.length).toBe(2);
    expect(out.replaced).toBe('f00');
  });
});

describe('segments', () => {
  it('cuts the text into matched and unmatched pieces that add up to the text', () => {
    const text = 'a1 b22 c';
    const pieces = segments(text, matches('\\d+', 'g', text));
    expect(pieces).toEqual([
      { text: 'a', match: null },
      { text: '1', match: 0 },
      { text: ' b', match: null },
      { text: '22', match: 1 },
      { text: ' c', match: null }
    ]);
    expect(pieces.map((p) => p.text).join('')).toBe(text);
  });

  it('leaves out empty matches and handles a match at either end', () => {
    expect(segments('ab', matches('x*', 'g', 'ab'))).toEqual([{ text: 'ab', match: null }]);
    expect(segments('aXa', matches('a', 'g', 'aXa'))).toEqual([
      { text: 'a', match: 0 },
      { text: 'X', match: null },
      { text: 'a', match: 1 }
    ]);
    expect(segments('', [])).toEqual([]);
  });
});
