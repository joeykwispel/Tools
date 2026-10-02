/**
 * JSON, read by a parser of its own instead of JSON.parse, for two reasons: an error comes with its exact place and a
 * reason a person can act on, and formatting keeps the document as it was written. A number like 12345678901234567890
 * or 1.0 stays that number; JSON.parse would round the first and shorten the second.
 */

export type Node =
  | { type: 'object'; entries: Entry[] }
  | { type: 'array'; items: Node[] }
  /** `raw` is the string as written, quotes and escapes included */
  | { type: 'string'; value: string; raw: string }
  | { type: 'number'; raw: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' };

export interface Entry {
  key: string;
  /** The key as written, quotes and escapes included */
  rawKey: string;
  value: Node;
}

export type ErrorKind =
  | 'empty'
  /** the text stops in the middle of a value */
  | 'end'
  /** a character that can't be there */
  | 'char'
  | 'trailingComma'
  | 'singleQuote'
  | 'unquotedKey'
  | 'comment'
  | 'number'
  | 'escape'
  /** a line break or other control character inside a string */
  | 'control'
  /** something after the end of the document */
  | 'extra';

export interface JsonError {
  kind: ErrorKind;
  /** Index into the text, from 0 */
  position: number;
  /** From 1 */
  line: number;
  column: number;
  /** The character at that place, or '' at the end */
  found: string;
}

export type Parsed = { ok: true; node: Node } | { ok: false; error: JsonError };

class Failure extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly position: number
  ) {
    super(kind);
  }
}

const NUMBER = /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/y;

class Parser {
  i = 0;
  constructor(readonly text: string) {}

  fail(kind: ErrorKind, position = this.i): never {
    throw new Failure(kind, position);
  }

  /** Skips whitespace; JSON has no comments, so one gets its own message. */
  space(): void {
    while (' \t\n\r'.includes(this.text[this.i] ?? 'x')) this.i++;
    if (this.text.startsWith('//', this.i) || this.text.startsWith('/*', this.i)) this.fail('comment');
  }

  value(): Node {
    const ch = this.text[this.i];
    if (ch === undefined) this.fail('end');
    if (ch === '{') return this.object();
    if (ch === '[') return this.array();
    if (ch === '"') return this.string();
    if (ch === "'") this.fail('singleQuote');
    if (ch === '-' || (ch >= '0' && ch <= '9')) return this.number();
    for (const [word, node] of [
      ['true', { type: 'boolean', value: true }],
      ['false', { type: 'boolean', value: false }],
      ['null', { type: 'null' }]
    ] as [string, Node][])
      if (this.text.startsWith(word, this.i)) {
        this.i += word.length;
        return node;
      }
    return this.fail('char');
  }

  object(): Node {
    const entries: Entry[] = [];
    this.i++;
    this.space();
    if (this.text[this.i] === '}') {
      this.i++;
      return { type: 'object', entries };
    }
    for (;;) {
      this.space();
      const ch = this.text[this.i];
      if (ch !== '"') {
        if (ch === undefined) this.fail('end');
        if (ch === '}' && entries.length) this.fail('trailingComma');
        if (ch === "'") this.fail('singleQuote');
        if (/[A-Za-z_$]/.test(ch)) this.fail('unquotedKey');
        this.fail('char');
      }
      const key = this.string() as Extract<Node, { type: 'string' }>;
      this.space();
      if (this.text[this.i] !== ':') this.fail(this.text[this.i] === undefined ? 'end' : 'char');
      this.i++;
      this.space();
      entries.push({ key: key.value, rawKey: key.raw, value: this.value() });
      this.space();
      const next = this.text[this.i];
      if (next === '}') {
        this.i++;
        return { type: 'object', entries };
      }
      if (next !== ',') this.fail(next === undefined ? 'end' : 'char');
      this.i++;
    }
  }

  array(): Node {
    const items: Node[] = [];
    this.i++;
    this.space();
    if (this.text[this.i] === ']') {
      this.i++;
      return { type: 'array', items };
    }
    for (;;) {
      this.space();
      if (this.text[this.i] === ']' && items.length) this.fail('trailingComma');
      items.push(this.value());
      this.space();
      const next = this.text[this.i];
      if (next === ']') {
        this.i++;
        return { type: 'array', items };
      }
      if (next !== ',') this.fail(next === undefined ? 'end' : 'char');
      this.i++;
    }
  }

  string(): Node {
    const start = this.i;
    for (this.i++; ; this.i++) {
      const ch = this.text[this.i];
      if (ch === undefined) this.fail('end');
      if (ch === '"') break;
      if (ch === '\\') {
        const escape = this.text[this.i + 1];
        if (escape === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(this.text.slice(this.i + 2, this.i + 6))) this.fail('escape');
          this.i += 5;
        } else if (escape === undefined) this.fail('end', this.text.length);
        else if ('"\\/bfnrt'.includes(escape)) this.i++;
        else this.fail('escape');
      } else if (ch.charCodeAt(0) < 0x20) this.fail('control');
    }
    this.i++;
    const raw = this.text.slice(start, this.i);
    return { type: 'string', value: JSON.parse(raw) as string, raw };
  }

  number(): Node {
    NUMBER.lastIndex = this.i;
    const match = NUMBER.exec(this.text);
    if (!match) this.fail('number');
    const end = this.i + match[0].length;
    // "01", "1.", "1e" and "1.2.3" start like a number but are not one
    if (/[0-9.eE+-]/.test(this.text[end] ?? '')) this.fail('number');
    this.i = end;
    return { type: 'number', raw: match[0] };
  }
}

/** Reads a JSON document, or says where and why it is not one. */
export function parse(text: string): Parsed {
  const parser = new Parser(text);
  try {
    parser.space();
    if (parser.i >= text.length) parser.fail('empty', 0);
    const node = parser.value();
    parser.space();
    if (parser.i < text.length) parser.fail('extra');
    return { ok: true, node };
  } catch (e) {
    if (!(e instanceof Failure)) throw e;
    const before = text.slice(0, e.position);
    const line = before.split('\n').length;
    return {
      ok: false,
      error: { kind: e.kind, position: e.position, line, column: e.position - (before.lastIndexOf('\n') + 1) + 1, found: text[e.position] ?? '' }
    };
  }
}

/** The document as text again. `indent` is what one level is indented with; null puts everything on one line. */
export function format(node: Node, indent: string | null = '  ', depth = 0): string {
  const pretty = indent !== null;
  const pad = (d: number) => (pretty ? `\n${indent.repeat(d)}` : '');
  switch (node.type) {
    case 'object':
      if (!node.entries.length) return '{}';
      return `{${node.entries.map((e) => `${pad(depth + 1)}${e.rawKey}:${pretty ? ' ' : ''}${format(e.value, indent, depth + 1)}`).join(',')}${pad(depth)}}`;
    case 'array':
      if (!node.items.length) return '[]';
      return `[${node.items.map((item) => `${pad(depth + 1)}${format(item, indent, depth + 1)}`).join(',')}${pad(depth)}]`;
    case 'string':
    case 'number':
      return node.raw;
    case 'boolean':
      return String(node.value);
    case 'null':
      return 'null';
  }
}

/** The same document with the keys of every object in alphabetical order. */
export function sortKeys(node: Node): Node {
  if (node.type === 'array') return { type: 'array', items: node.items.map(sortKeys) };
  if (node.type !== 'object') return node;
  const entries = node.entries.map((e) => ({ ...e, value: sortKeys(e.value) }));
  return { type: 'object', entries: entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)) };
}

/** The keys that appear more than once in the same object, anywhere in the document: the last one wins when it is read. */
export function duplicateKeys(node: Node): string[] {
  const found = new Set<string>();
  const walk = (n: Node) => {
    if (n.type === 'array') n.items.forEach(walk);
    if (n.type !== 'object') return;
    const seen = new Set<string>();
    for (const e of n.entries) {
      if (seen.has(e.key)) found.add(e.key);
      seen.add(e.key);
      walk(e.value);
    }
  };
  walk(node);
  return [...found];
}

/** The value a program would get, as JSON.parse gives it. */
export function toValue(node: Node): unknown {
  switch (node.type) {
    case 'object':
      return Object.fromEntries(node.entries.map((e) => [e.key, toValue(e.value)]));
    case 'array':
      return node.items.map(toValue);
    case 'string':
    case 'boolean':
      return node.value;
    case 'number':
      return Number(node.raw);
    case 'null':
      return null;
  }
}

/** How many values an object or array holds directly; 0 for anything else. */
export const size = (node: Node) => (node.type === 'object' ? node.entries.length : node.type === 'array' ? node.items.length : 0);
