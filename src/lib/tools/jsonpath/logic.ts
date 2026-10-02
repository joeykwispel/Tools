/**
 * JSONPath (RFC 9535): names, wildcards, indexes, slices, unions, recursive descent and filters with comparisons
 * and && || !. Function extensions (length(), match(), …) are not included.
 */

type Selector =
  | { t: 'name'; name: string }
  | { t: 'wildcard' }
  | { t: 'index'; index: number }
  | { t: 'slice'; start?: number; end?: number; step?: number }
  | { t: 'filter'; expr: Expr };

interface Segment {
  /** `..`: apply the selectors to the node and to everything under it */
  descendant: boolean;
  selectors: Selector[];
}

interface Query {
  /** `$` starts at the document, `@` at the value a filter is looking at */
  root: '$' | '@';
  segments: Segment[];
}

type Operand = { t: 'literal'; value: unknown } | { t: 'query'; query: Query };
type Operator = '==' | '!=' | '<' | '<=' | '>' | '>=';
type Expr =
  | { t: 'or'; a: Expr; b: Expr }
  | { t: 'and'; a: Expr; b: Expr }
  | { t: 'not'; a: Expr }
  | { t: 'compare'; op: Operator; left: Operand; right: Operand }
  | { t: 'exists'; query: Query };

export type ErrorKind =
  /** the query does not start with $ */
  | 'start'
  /** a character that can't be there */
  | 'unexpected'
  /** the query stops in the middle */
  | 'end'
  /** a quote that is never closed */
  | 'string';

export class PathError extends Error {
  constructor(
    readonly kind: ErrorKind,
    /** Index into the query, from 0 */
    readonly position: number,
    readonly found = ''
  ) {
    super(kind);
  }
}

const NAME = /[^\s.[\]()'"*,:?!<>=&|@$]+/y;
const INTEGER = /-?(0|[1-9][0-9]*)/y;
const NUMBER = /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/y;
const ESCAPES: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '/': '/', '\\': '\\', "'": "'", '"': '"' };

class Parser {
  i = 0;
  constructor(readonly text: string) {}

  fail(kind: ErrorKind = this.i >= this.text.length ? 'end' : 'unexpected', position = this.i): never {
    throw new PathError(kind, position, this.text[position] ?? '');
  }

  space(): void {
    while (' \t\n\r'.includes(this.text[this.i] ?? 'x')) this.i++;
  }

  eat(token: string): boolean {
    if (!this.text.startsWith(token, this.i)) return false;
    this.i += token.length;
    return true;
  }

  match(pattern: RegExp): string | null {
    pattern.lastIndex = this.i;
    const found = pattern.exec(this.text)?.[0] ?? null;
    if (found !== null) this.i += found.length;
    return found;
  }

  segments(): Segment[] {
    const out: Segment[] = [];
    for (;;) {
      const before = this.i;
      this.space();
      if (this.eat('..')) {
        if (this.text[this.i] === '[') out.push({ descendant: true, selectors: this.bracket() });
        else out.push({ descendant: true, selectors: [this.member()] });
      } else if (this.eat('.')) out.push({ descendant: false, selectors: [this.member()] });
      else if (this.text[this.i] === '[') out.push({ descendant: false, selectors: this.bracket() });
      else {
        // the space belonged to whatever comes after the query
        this.i = before;
        return out;
      }
    }
  }

  /** What follows a dot: a name or *. */
  member(): Selector {
    if (this.eat('*')) return { t: 'wildcard' };
    const name = this.match(NAME);
    return name === null ? this.fail() : { t: 'name', name };
  }

  bracket(): Selector[] {
    this.i++;
    const selectors: Selector[] = [];
    do {
      this.space();
      selectors.push(this.selector());
      this.space();
    } while (this.eat(','));
    if (!this.eat(']')) this.fail();
    return selectors;
  }

  selector(): Selector {
    const ch = this.text[this.i];
    if (ch === "'" || ch === '"') return { t: 'name', name: this.string() };
    if (this.eat('*')) return { t: 'wildcard' };
    if (this.eat('?')) {
      this.space();
      return { t: 'filter', expr: this.or() };
    }
    // an index, or a slice start:end:step in which every part may be left out
    const start = this.integer();
    this.space();
    if (!this.eat(':')) return start === undefined ? this.fail() : { t: 'index', index: start };
    this.space();
    const end = this.integer();
    this.space();
    let step: number | undefined;
    if (this.eat(':')) {
      this.space();
      step = this.integer();
    }
    return { t: 'slice', start, end, step };
  }

  integer(): number | undefined {
    const found = this.match(INTEGER);
    return found === null ? undefined : Number(found);
  }

  string(): string {
    const quote = this.text[this.i];
    const start = this.i;
    let out = '';
    for (this.i++; ; this.i++) {
      const ch = this.text[this.i];
      if (ch === undefined) this.fail('string', start);
      if (ch === quote) break;
      if (ch !== '\\') {
        out += ch;
        continue;
      }
      const escape = this.text[++this.i];
      if (escape === 'u') {
        const digits = this.text.slice(this.i + 1, this.i + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(digits)) this.fail('unexpected', this.i - 1);
        out += String.fromCharCode(parseInt(digits, 16));
        this.i += 4;
      } else if (escape !== undefined && ESCAPES[escape] !== undefined) out += ESCAPES[escape];
      else this.fail(escape === undefined ? 'string' : 'unexpected', escape === undefined ? start : this.i - 1);
    }
    this.i++;
    return out;
  }

  or(): Expr {
    let left = this.and();
    for (this.space(); this.eat('||'); this.space()) {
      this.space();
      left = { t: 'or', a: left, b: this.and() };
    }
    return left;
  }

  and(): Expr {
    let left = this.basic();
    for (this.space(); this.eat('&&'); this.space()) {
      this.space();
      left = { t: 'and', a: left, b: this.basic() };
    }
    return left;
  }

  basic(): Expr {
    this.space();
    if (this.text[this.i] === '!' && this.text[this.i + 1] !== '=') {
      this.i++;
      return { t: 'not', a: this.basic() };
    }
    if (this.text[this.i] === '(') {
      this.i++;
      const inner = this.or();
      this.space();
      if (!this.eat(')')) this.fail();
      return inner;
    }
    const left = this.operand();
    this.space();
    const op = (['==', '!=', '<=', '>=', '<', '>'] as const).find((o) => this.eat(o));
    if (!op) {
      // no comparison: "@.isbn" asks whether there is such a member
      if (left.t !== 'query') this.fail();
      return { t: 'exists', query: left.query };
    }
    this.space();
    return { t: 'compare', op, left, right: this.operand() };
  }

  operand(): Operand {
    const ch = this.text[this.i];
    if (ch === '@' || ch === '$') {
      this.i++;
      return { t: 'query', query: { root: ch, segments: this.segments() } };
    }
    if (ch === "'" || ch === '"') return { t: 'literal', value: this.string() };
    for (const [word, value] of [
      ['true', true],
      ['false', false],
      ['null', null]
    ] as const)
      if (this.eat(word)) return { t: 'literal', value };
    const number = this.match(NUMBER);
    return number === null ? this.fail() : { t: 'literal', value: Number(number) };
  }
}

/** Reads a query. Throws a PathError that says where and why it is not one. */
export function parse(text: string): Query {
  const parser = new Parser(text);
  parser.space();
  if (!parser.eat('$')) throw new PathError(text.trim() ? 'start' : 'end', parser.i, text[parser.i] ?? '');
  const segments = parser.segments();
  parser.space();
  if (parser.i < text.length) parser.fail();
  return { root: '$', segments };
}

export interface Match {
  /** The way from the root to this value: member names and array indexes */
  path: (string | number)[];
  value: unknown;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function children(node: Match): Match[] {
  if (Array.isArray(node.value)) return node.value.map((value: unknown, i) => ({ path: [...node.path, i], value }));
  if (isObject(node.value)) return Object.entries(node.value).map(([name, value]) => ({ path: [...node.path, name], value }));
  return [];
}

/** The node and everything under it, in document order. */
function descendants(node: Match): Match[] {
  return [node, ...children(node).flatMap(descendants)];
}

/** Marks "no value": a query in a comparison that found nothing. Only equal to itself. */
const NOTHING = Symbol('nothing');

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => equal(item, b[i]));
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => key in b && equal(a[key], b[key]));
  }
  return false;
}

const less = (a: unknown, b: unknown) => ((typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string') ? a < b : false);

function compare(op: Operator, a: unknown, b: unknown): boolean {
  switch (op) {
    case '==':
      return equal(a, b);
    case '!=':
      return !equal(a, b);
    case '<':
      return less(a, b);
    case '>':
      return less(b, a);
    case '<=':
      return less(a, b) || equal(a, b);
    case '>=':
      return less(b, a) || equal(a, b);
  }
}

function test(expr: Expr, current: Match, root: Match): boolean {
  switch (expr.t) {
    case 'or':
      return test(expr.a, current, root) || test(expr.b, current, root);
    case 'and':
      return test(expr.a, current, root) && test(expr.b, current, root);
    case 'not':
      return !test(expr.a, current, root);
    case 'exists':
      return run(expr.query, current, root).length > 0;
    case 'compare': {
      const value = (operand: Operand) => {
        if (operand.t === 'literal') return operand.value;
        const found = run(operand.query, current, root);
        // a comparison needs one value; none, or several, compare as "nothing"
        return found.length === 1 ? found[0].value : NOTHING;
      };
      return compare(expr.op, value(expr.left), value(expr.right));
    }
  }
}

/** The items of an array that a slice start:end:step takes, as RFC 9535 defines it. */
function slice(length: number, { start, end, step = 1 }: { start?: number; end?: number; step?: number }): number[] {
  if (step === 0) return [];
  const normal = (i: number) => (i >= 0 ? i : length + i);
  const out: number[] = [];
  if (step > 0) {
    const lower = Math.min(Math.max(normal(start ?? 0), 0), length);
    const upper = Math.min(Math.max(normal(end ?? length), 0), length);
    for (let i = lower; i < upper; i += step) out.push(i);
  } else {
    const upper = Math.min(Math.max(normal(start ?? length - 1), -1), length - 1);
    const lower = Math.min(Math.max(normal(end ?? -length - 1), -1), length - 1);
    for (let i = upper; i > lower; i += step) out.push(i);
  }
  return out;
}

function select(selector: Selector, node: Match, root: Match): Match[] {
  const { value, path } = node;
  switch (selector.t) {
    case 'name':
      return isObject(value) && Object.hasOwn(value, selector.name) ? [{ path: [...path, selector.name], value: value[selector.name] }] : [];
    case 'wildcard':
      return children(node);
    case 'index': {
      if (!Array.isArray(value)) return [];
      const i = selector.index < 0 ? value.length + selector.index : selector.index;
      return i >= 0 && i < value.length ? [{ path: [...path, i], value: value[i] }] : [];
    }
    case 'slice':
      return Array.isArray(value) ? slice(value.length, selector).map((i) => ({ path: [...path, i], value: value[i] })) : [];
    case 'filter':
      return children(node).filter((child) => test(selector.expr, child, root));
  }
}

function run(query: Query, current: Match, root: Match): Match[] {
  let nodes = [query.root === '$' ? root : current];
  for (const segment of query.segments) {
    const from = segment.descendant ? nodes.flatMap(descendants) : nodes;
    nodes = from.flatMap((node) => segment.selectors.flatMap((selector) => select(selector, node, root)));
  }
  return nodes;
}

/** Every value in `document` that `query` selects, with the way to it. */
export function evaluate(query: Query, document: unknown): Match[] {
  const root: Match = { path: [], value: document };
  return run(query, root, root);
}

/** A path the way RFC 9535 writes it: $['store']['book'][0]. */
export const normalPath = (path: readonly (string | number)[]) =>
  '$' + path.map((key) => (typeof key === 'number' ? `[${key}]` : `['${key.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}']`)).join('');
