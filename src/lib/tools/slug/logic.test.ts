import { describe, expect, it } from 'vitest';
import { lorem, slugify } from './logic';

describe('slugify', () => {
  it('makes a URL slug of a title', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  10 Tips & Tricks for 2026  ')).toBe('10-tips-tricks-for-2026');
    expect(slugify('What is a "slug"?')).toBe('what-is-a-slug');
  });

  it('takes accents off and writes special letters out', () => {
    expect(slugify('Crème brûlée à la carte')).toBe('creme-brulee-a-la-carte');
    expect(slugify('Straße nach Ærø, Łódź')).toBe('strasse-nach-aero-lodz');
    expect(slugify('Ångström Œuvre Þór')).toBe('angstrom-oeuvre-thor');
    expect(slugify('ﬁne ﬂow ①')).toBe('fine-flow-1');
  });

  it('joins what an apostrophe joins', () => {
    expect(slugify("Don't panic: it’s fine")).toBe('dont-panic-its-fine');
  });

  it('can use an underscore and keep the case', () => {
    expect(slugify('Hello big World', { separator: '_' })).toBe('hello_big_world');
    expect(slugify('Hello big World', { lowercase: false })).toBe('Hello-big-World');
    expect(slugify('__a--b__', { separator: '_' })).toBe('a_b');
  });

  it('cuts at a word boundary when there is a maximum length', () => {
    const title = 'the quick brown fox jumps over the lazy dog';
    expect(slugify(title, { maxLength: 20 })).toBe('the-quick-brown-fox');
    expect(slugify(title, { maxLength: 19 })).toBe('the-quick-brown-fox');
    expect(slugify(title, { maxLength: 18 })).toBe('the-quick-brown');
    expect(slugify(title, { maxLength: 200 })).toBe('the-quick-brown-fox-jumps-over-the-lazy-dog');
    // one very long word is cut where the limit is
    expect(slugify('supercalifragilisticexpialidocious', { maxLength: 10 })).toBe('supercalif');
  });

  it('gives nothing for a text without letters or digits', () => {
    expect(slugify('')).toBe('');
    expect(slugify('!!! --- ???')).toBe('');
    expect(slugify('日本語')).toBe('');
  });
});

describe('lorem', () => {
  const wordsIn = (text: string) => text.split(/\s+/).filter(Boolean);
  const sentencesIn = (text: string) => text.split(/(?<=\.)\s+/).filter(Boolean);

  it('gives the number of words asked for, opening with the classic words', () => {
    expect(lorem(5, 'words')).toBe('Lorem ipsum dolor sit amet');
    expect(wordsIn(lorem(40, 'words'))).toHaveLength(40);
    expect(lorem(40, 'words').startsWith('Lorem ipsum dolor sit amet consectetur adipiscing elit ')).toBe(true);
  });

  it('gives sentences that start with a capital and end with a full stop', () => {
    const text = lorem(6, 'sentences');
    const sentences = sentencesIn(text);
    expect(sentences).toHaveLength(6);
    for (const sentence of sentences) expect(sentence).toMatch(/^[A-Z][a-z, ]+\.$/);
    expect(text.startsWith('Lorem ipsum dolor sit amet')).toBe(true);
  });

  it('gives paragraphs separated by an empty line', () => {
    const paragraphs = lorem(4, 'paragraphs').split('\n\n');
    expect(paragraphs).toHaveLength(4);
    for (const paragraph of paragraphs) expect(sentencesIn(paragraph).length).toBeGreaterThanOrEqual(3);
  });

  it('gives the same text for the same seed, and another text for another seed', () => {
    expect(lorem(3, 'paragraphs', { seed: 7 })).toBe(lorem(3, 'paragraphs', { seed: 7 }));
    expect(lorem(3, 'paragraphs', { seed: 7 })).not.toBe(lorem(3, 'paragraphs', { seed: 8 }));
  });

  it('can leave the classic opening out', () => {
    expect(lorem(20, 'words', { classic: false, seed: 3 }).startsWith('Lorem ipsum')).toBe(false);
    expect(wordsIn(lorem(20, 'words', { classic: false, seed: 3 }))).toHaveLength(20);
  });

  it('never repeats a word right after itself', () => {
    const words = wordsIn(lorem(2000, 'words', { seed: 5 }).toLowerCase());
    expect(words.some((word, i) => word === words[i - 1])).toBe(false);
  });

  it('gives nothing for zero or a nonsense amount, and stops at a sensible maximum', () => {
    expect(lorem(0, 'words')).toBe('');
    expect(lorem(-3, 'sentences')).toBe('');
    expect(lorem(Number.NaN, 'paragraphs')).toBe('');
    expect(wordsIn(lorem(1_000_000, 'words'))).toHaveLength(5000);
    expect(lorem(1_000_000, 'paragraphs').split('\n\n')).toHaveLength(100);
  });
});
