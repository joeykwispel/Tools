import { describe, expect, it } from 'vitest';
import { count, duration, frequent, words } from './logic';

describe('count', () => {
  it('counts characters, words, sentences, lines and paragraphs', () => {
    const text = 'Hello world. This is a test!\nA second line?\n\nAnd a new paragraph.';
    expect(count(text)).toMatchObject({ characters: 65, charactersNoSpaces: 52, words: 13, sentences: 4, paragraphs: 2, lines: 4 });
  });

  it('counts an emoji and an accented letter as one character, and gives the size in bytes', () => {
    expect(count('👨‍👩‍👧‍👦 café')).toMatchObject({ characters: 6, charactersNoSpaces: 5, words: 1, bytes: 31 });
    expect(count('é').bytes).toBe(2);
  });

  it('counts words the way a reader does', () => {
    expect(count("Don't e-mail me at 9.30, it's a state-of-the-art re-run.").words).toBe(9);
    expect(count('one, two; three / four — five').words).toBe(5);
    expect(count('   ').words).toBe(0);
  });

  it('gives zeros for an empty text', () => {
    expect(count('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      bytes: 0,
      readingSeconds: 0,
      speakingSeconds: 0
    });
  });

  it('does not count punctuation alone as a sentence', () => {
    expect(count('Really?! ... Yes.').sentences).toBe(2);
    expect(count('...').sentences).toBe(0);
  });

  it('estimates reading and speaking time from the number of words', () => {
    const text = 'word '.repeat(476);
    // 476 words at 238 a minute is two minutes; at 150 a minute a little over three
    expect(count(text)).toMatchObject({ words: 476, readingSeconds: 120, speakingSeconds: 190 });
  });

  it('accepts every kind of line break', () => {
    expect(count('a\r\nb\rc\nd').lines).toBe(4);
    expect(count('one line').lines).toBe(1);
    expect(count('p1\r\n\r\np2\n \t\np3').paragraphs).toBe(3);
  });
});

describe('words', () => {
  it('takes the punctuation around a word off, and keeps what is inside it', () => {
    expect(words("'s Ochtends drink ik koffie.")).toEqual(['s', 'Ochtends', 'drink', 'ik', 'koffie']);
    expect(words('(e-mail) "don\'t" 9.30, … —')).toEqual(['e-mail', "don't", '9.30']);
  });
});

describe('duration', () => {
  it('writes a duration the way it is said', () => {
    expect(duration(0)).toBe('0 s');
    expect(duration(45)).toBe('45 s');
    expect(duration(60)).toBe('1 min');
    expect(duration(200)).toBe('3 min 20 s');
    expect(duration(3600)).toBe('1 h');
    expect(duration(3900)).toBe('1 h 5 min');
  });
});

describe('frequent', () => {
  it('lists the most used words, without regard to case', () => {
    expect(frequent('The cat and the dog. The Dog barks; the cat sleeps.', 3)).toEqual([
      { word: 'the', count: 4 },
      { word: 'cat', count: 2 },
      { word: 'dog', count: 2 }
    ]);
  });

  it('leaves out single letters and numbers', () => {
    expect(frequent('a a a 12 12 12 I I ok')).toEqual([{ word: 'ok', count: 1 }]);
  });

  it('gives nothing for a text without words', () => {
    expect(frequent('')).toEqual([]);
    expect(frequent('... !!!')).toEqual([]);
  });
});
