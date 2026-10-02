import { describe, expect, it } from 'vitest';
import { tools } from './registry';
import { search } from './search';

const slugs = (query: string, locale: 'en' | 'nl' = 'en') => search(tools, query, locale).map((t) => t.slug);

describe('search', () => {
  it('finds a tool by the start of its title', () => {
    expect(slugs('reg')[0]).toBe('regex');
    expect(slugs('JWT')[0]).toBe('jwt');
  });

  it('finds a tool by a keyword that is not in its title', () => {
    expect(slugs('bearer')).toEqual(['jwt']);
    expect(slugs('sha256')).toContain('hash');
  });

  it('finds a tool by its title in the other language', () => {
    expect(slugs('wachtwoord', 'en')[0]).toBe('password');
    expect(slugs('password', 'nl')[0]).toBe('password');
  });

  it('ignores case and accents', () => {
    expect(slugs('KOPIEREN', 'nl')).toContain('gradient');
  });

  it('needs every word of the query to fit', () => {
    expect(slugs('json type')[0]).toBe('json-to-ts');
    expect(slugs('json zebra')).toEqual([]);
  });

  it('puts a title match before a description match', () => {
    const found = slugs('json');
    expect(found.indexOf('json')).toBeLessThan(found.indexOf('diff'));
  });

  it('gives nothing for an empty query or one that fits no tool', () => {
    expect(slugs('')).toEqual([]);
    expect(slugs('   ')).toEqual([]);
    expect(slugs('qwertyuiop')).toEqual([]);
  });
});
