import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { check, hashAll, integrity, parse, tag, type Hashes } from './logic';

const bytes = (text: string) => new TextEncoder().encode(text);
/** The same hash by Node's own implementation, to compare with. */
const byNode = (algorithm: string, text: string) => createHash(algorithm).update(text).digest('base64');

const CONTENT = "alert('Hello, world.');";

describe('hashAll and integrity', () => {
  it('hashes the content by each algorithm, in Base64', async () => {
    const hashes = await hashAll(bytes('abc'));
    expect(hashes.sha256).toBe('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
    expect(hashes).toEqual({ sha256: byNode('sha256', 'abc'), sha384: byNode('sha384', 'abc'), sha512: byNode('sha512', 'abc') });
    expect([hashes.sha256.length, hashes.sha384.length, hashes.sha512.length]).toEqual([44, 64, 88]);
  });

  it('hashes the bytes, so a line ending more is another hash', async () => {
    const [unix, windows] = await Promise.all([hashAll(bytes('a\nb')), hashAll(bytes('a\r\nb'))]);
    expect(unix.sha384).not.toBe(windows.sha384);
    expect((await hashAll(bytes('é'))).sha384).toBe(byNode('sha384', 'é'));
  });

  it('writes the value of the attribute', async () => {
    const hashes = await hashAll(bytes(CONTENT));
    expect(integrity(hashes, 'sha384')).toBe(`sha384-${byNode('sha384', CONTENT)}`);
    expect(integrity(hashes, 'sha512')).toBe(`sha512-${byNode('sha512', CONTENT)}`);
  });
});

describe('tag', () => {
  it('writes a script, a module or a stylesheet with crossorigin', () => {
    expect(tag('script', 'https://cdn.example.com/app.js', 'sha384-abc')).toBe(
      '<script src="https://cdn.example.com/app.js" integrity="sha384-abc" crossorigin="anonymous"></script>'
    );
    expect(tag('module', 'https://cdn.example.com/app.mjs', 'sha384-abc')).toBe(
      '<script type="module" src="https://cdn.example.com/app.mjs" integrity="sha384-abc" crossorigin="anonymous"></script>'
    );
    expect(tag('style', 'https://cdn.example.com/app.css', 'sha384-abc')).toBe(
      '<link rel="stylesheet" href="https://cdn.example.com/app.css" integrity="sha384-abc" crossorigin="anonymous">'
    );
  });

  it('escapes what would end the attribute', () => {
    expect(tag('script', 'https://example.com/a.js?x=1&y="2"', 'sha384-abc')).toContain('src="https://example.com/a.js?x=1&amp;y=&quot;2&quot;"');
  });
});

describe('parse', () => {
  it('reads one or more hashes', () => {
    expect(parse('sha384-abc+/=')).toEqual({ entries: [{ algorithm: 'sha384', hash: 'abc+/=' }], ignored: [] });
    expect(parse('  sha256-AAAA \n sha512-BBBB==  ')).toEqual({
      entries: [
        { algorithm: 'sha256', hash: 'AAAA' },
        { algorithm: 'sha512', hash: 'BBBB==' }
      ],
      ignored: []
    });
  });

  it('takes the value out of a pasted attribute or tag', () => {
    expect(parse('integrity="sha384-AAAA"').entries).toEqual([{ algorithm: 'sha384', hash: 'AAAA' }]);
    expect(parse(`<script src="a.js" integrity='sha256-AAAA sha384-BBBB' crossorigin="anonymous"></script>`).entries).toEqual([
      { algorithm: 'sha256', hash: 'AAAA' },
      { algorithm: 'sha384', hash: 'BBBB' }
    ]);
  });

  it('reads the algorithm in any case, the URL-safe alphabet and options', () => {
    expect(parse('SHA384-ab-_').entries).toEqual([{ algorithm: 'sha384', hash: 'ab+/' }]);
    expect(parse('sha384-AAAA?foo=bar').entries).toEqual([{ algorithm: 'sha384', hash: 'AAAA' }]);
  });

  it('sets aside what a browser skips', () => {
    expect(parse('md5-AAAA sha1-BBBB sha384 sha384- sha384-a*b hello')).toEqual({
      entries: [],
      ignored: ['md5-AAAA', 'sha1-BBBB', 'sha384', 'sha384-', 'sha384-a*b', 'hello']
    });
    expect(parse('')).toEqual({ entries: [], ignored: [] });
  });
});

describe('check', () => {
  let hashes: Hashes;
  const other = byNode('sha384', 'something else');

  it('matches the hash of the content', async () => {
    hashes = await hashAll(bytes(CONTENT));
    expect(check(`sha384-${hashes.sha384}`, hashes)).toEqual({ kind: 'match', algorithm: 'sha384' });
    expect(check(`sha256-${hashes.sha256}`, hashes)).toEqual({ kind: 'match', algorithm: 'sha256' });
    // without the padding, and in the URL-safe alphabet
    expect(check(`sha256-${hashes.sha256.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}`, hashes)).toEqual({ kind: 'match', algorithm: 'sha256' });
  });

  it('says when it does not match', () => {
    expect(check(`sha384-${other}`, hashes)).toEqual({ kind: 'mismatch', algorithm: 'sha384', malformed: false });
    expect(check('sha384-AAAA', hashes)).toEqual({ kind: 'mismatch', algorithm: 'sha384', malformed: true });
  });

  it('lets one of several hashes of the strongest algorithm be enough', () => {
    expect(check(`sha384-${other} sha384-${hashes.sha384}`, hashes)).toEqual({ kind: 'match', algorithm: 'sha384' });
  });

  it('only looks at the strongest algorithm', () => {
    // the right sha256 does not help when a wrong sha512 is given
    expect(check(`sha256-${hashes.sha256} sha512-${byNode('sha512', 'something else')}`, hashes)).toEqual({
      kind: 'mismatch',
      algorithm: 'sha512',
      malformed: false
    });
    expect(check(`sha256-AAAA sha512-${hashes.sha512}`, hashes)).toEqual({ kind: 'match', algorithm: 'sha512' });
  });

  it('says when a browser would not check at all', () => {
    expect(check('', hashes)).toEqual({ kind: 'none' });
    expect(check('   ', hashes)).toEqual({ kind: 'none' });
    expect(check('md5-AAAA', hashes)).toEqual({ kind: 'unchecked' });
    // what it does not know is skipped; what is left is checked
    expect(check(`md5-AAAA sha384-${hashes.sha384}`, hashes)).toEqual({ kind: 'match', algorithm: 'sha384' });
  });
});
