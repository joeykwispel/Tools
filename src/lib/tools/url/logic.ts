/** Percent-encoding (RFC 3986), as pure functions. */

/** What to leave alone when encoding. */
export type Scope =
  /** A value that goes into a URL: everything is escaped except letters, digits and - _ . ! ~ * ' ( ) */
  | 'component'
  /** A whole URL: the characters that give a URL its structure (: / ? # & = and more) stay as they are */
  | 'url';

/**
 * Escapes `text` for use in a URL. With `plus`, a space becomes + instead of %20, as HTML forms send it
 * (application/x-www-form-urlencoded); a literal + is then escaped, so it can be told apart.
 */
export function encode(text: string, scope: Scope = 'component', plus = false): string {
  // a lone surrogate (half an emoji) can't be encoded; replace it the way browsers do when they send it
  const safe = text.toWellFormed();
  const encoded = scope === 'url' ? encodeURI(safe) : encodeURIComponent(safe);
  if (!plus) return encoded;
  return (scope === 'url' ? encoded.replaceAll('+', '%2B') : encoded).replaceAll('%20', '+');
}

export interface Decoded {
  text: string;
  /** How many % sequences could not be decoded and were left as they were */
  invalid: number;
}

/**
 * Unescapes `text`. Sequences that are not valid (a % without two hex digits, or bytes that are not UTF-8)
 * are left as they are and counted, so one bad sequence does not hide the rest.
 */
export function decode(text: string, plus = false): Decoded {
  let invalid = 0;
  const spaced = plus ? text.replaceAll('+', ' ') : text;
  const out = spaced.replace(/(?:%[0-9A-Fa-f]{2})+|%/g, (run) => {
    if (run === '%') {
      invalid++;
      return run;
    }
    try {
      return decodeURIComponent(run);
    } catch {
      return decodeBytes(run, () => invalid++);
    }
  });
  return { text: out, invalid };
}

/** Decodes a run of %XX byte by byte: the longest valid UTF-8 pieces become text, the rest stays. */
function decodeBytes(run: string, onInvalid: () => void): string {
  const parts = run.match(/%[0-9A-Fa-f]{2}/g) ?? [];
  let out = '';
  for (let i = 0; i < parts.length;) {
    let done = false;
    // a UTF-8 character is one to four bytes
    for (let length = Math.min(4, parts.length - i); length >= 1 && !done; length--) {
      try {
        out += decodeURIComponent(parts.slice(i, i + length).join(''));
        i += length;
        done = true;
      } catch {
        /* try a shorter piece */
      }
    }
    if (!done) {
      out += parts[i];
      onInvalid();
      i++;
    }
  }
  return out;
}
