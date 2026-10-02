/** Cleaning up a list of lines: trimming, removing empty and double lines, sorting and numbering. */

export type Order = 'none' | 'ascending' | 'descending' | 'length' | 'reverse';

export interface Options {
  /** Remove spaces and tabs at both ends of every line */
  trim?: boolean;
  /** Leave out lines with nothing on them */
  removeEmpty?: boolean;
  /** Keep only the first of lines that are the same */
  unique?: boolean;
  /** Treat upper and lower case as the same, for doubles and for sorting */
  ignoreCase?: boolean;
  order?: Order;
  /** Put "1. ", "2. ", … in front of every line */
  number?: boolean;
}

/** A text as lines, whatever line break it uses. A final line break does not make an extra empty line. */
export function split(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

/**
 * The lines after the chosen steps, always in this order: trim, remove empty lines, remove doubles, sort, number.
 * Sorting is the way people expect it: "item 2" before "item 10", and accents next to their letter.
 */
export function transform(
  text: string,
  { trim = false, removeEmpty = false, unique = false, ignoreCase = false, order = 'none', number = false }: Options = {}
): string[] {
  let lines = split(text);
  if (trim) lines = lines.map((line) => line.trim());
  if (removeEmpty) lines = lines.filter((line) => line.trim() !== '');
  if (unique) {
    const seen = new Set<string>();
    lines = lines.filter((line) => {
      const key = ignoreCase ? line.toLowerCase() : line;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (order === 'reverse') lines = [...lines].reverse();
  else if (order === 'length') lines = [...lines].sort((a, b) => [...a].length - [...b].length);
  else if (order !== 'none') {
    // sensitivity 'variant' tells "a" from "A"; 'accent' does not, so they sort as equal and keep their order
    const compare = new Intl.Collator(undefined, { numeric: true, sensitivity: ignoreCase ? 'accent' : 'variant' }).compare;
    lines = [...lines].sort((a, b) => (order === 'ascending' ? compare(a, b) : compare(b, a)));
  }
  if (number) {
    const width = String(lines.length).length;
    lines = lines.map((line, i) => `${String(i + 1).padStart(width)}. ${line}`);
  }
  return lines;
}
