import { WORDS } from './words';

/**
 * Making passwords and passphrases, and saying how strong they are. Random numbers come in as an argument, so the page
 * can use the browser's secure ones and the tests known ones.
 */

/** Fills a byte array of the asked length with random bytes. */
export type RandomBytes = (length: number) => Uint8Array;
export const secureRandom: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

/**
 * A random whole number from 0 up to but not including `limit`, every one equally likely. A plain "byte % limit"
 * would favour the low numbers; numbers that would cause that are thrown away and drawn again.
 */
export function below(limit: number, random: RandomBytes = secureRandom): number {
  if (limit <= 1) return 0;
  // two bytes at a time: enough for every limit used here (at most 65536)
  const fair = Math.floor(65536 / limit) * limit;
  for (;;) {
    const [high, low] = random(2);
    const value = high * 256 + low;
    if (value < fair) return value % limit;
  }
}

export const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/'
} as const;
export type SetName = keyof typeof SETS;

/** Characters that are easy to take for one another when a password is read or typed over: 0 O o, 1 l I. */
const LOOKALIKE = /[0Oo1lI|]/g;

export interface PasswordOptions {
  length: number;
  sets: readonly SetName[];
  /** Leave out the characters that look alike */
  readable?: boolean;
}

/** The characters a password is drawn from, per chosen set. */
export function pools({ sets, readable = false }: Pick<PasswordOptions, 'sets' | 'readable'>): string[] {
  return sets.map((name) => (readable ? SETS[name].replace(LOOKALIKE, '') : SETS[name]));
}

/**
 * A random password with at least one character of every chosen set (when it is long enough to hold them).
 * Empty when no set is chosen.
 */
export function password(options: PasswordOptions, random: RandomBytes = secureRandom): string {
  const chosen = pools(options);
  const all = chosen.join('');
  const length = Math.max(0, Math.min(Math.floor(options.length) || 0, 256));
  if (!all || !length) return '';
  const chars = Array.from({ length }, () => all[below(all.length, random)]);
  // make sure every set is there: put one of each on a random place of its own
  if (length >= chosen.length) {
    const free = Array.from({ length }, (_, i) => i);
    for (const pool of chosen) {
      if (chars.some((ch) => pool.includes(ch))) continue;
      // a place that does not hold the only character of another set
      const candidates = free.filter((i) =>
        chosen.every((other) => other === pool || !other.includes(chars[i]) || chars.filter((ch) => other.includes(ch)).length > 1)
      );
      const at = (candidates.length ? candidates : free)[below((candidates.length ? candidates : free).length, random)];
      chars[at] = pool[below(pool.length, random)];
      free.splice(free.indexOf(at), 1);
    }
  }
  return chars.join('');
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize?: boolean;
  /** Put one digit behind one of the words, for sites that insist on a number */
  digit?: boolean;
}

/** Random words from the EFF list, joined by a separator: easier to remember and to type than a random password. */
export function passphrase({ words, separator, capitalize = false, digit = false }: PassphraseOptions, random: RandomBytes = secureRandom): string {
  const count = Math.max(0, Math.min(Math.floor(words) || 0, 20));
  const picked = Array.from({ length: count }, () => {
    const word = WORDS[below(WORDS.length, random)];
    return capitalize ? word[0].toUpperCase() + word.slice(1) : word;
  });
  if (digit && count) picked[below(count, random)] += String(below(10, random));
  return picked.join(separator);
}

/** How unpredictable a password is, in bits: each bit doubles the number of guesses needed. */
export const passwordBits = (options: PasswordOptions) => {
  const size = pools(options).join('').length;
  return size ? Math.max(0, Math.floor(options.length) || 0) * Math.log2(size) : 0;
};

export const passphraseBits = ({ words, digit = false }: PassphraseOptions) => {
  const count = Math.max(0, Math.floor(words) || 0);
  // the digit adds its value (10) and its place (one of the words)
  return count * Math.log2(WORDS.length) + (digit && count ? Math.log2(10 * count) : 0);
};

export type Strength = 'weak' | 'fair' | 'strong' | 'veryStrong';

/**
 * A label for a number of bits. The steps follow what an attacker who has a stolen, fast-hashed database can try:
 * below 50 bits falls in hours to days, 75 and up is out of reach.
 */
export const strength = (bits: number): Strength => (bits < 50 ? 'weak' : bits < 75 ? 'fair' : bits < 100 ? 'strong' : 'veryStrong');

/** How long guessing takes on average at `perSecond` guesses, as a unit and a rounded number of them. */
export function crackTime(
  bits: number,
  perSecond = 1e10
): { unit: 'instant' | 'seconds' | 'minutes' | 'hours' | 'days' | 'years' | 'centuries'; amount: number } {
  // on average half of all possibilities have to be tried
  const seconds = 2 ** (bits - 1) / perSecond;
  if (seconds < 1) return { unit: 'instant', amount: 0 };
  if (seconds < 60) return { unit: 'seconds', amount: Math.round(seconds) };
  if (seconds < 3600) return { unit: 'minutes', amount: Math.round(seconds / 60) };
  if (seconds < 86400) return { unit: 'hours', amount: Math.round(seconds / 3600) };
  if (seconds < 86400 * 365) return { unit: 'days', amount: Math.round(seconds / 86400) };
  const years = seconds / (86400 * 365.25);
  return years < 1000 ? { unit: 'years', amount: Math.round(years) } : { unit: 'centuries', amount: years / 100 };
}
