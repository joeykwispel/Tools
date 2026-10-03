import { describe, expect, it } from 'vitest';
import { escape, fromPunycode, parse, readParams, toJson, withParams } from './logic';

const FULL = 'https://user:s%40cret@shop.example.com:8443/products/caf%C3%A9%20table?colour=dark+oak&size=120&size=140&flag#reviews';

const read = (text: string) => {
  const parsed = parse(text);
  if (!parsed.ok) throw new Error(`not read: ${text}`);
  return parsed;
};

describe('parse', () => {
  it('takes an address apart', () => {
    const { parts, segments, params, assumed, relative } = read(FULL);
    expect(parts).toEqual({
      href: FULL,
      scheme: 'https',
      username: 'user',
      password: 's@cret',
      host: 'shop.example.com',
      hostUnicode: 'shop.example.com',
      port: '8443',
      defaultPort: 443,
      path: '/products/caf%C3%A9%20table',
      query: 'colour=dark+oak&size=120&size=140&flag',
      fragment: 'reviews',
      origin: 'https://shop.example.com:8443'
    });
    expect(segments).toEqual(['products', 'café table']);
    expect(params.map(({ key, value }) => [key, value])).toEqual([
      ['colour', 'dark oak'],
      ['size', '120'],
      ['size', '140'],
      ['flag', '']
    ]);
    expect([assumed, relative]).toEqual([false, false]);
  });

  it('reads an address without a scheme as https', () => {
    expect(read('example.com/a?b=1')).toMatchObject({
      assumed: true,
      parts: { scheme: 'https', host: 'example.com', path: '/a', href: 'https://example.com/a?b=1' }
    });
    expect(read('localhost:3000/api')).toMatchObject({ assumed: true, parts: { host: 'localhost', port: '3000', path: '/api' } });
    expect(read('//cdn.example.com/x.js')).toMatchObject({ assumed: true, parts: { host: 'cdn.example.com', path: '/x.js' } });
    expect(read('  https://example.com  ')).toMatchObject({ assumed: false, parts: { host: 'example.com' } });
  });

  it('reads a place on a site without its host', () => {
    const { parts, relative, segments, params } = read('/search/all?q=tea%20pot#top');
    expect(relative).toBe(true);
    expect(parts).toMatchObject({
      href: '/search/all?q=tea%20pot#top',
      scheme: '',
      host: '',
      origin: '',
      path: '/search/all',
      query: 'q=tea%20pot',
      fragment: 'top'
    });
    expect(segments).toEqual(['search', 'all']);
    expect(params[0]).toMatchObject({ key: 'q', value: 'tea pot' });
    expect(read('?a=1')).toMatchObject({ relative: true, parts: { path: '/', query: 'a=1' } });
  });

  it('knows the port that is used when none is written', () => {
    expect(read('http://example.com').parts).toMatchObject({ port: '', defaultPort: 80 });
    expect(read('https://example.com:443/').parts).toMatchObject({ port: '', defaultPort: 443 });
    expect(read('wss://example.com/socket').parts).toMatchObject({ defaultPort: 443 });
    expect(read('redis://cache:6379/0').parts).toMatchObject({ port: '6379', defaultPort: null });
  });

  it('shows an international host both ways', () => {
    expect(read('https://münchen.de/').parts).toMatchObject({ host: 'xn--mnchen-3ya.de', hostUnicode: 'münchen.de' });
    expect(read('https://xn--r8jz45g.jp').parts).toMatchObject({ hostUnicode: '例え.jp' });
    expect(read('https://xn--!!!.com').parts.hostUnicode).toBe('xn--!!!.com');
  });

  it('reads addresses that are not for the web', () => {
    expect(read('mailto:ada@example.com?subject=Hello%20there')).toMatchObject({
      assumed: false,
      parts: { scheme: 'mailto', host: '', path: 'ada@example.com', origin: '' },
      segments: [],
      params: [{ key: 'subject', value: 'Hello there' }]
    });
    expect(read('file:///C:/Users/ada/notes.txt')).toMatchObject({
      parts: { scheme: 'file', path: '/C:/Users/ada/notes.txt' },
      segments: ['C:', 'Users', 'ada', 'notes.txt']
    });
  });

  it('keeps the slash at the end out of the pieces of the path', () => {
    expect(read('https://example.com/a/b/').segments).toEqual(['a', 'b']);
    expect(read('https://example.com/').segments).toEqual([]);
    expect(read('https://example.com/a//b').segments).toEqual(['a', '', 'b']);
  });

  it('says when there is nothing, or nothing to read', () => {
    expect(parse('   ')).toEqual({ ok: false, error: 'empty' });
    expect(parse('https://')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('https://example.com:port/')).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('fromPunycode', () => {
  it('reads the xn-- form of a name', () => {
    expect(fromPunycode('mnchen-3ya')).toBe('münchen');
    expect(fromPunycode('bcher-kva')).toBe('bücher');
    expect(fromPunycode('r8jz45g')).toBe('例え');
    expect(fromPunycode('maana-pta')).toBe('mañana');
  });

  it('gives null for what is not Punycode', () => {
    expect(fromPunycode('!!!')).toBeNull();
    expect(fromPunycode('a-')).toBe('a');
    expect(fromPunycode('abc-9')).toBeNull();
  });
});

describe('readParams', () => {
  it('keeps what was written next to what it reads as', () => {
    expect(readParams('q=a%26b+c&empty=&flag&=x&&a=1=2')).toEqual([
      { key: 'q', value: 'a&b c', rawKey: 'q', rawValue: 'a%26b+c' },
      { key: 'empty', value: '', rawKey: 'empty', rawValue: '' },
      { key: 'flag', value: '', rawKey: 'flag', rawValue: null },
      { key: '', value: 'x', rawKey: '', rawValue: 'x' },
      { key: 'a', value: '1=2', rawKey: 'a', rawValue: '1=2' }
    ]);
    expect(readParams('')).toEqual([]);
    expect(readParams('bad=%zz')).toEqual([{ key: 'bad', value: '%zz', rawKey: 'bad', rawValue: '%zz' }]);
  });
});

describe('withParams', () => {
  it('rewrites the query and nothing else', () => {
    const params = read(FULL).params;
    expect(withParams(FULL, params)).toBe(FULL);
    expect(withParams(FULL, [...params.slice(0, 1), { rawKey: 'size', rawValue: escape('1 & 2') }])).toBe(
      'https://user:s%40cret@shop.example.com:8443/products/caf%C3%A9%20table?colour=dark+oak&size=1%20%26%202#reviews'
    );
    expect(withParams(FULL, [])).toBe('https://user:s%40cret@shop.example.com:8443/products/caf%C3%A9%20table#reviews');
  });

  it('adds a query to an address that has none', () => {
    expect(withParams('example.com/a', [{ rawKey: 'b', rawValue: '1' }])).toBe('example.com/a?b=1');
    expect(withParams('example.com/a#top?not=query', [{ rawKey: 'b', rawValue: null }])).toBe('example.com/a?b#top?not=query');
  });
});

describe('toJson', () => {
  it('makes a list of a name that is there more than once', () => {
    expect(JSON.parse(toJson(read(FULL).params))).toEqual({ colour: 'dark oak', size: ['120', '140'], flag: '' });
    expect(JSON.parse(toJson(readParams('a=1&a=2&a=3')))).toEqual({ a: ['1', '2', '3'] });
    expect(toJson([])).toBe('{}');
  });

  it('is not fooled by a name an object already has', () => {
    const made = JSON.parse(toJson(readParams('__proto__=x&constructor=y'))) as Record<string, unknown>;
    expect(Object.keys(made)).toEqual(['__proto__', 'constructor']);
  });
});
