import { format, parse, sortKeys, type JsonError } from '../json/logic';

/** Comparing two texts line by line (Myers' algorithm), with the changed words inside a changed line. */

export interface Op<T = string> {
  type: 'equal' | 'delete' | 'insert';
  value: T;
}

/** Beyond this many changes the middle is given as "all removed, all added": finding the best match would take too long. */
const MAX_EDITS = 4000;

/**
 * The shortest list of deletions and insertions that turns `a` into `b`. `same` decides when two items count as equal;
 * an equal item is reported with its value from `b`.
 */
export function diff<T>(a: readonly T[], b: readonly T[], same: (x: T, y: T) => boolean = (x, y) => x === y): Op<T>[] {
  // what both start and end with needs no searching
  let start = 0;
  while (start < a.length && start < b.length && same(a[start], b[start])) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && same(a[a.length - 1 - end], b[b.length - 1 - end])) end++;

  const left = a.slice(start, a.length - end);
  const right = b.slice(start, b.length - end);
  return [
    ...b.slice(0, start).map((value): Op<T> => ({ type: 'equal', value })),
    ...middle(left, right, same),
    ...b.slice(b.length - end).map((value): Op<T> => ({ type: 'equal', value }))
  ];
}

function middle<T>(a: readonly T[], b: readonly T[], same: (x: T, y: T) => boolean): Op<T>[] {
  const n = a.length;
  const m = b.length;
  const replaceAll = (): Op<T>[] => [...a.map((value): Op<T> => ({ type: 'delete', value })), ...b.map((value): Op<T> => ({ type: 'insert', value }))];
  if (!n || !m) return replaceAll();

  // v[k] is how far along `a` the best path on diagonal k (x - y) has come; trace keeps v for every number of edits
  const max = Math.min(n + m, MAX_EDITS);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && same(a[x], b[y])) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
  }
  if (found < 0) return replaceAll();

  // walk back from the end, one edit at a time
  const ops: Op<T>[] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const row = trace[d];
    // row holds diagonals -d-1 … d+1 of the state before edit d
    const at = (k: number) => row[k + d + 1];
    const k = x - y;
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const previousK = down ? k + 1 : k - 1;
    const previousX = at(previousK);
    const previousY = previousX - previousK;
    while (x > previousX && y > previousY) {
      ops.push({ type: 'equal', value: b[--y] });
      x--;
    }
    if (down) ops.push({ type: 'insert', value: b[--y] });
    else ops.push({ type: 'delete', value: a[--x] });
  }
  while (x > 0 && y > 0) {
    ops.push({ type: 'equal', value: b[--y] });
    x--;
  }
  return ops.reverse();
}

export interface Options {
  /** Treat lines that differ only in spaces and tabs as equal */
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

/** Splits a text into lines; a final line break does not make an extra empty line. */
export function lines(text: string): string[] {
  if (!text) return [];
  const all = text.replace(/\r\n?/g, '\n').split('\n');
  if (all.at(-1) === '') all.pop();
  return all;
}

export interface Line {
  type: Op['type'];
  text: string;
  /** Line number in the original; null for an added line */
  before: number | null;
  /** Line number in the changed text; null for a removed line */
  after: number | null;
  /** For a changed line: its pieces, with `changed` on the words that differ from its counterpart */
  parts?: { text: string; changed: boolean }[];
}

const words = (line: string) => line.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];

/** How much two lines have in common, from 0 (nothing) to 1 (the same words), with the word-by-word comparison it came from. */
function similarity(removed: Line, added: Line) {
  const ops = diff(words(removed.text), words(added.text));
  const real = (op: Op) => op.value.trim() !== '';
  const kept = ops.filter((op) => op.type === 'equal' && real(op)).length;
  const total = ops.filter((op) => op.type !== 'insert' && real(op)).length + ops.filter((op) => op.type !== 'delete' && real(op)).length;
  return { score: total ? (2 * kept) / total : 0, ops };
}

/** Two lines that share at least half their words are one line that was changed; less than that, and they are two different lines. */
const ALIKE = 0.5;
/** A larger block of changes is not searched for pairs: every removed line would be compared with every added one. */
const MAX_PAIRING = 400;

/**
 * Finds, for each removed line of a block, the added line it most likely became, and marks the words that differ.
 * Marking every word of two unrelated lines would say nothing, so those are left alone.
 */
function pair(removed: Line[], added: Line[]): void {
  if (removed.length * added.length > MAX_PAIRING) return;
  const taken = new Set<Line>();
  for (const line of removed) {
    let best: { to: Line; score: number; ops: Op[] } | null = null;
    for (const to of added) {
      if (taken.has(to)) continue;
      const { score, ops } = similarity(line, to);
      if (score >= ALIKE && (!best || score > best.score)) best = { to, score, ops };
    }
    if (!best) continue;
    taken.add(best.to);
    line.parts = best.ops.filter((op) => op.type !== 'insert').map((op) => ({ text: op.value, changed: op.type === 'delete' }));
    best.to.parts = best.ops.filter((op) => op.type !== 'delete').map((op) => ({ text: op.value, changed: op.type === 'insert' }));
  }
}

/** Compares two texts line by line. */
export function compare(before: string, after: string, { ignoreWhitespace = false, ignoreCase = false }: Options = {}): Line[] {
  const normal = (line: string) => {
    let out = ignoreWhitespace ? line.replace(/[ \t]+/g, ' ').trim() : line;
    if (ignoreCase) out = out.toLowerCase();
    return out;
  };
  const ops = diff(lines(before), lines(after), ignoreWhitespace || ignoreCase ? (x, y) => normal(x) === normal(y) : undefined);

  let a = 0;
  let b = 0;
  const out: Line[] = ops.map((op) => ({
    type: op.type,
    text: op.value,
    before: op.type === 'insert' ? null : ++a,
    after: op.type === 'delete' ? null : ++b
  }));

  // a run of removed lines followed by added lines: find which line became which
  for (let i = 0; i < out.length;) {
    if (out[i].type !== 'delete') {
      i++;
      continue;
    }
    let removed = i;
    while (out[removed]?.type === 'delete') removed++;
    let added = removed;
    while (out[added]?.type === 'insert') added++;
    pair(out.slice(i, removed), out.slice(removed, added));
    i = added;
  }
  return out;
}

export type Block = { lines: Line[] } | { skipped: number };

/** Leaves out long stretches of unchanged lines, keeping `context` of them around every change. */
export function hunks(all: readonly Line[], context = 3): Block[] {
  const keep = new Array<boolean>(all.length).fill(false);
  all.forEach((line, i) => {
    if (line.type === 'equal') return;
    for (let j = Math.max(0, i - context); j <= Math.min(all.length - 1, i + context); j++) keep[j] = true;
  });
  const blocks: Block[] = [];
  for (let i = 0; i < all.length;) {
    let j = i;
    while (j < all.length && keep[j] === keep[i]) j++;
    blocks.push(keep[i] ? { lines: all.slice(i, j) } : { skipped: j - i });
    i = j;
  }
  return blocks;
}

export const count = (all: readonly Line[]) => ({
  added: all.filter((line) => line.type === 'insert').length,
  removed: all.filter((line) => line.type === 'delete').length
});

/** The comparison as text: "+ " before an added line, "- " before a removed one. */
export const toText = (all: readonly Line[]) =>
  all.map((line) => `${line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' '} ${line.text}`).join('\n');

/**
 * JSON written one fixed way: keys sorted, two spaces. Two documents that mean the same then compare as equal,
 * whatever their key order and layout were.
 */
export function normaliseJson(text: string): { ok: true; text: string } | { ok: false; error: JsonError } {
  const parsed = parse(text);
  return parsed.ok ? { ok: true, text: format(sortKeys(parsed.node)) } : parsed;
}
