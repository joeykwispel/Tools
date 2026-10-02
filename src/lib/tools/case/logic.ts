/** Rewriting a name or a sentence in the cases code uses: camelCase, snake_case, kebab-case and the rest. */

/**
 * The words in a text, whatever it was written in: "userID", "user_id", "user-id" and "User Id" all give user + id.
 * Words are split at spaces and punctuation, between a lower-case letter and a capital (camelCase), before the last
 * capital of a run that is followed by lower case (XMLParser → XML + Parser), and between letters and digits.
 */
export function words(text: string): string[] {
  return (
    text
      // accents stay part of their letter: "café" is one word
      .normalize('NFC')
      .match(/\p{Lu}+(?!\p{Ll})|\p{Lu}?\p{Ll}+|\p{L}+|\p{N}+/gu) ?? []
  );
}

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
const lower = (word: string) => word.toLowerCase();

/** The cases, in the order they are shown. */
export const CASES = {
  camel: (w: string[]) => w.map((word, i) => (i ? capital(word) : lower(word))).join(''),
  pascal: (w: string[]) => w.map(capital).join(''),
  snake: (w: string[]) => w.map(lower).join('_'),
  constant: (w: string[]) => w.map((word) => word.toUpperCase()).join('_'),
  kebab: (w: string[]) => w.map(lower).join('-'),
  train: (w: string[]) => w.map(capital).join('-'),
  dot: (w: string[]) => w.map(lower).join('.'),
  path: (w: string[]) => w.map(lower).join('/'),
  title: (w: string[]) => w.map(capital).join(' '),
  sentence: (w: string[]) => w.map((word, i) => (i ? lower(word) : capital(word))).join(' '),
  lower: (w: string[]) => w.map(lower).join(' '),
  upper: (w: string[]) => w.map((word) => word.toUpperCase()).join(' ')
} as const;

export type Case = keyof typeof CASES;

/** What each case looks like, written in itself: the label a developer recognises. */
export const EXAMPLES: Record<Case, string> = {
  camel: 'camelCase',
  pascal: 'PascalCase',
  snake: 'snake_case',
  constant: 'CONSTANT_CASE',
  kebab: 'kebab-case',
  train: 'Train-Case',
  dot: 'dot.case',
  path: 'path/case',
  title: 'Title Case',
  sentence: 'Sentence case',
  lower: 'lower case',
  upper: 'UPPER CASE'
};

/**
 * `text` in the given case. Every line is converted on its own, so a list of names stays a list;
 * a line without any letters or digits stays as it is.
 */
export function convert(text: string, to: Case): string {
  return text
    .split('\n')
    .map((line) => {
      const found = words(line);
      return found.length ? CASES[to](found) : line;
    })
    .join('\n');
}
