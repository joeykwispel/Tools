/** HTML character references: escaping text for HTML, and reading references back. */

/** The names of U+00A0 to U+00FF, in order (the Latin-1 entities of HTML 4). */
const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest ' +
  'Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig ' +
  'agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml';

/** Greek capitals from U+0391 (there is no letter at U+03A2), and small letters from U+03B1. */
const GREEK_UPPER = 'Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho - Sigma Tau Upsilon Phi Chi Psi Omega';
const GREEK_LOWER = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigmaf sigma tau upsilon phi chi psi omega';

/** The other names worth knowing: punctuation, currency, arrows and maths. */
const OTHER: Record<string, number> = {
  quot: 34,
  amp: 38,
  apos: 39,
  lt: 60,
  gt: 62,
  OElig: 338,
  oelig: 339,
  Scaron: 352,
  scaron: 353,
  Yuml: 376,
  fnof: 402,
  circ: 710,
  tilde: 732,
  ensp: 8194,
  emsp: 8195,
  thinsp: 8201,
  zwnj: 8204,
  zwj: 8205,
  ndash: 8211,
  mdash: 8212,
  lsquo: 8216,
  rsquo: 8217,
  sbquo: 8218,
  ldquo: 8220,
  rdquo: 8221,
  bdquo: 8222,
  dagger: 8224,
  Dagger: 8225,
  bull: 8226,
  hellip: 8230,
  permil: 8240,
  prime: 8242,
  Prime: 8243,
  lsaquo: 8249,
  rsaquo: 8250,
  euro: 8364,
  trade: 8482,
  larr: 8592,
  uarr: 8593,
  rarr: 8594,
  darr: 8595,
  harr: 8596,
  rArr: 8658,
  hArr: 8660,
  part: 8706,
  sum: 8721,
  minus: 8722,
  radic: 8730,
  infin: 8734,
  asymp: 8776,
  ne: 8800,
  le: 8804,
  ge: 8805,
  hearts: 9829,
  check: 10003,
  cross: 10007
};

/** Entity name → code point. */
export const ENTITIES: ReadonlyMap<string, number> = new Map([
  ...Object.entries(OTHER),
  ...LATIN1.split(' ').map((name, i): [string, number] => [name, 160 + i]),
  ...GREEK_UPPER.split(' ').flatMap((name, i): [string, number][] => (name === '-' ? [] : [[name, 913 + i]])),
  ...GREEK_LOWER.split(' ').map((name, i): [string, number] => [name, 945 + i])
]);

const NAMES: ReadonlyMap<number, string> = new Map([...ENTITIES].map(([name, code]) => [code, name]));

/** How far to go when escaping. */
export type Level =
  /** Only the five characters that have a meaning in HTML: & < > " ' */
  | 'special'
  /** Also everything outside ASCII, by name where a name exists (&eacute;) and by number otherwise */
  | 'named'
  /** Also everything outside ASCII, always by number (&#233;) */
  | 'numeric';

const SPECIAL: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes `text` so it can be put into HTML, between tags or inside a quoted attribute. */
export function encode(text: string, level: Level = 'special'): string {
  let out = '';
  // by code point, so an emoji becomes one reference and not two halves
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (SPECIAL[ch]) out += SPECIAL[ch];
    else if (code < 128 || level === 'special') out += ch;
    else {
      const name = level === 'named' ? NAMES.get(code) : undefined;
      out += name ? `&${name};` : `&#${code};`;
    }
  }
  return out;
}

export interface Decoded {
  text: string;
  /** How many references were not recognised and were left as they were */
  unknown: number;
}

/** Whether `code` can be written as a character: a real code point that is not half of a surrogate pair. */
const valid = (code: number) => code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);

/** Replaces the references in `text` by their characters: &name; &#123; and &#x1F600;. Unknown ones stay and are counted. */
export function decode(text: string): Decoded {
  let unknown = 0;
  const out = text.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g, (whole, body: string) => {
    const code = body.startsWith('#') ? (/^#[xX]/.test(body) ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)) : ENTITIES.get(body);
    if (code === undefined || !valid(code)) {
      unknown++;
      return whole;
    }
    return String.fromCodePoint(code);
  });
  return { text: out, unknown };
}
