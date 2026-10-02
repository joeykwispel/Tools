/** Two small generators: a URL slug from a title, and lorem ipsum filler text. */

/** Letters that are not a base letter plus an accent, so taking the accents off does not help. */
const LETTERS: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ł: 'l',
  ı: 'i',
  Æ: 'AE',
  Œ: 'OE',
  Ø: 'O',
  Đ: 'D',
  Ð: 'D',
  Þ: 'Th',
  Ł: 'L'
};

export interface SlugOptions {
  separator?: '-' | '_';
  /** Write everything in lower case (the usual choice for a URL) */
  lowercase?: boolean;
  /** Cut the slug at this many characters, at a word boundary where possible; 0 for no limit */
  maxLength?: number;
}

/**
 * A title as a URL slug: "Crème brûlée & co!" → "creme-brulee-co". Accents are taken off, anything that is not a
 * letter or digit becomes one separator, and there is none at the start or end.
 */
export function slugify(text: string, { separator = '-', lowercase = true, maxLength = 0 }: SlugOptions = {}): string {
  let slug = text
    .replace(/[ßæœøđðþłıÆŒØĐÐÞŁ]/g, (letter) => LETTERS[letter])
    // split a letter from its accents, then drop the accents
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    // an apostrophe joins: "don't" is "dont", not "don-t"
    .replace(/['’]/g, '')
    .replace(/[^A-Za-z0-9]+/g, separator);
  const edges = new RegExp(`^\\${separator}+|\\${separator}+$`, 'g');
  slug = slug.replace(edges, '');
  if (lowercase) slug = slug.toLowerCase();
  if (maxLength > 0 && slug.length > maxLength) {
    const cut = slug.slice(0, maxLength);
    const lastWord = cut.lastIndexOf(separator);
    // end at a whole word, unless that would leave less than half
    slug = (slug[maxLength] === separator || lastWord < maxLength / 2 ? cut : cut.slice(0, lastWord)).replace(edges, '');
  }
  return slug;
}

const WORDS =
  `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum at vero eos accusamus iusto odio dignissimos ducimus blanditiis praesentium voluptatum deleniti atque corrupti quos dolores quas molestias excepturi obcaecati cupiditate provident similique mollitia animi perspiciatis unde omnis iste natus error voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta explicabo nemo ipsam quia voluptas aspernatur aut odit fugit consequuntur magni ratione sequi nesciunt neque porro quisquam`.split(
    ' '
  );
const OPENING = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit'];

/** A small random number generator (mulberry32) that gives the same numbers for the same seed, so a text can be repeated. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Unit = 'words' | 'sentences' | 'paragraphs';

export interface LoremOptions {
  /** Begin with "Lorem ipsum dolor sit amet…" */
  classic?: boolean;
  /** The same seed gives the same text */
  seed?: number;
}

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Filler text: `amount` words, sentences or paragraphs (paragraphs are separated by an empty line). */
export function lorem(amount: number, unit: Unit, { classic = true, seed = 1 }: LoremOptions = {}): string {
  const count = Math.max(0, Math.min(Math.floor(amount) || 0, unit === 'words' ? 5000 : unit === 'sentences' ? 500 : 100));
  if (!count) return '';
  const next = random(seed);
  const pick = (from: number, to: number) => from + Math.floor(next() * (to - from + 1));
  let previous = '';
  const word = () => {
    let chosen = WORDS[pick(0, WORDS.length - 1)];
    // the same word twice in a row reads like a mistake
    while (chosen === previous) chosen = WORDS[pick(0, WORDS.length - 1)];
    previous = chosen;
    return chosen;
  };
  /** The words of one sentence; the very first sentence opens with the classic words when asked. */
  let first = classic;
  const sentenceWords = (length: number) => {
    const opening = first ? OPENING.slice(0, length) : [];
    first = false;
    return [...opening, ...Array.from({ length: Math.max(0, length - opening.length) }, word)];
  };
  const sentence = () => {
    const list = sentenceWords(pick(6, 14));
    // a comma somewhere in the middle of a longer sentence
    if (list.length > 8) list[pick(2, list.length - 4)] += ',';
    return `${capital(list.join(' '))}.`;
  };

  if (unit === 'words') return capital(sentenceWords(count).join(' '));
  if (unit === 'sentences') return Array.from({ length: count }, sentence).join(' ');
  return Array.from({ length: count }, () => Array.from({ length: pick(3, 6) }, sentence).join(' ')).join('\n\n');
}
