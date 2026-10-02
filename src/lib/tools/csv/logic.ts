/** Reading CSV (RFC 4180, and what spreadsheets really write), and sorting it as a table. */

export const DELIMITERS = [',', ';', '\t', '|'] as const;
export type Delimiter = (typeof DELIMITERS)[number];

/**
 * Splits CSV text into rows of fields. A field in double quotes may hold the delimiter, line breaks, and a quote
 * written twice (""). Empty lines are skipped; a byte order mark at the start is ignored.
 */
export function parse(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  /** Whether the current field started with a quote: an empty quoted field still counts as a field */
  let wasQuoted = false;
  const endRow = () => {
    if (row.length || field || wasQuoted) rows.push([...row, field]);
    row = [];
    field = '';
    wasQuoted = false;
  };
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (input[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"' && field === '') {
      quoted = true;
      wasQuoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
      wasQuoted = false;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      endRow();
    } else field += ch;
  }
  endRow();
  return rows;
}

/**
 * The delimiter this text most likely uses: the one that gives the same number of columns (more than one) on the
 * most lines. Dutch spreadsheets write semicolons, because the comma is the decimal sign there.
 */
export function detect(text: string): Delimiter {
  const sample = text.split(/\r?\n/, 50).join('\n');
  let best: { delimiter: Delimiter; score: number } = { delimiter: ',', score: 0 };
  for (const delimiter of DELIMITERS) {
    const widths = parse(sample, delimiter).map((row) => row.length);
    const columns = widths[0] ?? 0;
    if (columns < 2) continue;
    // lines that agree with the first, weighted by how many columns that is
    const score = widths.filter((w) => w === columns).length * columns;
    if (score > best.score) best = { delimiter, score };
  }
  return best.delimiter;
}

export interface Table {
  header: string[];
  rows: string[][];
  /** Rows that have more or fewer fields than the header */
  ragged: number;
}

/** Rows as a table: every row as wide as the widest, and a header that is the first row or "Column 1", "Column 2", … */
export function table(all: string[][], firstRowIsHeader: boolean, columnName: (n: number) => string): Table {
  const width = Math.max(0, ...all.map((row) => row.length));
  const fit = (row: string[]) => [...row, ...Array<string>(width - row.length).fill('')];
  const first = firstRowIsHeader ? all[0] : undefined;
  const header = Array.from({ length: width }, (_, i) => first?.[i]?.trim() || columnName(i + 1));
  const body = firstRowIsHeader ? all.slice(1) : all;
  return { header, rows: body.map(fit), ragged: body.filter((row) => row.length !== (first?.length ?? width)).length };
}

/** A number as people write it in a CSV: 12, -3.5, 1,5 (decimal comma), 1e3. Null for anything else. */
export function number(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[+-]?(\d+([.,]\d+)?|[.,]\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null;
  return Number(trimmed.replace(',', '.'));
}

/** Sorts rows by one column: as numbers when both values are numbers, otherwise as text ("item 2" before "item 10"). Empty values go last. */
export function sort(rows: readonly string[][], column: number, direction: 'ascending' | 'descending'): string[][] {
  const sign = direction === 'ascending' ? 1 : -1;
  const compare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;
  return [...rows].sort((a, b) => {
    const x = a[column] ?? '';
    const y = b[column] ?? '';
    if (!x.trim() || !y.trim()) return !x.trim() && !y.trim() ? 0 : x.trim() ? -1 : 1;
    const n = number(x);
    const m = number(y);
    return sign * (n !== null && m !== null ? n - m : compare(x, y));
  });
}

/** The rows that have `query` somewhere, in any column; upper and lower case are the same. */
export function filter(rows: readonly string[][], query: string): string[][] {
  const q = query.trim().toLowerCase();
  return q ? rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q))) : [...rows];
}

/** The table as JSON: one object per row, keyed by the header. A column name used twice gets a number behind it. */
export function toJson({ header, rows }: Pick<Table, 'header' | 'rows'>): string {
  const seen = new Map<string, number>();
  const keys = header.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} ${count}`;
  });
  return JSON.stringify(
    rows.map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? '']))),
    null,
    2
  );
}
