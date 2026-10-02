/** The regex tester, as pure functions: no DOM, so they run in a worker and in tests. */

/** The flags that can be switched on. `g` decides between the first match and all of them. */
export const FLAGS = ['g', 'i', 'm', 's', 'u'] as const;
export type Flag = (typeof FLAGS)[number];

/** Enough to be useful, few enough to keep the page fast on a pattern that matches everywhere. */
export const MAX_MATCHES = 1000;

export interface Group {
  /** "1", "2", … or the name of a named group */
  name: string;
  /** undefined when the group took no part in the match */
  value: string | undefined;
}

export interface Match {
  index: number;
  end: number;
  text: string;
  groups: Group[];
}

export type Result = { ok: true; matches: Match[]; truncated: boolean } | { ok: false; error: string };

export interface Input {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
}

export interface Output {
  result: Result;
  /** The text after replacing, or null when the pattern is empty or invalid */
  replaced: string | null;
}

const cleanFlags = (flags: string) => FLAGS.filter((f) => flags.includes(f)).join('');

/**
 * The name of each capturing group, in order: its name for (?<name>…), null for a plain (…).
 * Reads the pattern itself, because a match only tells the values, not which number a name belongs to.
 */
export function groupNames(pattern: string): (string | null)[] {
  const names: (string | null)[] = [];
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') i++;
    else if (inClass) inClass = ch !== ']';
    else if (ch === '[') inClass = true;
    else if (ch === '(') {
      if (pattern[i + 1] !== '?') names.push(null);
      else {
        // (?<name>…) captures; (?<=…) and (?<!…) are lookbehinds
        const named = /^\(\?<([^=!>][^>]*)>/.exec(pattern.slice(i));
        if (named) names.push(named[1]);
      }
    }
  }
  return names;
}

/** Finds the matches of `pattern` in `text`: all of them with the g flag, otherwise the first. */
export function run(pattern: string, flags: string, text: string): Result {
  if (!pattern) return { ok: true, matches: [], truncated: false };
  const wanted = cleanFlags(flags);
  let re: RegExp;
  try {
    // always global, so lastIndex moves and one loop serves both cases
    re = new RegExp(pattern, wanted.includes('g') ? wanted : `${wanted}g`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const names = groupNames(pattern);
  const matches: Match[] = [];
  let truncated = false;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (matches.length === MAX_MATCHES) {
      truncated = true;
      break;
    }
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      text: m[0],
      groups: m.slice(1).map((value, i) => ({ name: names[i] ?? String(i + 1), value }))
    });
    if (!wanted.includes('g')) break;
    // an empty match would be found again at the same place forever
    if (m[0] === '') re.lastIndex += wanted.includes('u') && (text.codePointAt(re.lastIndex) ?? 0) > 0xffff ? 2 : 1;
  }
  return { ok: true, matches, truncated };
}

/** `text` with the matches replaced. `replacement` may use $1, $<name>, $& and $$, as in String.replace. */
export function replace(pattern: string, flags: string, text: string, replacement: string): string | null {
  if (!pattern) return null;
  try {
    return text.replace(new RegExp(pattern, cleanFlags(flags)), replacement);
  } catch {
    return null;
  }
}

export const evaluate = ({ pattern, flags, text, replacement }: Input): Output => ({
  result: run(pattern, flags, text),
  replaced: replace(pattern, flags, text, replacement)
});

export interface Segment {
  text: string;
  /** The number of the match this piece belongs to (from 0), or null for the text in between */
  match: number | null;
}

/** Cuts `text` into matched and unmatched pieces, in order, to show the matches highlighted. */
export function segments(text: string, matches: readonly Match[]): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  matches.forEach((m, i) => {
    // an empty match has nothing to highlight, and must not cut the text around it in two
    if (m.end === m.index) return;
    if (m.index > at) out.push({ text: text.slice(at, m.index), match: null });
    out.push({ text: text.slice(m.index, m.end), match: i });
    at = m.end;
  });
  if (at < text.length) out.push({ text: text.slice(at), match: null });
  return out;
}
