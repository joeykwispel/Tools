/** Looking inside a text: its code points, how they are stored, and the characters you can't see. */

export type Kind =
  | 'visible'
  /** an ordinary space, tab or line break */
  | 'whitespace'
  /** a space that is not the ordinary one: no-break space, thin space, ideographic space, … */
  | 'space'
  /** takes no room at all: zero-width space, joiners, soft hyphen, byte order mark, variation selectors, … */
  | 'invisible'
  /** changes the direction of the text around it; can make code read differently from how it runs */
  | 'bidi'
  /** a control character other than tab and line breaks */
  | 'control'
  /** attaches to the character before it: an accent, for instance */
  | 'combining'
  /** half of a surrogate pair on its own: not a character */
  | 'invalid';

/** The official names of the characters worth pointing out. */
const NAMES: Record<number, [Kind, string]> = {
  0x09: ['whitespace', 'CHARACTER TABULATION'],
  0x0a: ['whitespace', 'LINE FEED'],
  0x0d: ['whitespace', 'CARRIAGE RETURN'],
  0x20: ['whitespace', 'SPACE'],
  0xa0: ['space', 'NO-BREAK SPACE'],
  0xad: ['invisible', 'SOFT HYPHEN'],
  0x034f: ['invisible', 'COMBINING GRAPHEME JOINER'],
  0x061c: ['bidi', 'ARABIC LETTER MARK'],
  0x1680: ['space', 'OGHAM SPACE MARK'],
  0x180e: ['invisible', 'MONGOLIAN VOWEL SEPARATOR'],
  0x2000: ['space', 'EN QUAD'],
  0x2001: ['space', 'EM QUAD'],
  0x2002: ['space', 'EN SPACE'],
  0x2003: ['space', 'EM SPACE'],
  0x2004: ['space', 'THREE-PER-EM SPACE'],
  0x2005: ['space', 'FOUR-PER-EM SPACE'],
  0x2006: ['space', 'SIX-PER-EM SPACE'],
  0x2007: ['space', 'FIGURE SPACE'],
  0x2008: ['space', 'PUNCTUATION SPACE'],
  0x2009: ['space', 'THIN SPACE'],
  0x200a: ['space', 'HAIR SPACE'],
  0x200b: ['invisible', 'ZERO WIDTH SPACE'],
  0x200c: ['invisible', 'ZERO WIDTH NON-JOINER'],
  0x200d: ['invisible', 'ZERO WIDTH JOINER'],
  0x200e: ['bidi', 'LEFT-TO-RIGHT MARK'],
  0x200f: ['bidi', 'RIGHT-TO-LEFT MARK'],
  0x2028: ['space', 'LINE SEPARATOR'],
  0x2029: ['space', 'PARAGRAPH SEPARATOR'],
  0x202a: ['bidi', 'LEFT-TO-RIGHT EMBEDDING'],
  0x202b: ['bidi', 'RIGHT-TO-LEFT EMBEDDING'],
  0x202c: ['bidi', 'POP DIRECTIONAL FORMATTING'],
  0x202d: ['bidi', 'LEFT-TO-RIGHT OVERRIDE'],
  0x202e: ['bidi', 'RIGHT-TO-LEFT OVERRIDE'],
  0x202f: ['space', 'NARROW NO-BREAK SPACE'],
  0x205f: ['space', 'MEDIUM MATHEMATICAL SPACE'],
  0x2060: ['invisible', 'WORD JOINER'],
  0x2061: ['invisible', 'FUNCTION APPLICATION'],
  0x2062: ['invisible', 'INVISIBLE TIMES'],
  0x2063: ['invisible', 'INVISIBLE SEPARATOR'],
  0x2064: ['invisible', 'INVISIBLE PLUS'],
  0x2066: ['bidi', 'LEFT-TO-RIGHT ISOLATE'],
  0x2067: ['bidi', 'RIGHT-TO-LEFT ISOLATE'],
  0x2068: ['bidi', 'FIRST STRONG ISOLATE'],
  0x2069: ['bidi', 'POP DIRECTIONAL ISOLATE'],
  0x3000: ['space', 'IDEOGRAPHIC SPACE'],
  0xfeff: ['invisible', 'ZERO WIDTH NO-BREAK SPACE (BYTE ORDER MARK)'],
  0xfffc: ['invisible', 'OBJECT REPLACEMENT CHARACTER'],
  0xfffd: ['visible', 'REPLACEMENT CHARACTER']
};

export interface Char {
  /** The character itself (one code point; two UTF-16 units above U+FFFF) */
  char: string;
  code: number;
  /** "U+00E9" */
  label: string;
  /** Its bytes in UTF-8, as hex: "C3 A9" */
  utf8: string;
  kind: Kind;
  /** The official name, for the characters this tool points out; empty otherwise */
  name: string;
}

const hex = (n: number, width: number) => n.toString(16).toUpperCase().padStart(width, '0');

function classify(code: number, char: string): [Kind, string] {
  if (NAMES[code]) return NAMES[code];
  if (code >= 0xd800 && code <= 0xdfff) return ['invalid', 'LONE SURROGATE'];
  if (code >= 0xfe00 && code <= 0xfe0f) return ['invisible', `VARIATION SELECTOR-${code - 0xfe00 + 1}`];
  if (code >= 0xe0100 && code <= 0xe01ef) return ['invisible', `VARIATION SELECTOR-${code - 0xe0100 + 17}`];
  if (code === 0xe0001 || (code >= 0xe0020 && code <= 0xe007f)) return ['invisible', 'TAG CHARACTER'];
  if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return ['control', 'CONTROL CHARACTER'];
  if (/\p{M}/u.test(char)) return ['combining', ''];
  if (/\p{Cf}/u.test(char)) return ['invisible', 'FORMAT CHARACTER'];
  return ['visible', ''];
}

/** Every code point of `text`, in order. */
export function inspect(text: string): Char[] {
  const encoder = new TextEncoder();
  const out: Char[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    const [kind, name] = classify(code, char);
    out.push({ char, code, label: `U+${hex(code, 4)}`, utf8: [...encoder.encode(char)].map((b) => hex(b, 2)).join(' '), kind, name });
  }
  return out;
}

/** The kinds a reader can't see or would not expect: worth a warning. */
export const HIDDEN: readonly Kind[] = ['space', 'invisible', 'bidi', 'control', 'invalid'];

export interface Summary {
  /** What a reader would count as characters: "é" written as e + accent, or a family emoji, is one */
  graphemes: number;
  codePoints: number;
  utf16: number;
  utf8: number;
  /** Characters of a HIDDEN kind */
  hidden: number;
}

export function summarise(text: string, chars: readonly Char[] = inspect(text)): Summary {
  return {
    graphemes: [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length,
    codePoints: chars.length,
    utf16: text.length,
    utf8: new TextEncoder().encode(text).length,
    hidden: chars.filter((c) => HIDDEN.includes(c.kind)).length
  };
}

/**
 * `text` without what can't be seen: unusual spaces become an ordinary space, and invisible, direction-changing,
 * control and broken characters are removed. Joiners and variation selectors inside an emoji are kept, or the emoji
 * would fall apart.
 */
export function clean(text: string): string {
  const chars = inspect(text);
  return chars
    .map((c, i) => {
      if (c.kind === 'space') return c.code === 0x2028 || c.code === 0x2029 ? '\n' : ' ';
      if (!HIDDEN.includes(c.kind)) return c.char;
      const inEmoji = (c.code === 0x200d || c.code === 0xfe0f) && /\p{Extended_Pictographic}|\p{Emoji_Component}/u.test(chars[i - 1]?.char ?? '');
      return inEmoji ? c.char : '';
    })
    .join('');
}
