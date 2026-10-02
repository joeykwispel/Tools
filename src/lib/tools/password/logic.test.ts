import { describe, expect, it } from 'vitest';
import { SETS, below, crackTime, passphrase, passphraseBits, password, passwordBits, pools, strength, type RandomBytes, type SetName } from './logic';
import { WORDS } from './words';

/** Random bytes from a fixed sequence, so a failing test can be repeated. */
function seeded(seed: number): RandomBytes {
  let state = seed >>> 0;
  return (length) =>
    Uint8Array.from({ length }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state >>> 24;
    });
}
const ALL: SetName[] = ['lower', 'upper', 'digits', 'symbols'];

describe('below', () => {
  it('stays inside the limit, and reaches every number', () => {
    const random = seeded(1);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = below(10, random);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(10);
      seen.add(n);
    }
    expect(seen.size).toBe(10);
    expect(below(1, random)).toBe(0);
  });

  it('gives every number about as often', () => {
    // 6 does not fit evenly in 65536: a plain remainder would favour the low numbers
    const random = seeded(2);
    const counts = new Array<number>(6).fill(0);
    for (let i = 0; i < 60_000; i++) counts[below(6, random)]++;
    for (const n of counts) expect(Math.abs(n - 10_000)).toBeLessThan(500);
  });

  it('draws again when a number would make the result unfair', () => {
    // 65535 is outside the fair range for a limit of 6 (65532 is the last multiple); the next draw is used
    const bytes = [0xff, 0xff, 0x00, 0x07];
    let i = 0;
    const random: RandomBytes = (length) => Uint8Array.from({ length }, () => bytes[i++]);
    expect(below(6, random)).toBe(7 % 6);
    expect(i).toBe(4);
  });
});

describe('password', () => {
  it('has the asked length and only characters of the chosen sets', () => {
    const random = seeded(3);
    expect(password({ length: 24, sets: ['lower'] }, random)).toMatch(/^[a-z]{24}$/);
    expect(password({ length: 12, sets: ['digits'] }, random)).toMatch(/^[0-9]{12}$/);
    expect(password({ length: 40, sets: ['lower', 'upper'] }, random)).toMatch(/^[A-Za-z]{40}$/);
  });

  it('always holds at least one character of every chosen set', () => {
    const random = seeded(4);
    for (let i = 0; i < 500; i++) {
      const made = password({ length: 4, sets: ALL }, random);
      expect(made).toHaveLength(4);
      for (const name of ALL)
        expect(
          [...made].some((ch) => SETS[name].includes(ch)),
          `${made} has no ${name}`
        ).toBe(true);
    }
  });

  it('can leave out the characters that look alike', () => {
    const random = seeded(5);
    const made = password({ length: 200, sets: ALL, readable: true }, random);
    expect(made).not.toMatch(/[0Oo1lI|]/);
    expect(pools({ sets: ['digits'], readable: true })).toEqual(['23456789']);
  });

  it('gives nothing when no set is chosen or the length is zero, and stops at a maximum', () => {
    expect(password({ length: 16, sets: [] })).toBe('');
    expect(password({ length: 0, sets: ALL })).toBe('');
    expect(password({ length: 10_000, sets: ['lower'] })).toHaveLength(256);
  });

  it('is different every time with the browser random numbers', () => {
    const made = new Set(Array.from({ length: 50 }, () => password({ length: 16, sets: ALL })));
    expect(made.size).toBe(50);
  });
});

describe('passphrase', () => {
  it('joins words from the list with the separator', () => {
    const made = passphrase({ words: 5, separator: ' ' }, seeded(6));
    const parts = made.split(' ');
    expect(parts).toHaveLength(5);
    for (const part of parts) expect(WORDS).toContain(part);
  });

  it('can capitalise the words and add a digit', () => {
    const made = passphrase({ words: 4, separator: ' ', capitalize: true, digit: true }, seeded(7));
    expect(made).toMatch(/^([A-Z][a-z-]+[0-9]? ){3}[A-Z][a-z-]+[0-9]?$/);
    expect(made.match(/[0-9]/g)).toHaveLength(1);
  });

  it('gives nothing for zero words, and stops at a maximum', () => {
    expect(passphrase({ words: 0, separator: '-', digit: true })).toBe('');
    expect(passphrase({ words: 500, separator: ' ' }).split(' ')).toHaveLength(20);
  });
});

describe('the word list', () => {
  it('is the EFF short list: 1296 different words of three to five characters', () => {
    expect(WORDS).toHaveLength(1296);
    expect(new Set(WORDS).size).toBe(1296);
    // lower-case letters, and one word with a dash in it: yo-yo
    for (const word of WORDS) expect(word).toMatch(/^[a-z-]{3,5}$/);
    expect(WORDS.filter((word) => word.includes('-'))).toEqual(['yo-yo']);
    expect(WORDS[0]).toBe('acid');
    expect(WORDS.at(-1)).toBe('zoom');
  });
});

describe('strength', () => {
  it('counts the bits of a password from its length and the size of its alphabet', () => {
    expect(passwordBits({ length: 8, sets: ['digits'] })).toBeCloseTo(26.58, 2);
    expect(passwordBits({ length: 16, sets: ALL })).toBeCloseTo(16 * Math.log2(86), 5);
    expect(passwordBits({ length: 16, sets: [] })).toBe(0);
  });

  it('counts the bits of a passphrase from its number of words', () => {
    expect(passphraseBits({ words: 6, separator: '-' })).toBeCloseTo(62.04, 2);
    expect(passphraseBits({ words: 6, separator: '-', digit: true })).toBeCloseTo(62.04 + Math.log2(60), 2);
    expect(passphraseBits({ words: 0, separator: '-', digit: true })).toBe(0);
  });

  it('gives a label for a number of bits', () => {
    expect([10, 49.9, 50, 74.9, 75, 99.9, 100, 200].map(strength)).toEqual(['weak', 'weak', 'fair', 'fair', 'strong', 'strong', 'veryStrong', 'veryStrong']);
  });

  it('estimates how long guessing takes', () => {
    expect(crackTime(20)).toEqual({ unit: 'instant', amount: 0 });
    expect(crackTime(40)).toEqual({ unit: 'seconds', amount: 55 });
    expect(crackTime(50)).toEqual({ unit: 'hours', amount: 16 });
    expect(crackTime(60)).toEqual({ unit: 'years', amount: 2 });
    expect(crackTime(80).unit).toBe('centuries');
  });
});
