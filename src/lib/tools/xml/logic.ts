/**
 * XML, read by a parser of its own: it checks that a document is well-formed and says where and why it is not,
 * with line and column. The browser's own parser only says "error" in a place that differs per browser.
 * It reads XML 1.0 without validating: a DOCTYPE is kept but not interpreted.
 */

export interface Attribute {
  name: string;
  /** As written between the quotes: entities are not replaced */
  value: string;
  quote: '"' | "'";
}

export interface Element {
  type: 'element';
  name: string;
  attributes: Attribute[];
  children: Node[];
  /** Written as <a/> */
  selfClosing: boolean;
  line: number;
  column: number;
}

export type Node =
  | Element
  /** As written: entities are not replaced */
  | { type: 'text'; value: string }
  | { type: 'cdata'; value: string }
  | { type: 'comment'; value: string }
  | { type: 'instruction'; target: string; value: string }
  | { type: 'doctype'; value: string };

export interface Document {
  /** The <?xml … ?> line as written, if there is one */
  declaration: string | null;
  /** Everything at the top: comments, instructions, a doctype, and the one root element */
  children: Node[];
  root: Element;
}

export type ErrorKind =
  | 'empty'
  /** no element at all */
  | 'noRoot'
  /** a second element, or text, after the root element has ended */
  | 'afterRoot'
  /** text before the root element */
  | 'beforeRoot'
  /** the document ends while an element is still open */
  | 'unclosed'
  /** a closing tag for another element than the one that is open */
  | 'mismatch'
  /** a closing tag while nothing is open */
  | 'strayClose'
  /** something starting with < that is not a tag, or a tag that never ends */
  | 'tag'
  | 'name'
  /** an attribute without ="…" */
  | 'attribute'
  | 'duplicateAttribute'
  /** a < inside an attribute value */
  | 'attributeLt'
  /** an & that does not start an entity like &amp; */
  | 'ampersand'
  /** a comment, CDATA section or instruction that never ends */
  | 'unterminated'
  /** -- inside a comment */
  | 'comment'
  /** <?xml … ?> anywhere but at the very start */
  | 'declaration';

export interface XmlError {
  kind: ErrorKind;
  /** From 1 */
  line: number;
  column: number;
  /** What it is about: the name of an element or attribute */
  name: string;
  /** For 'mismatch' and 'unclosed': the element that is open, and where it was opened */
  open?: { name: string; line: number };
}

export type Parsed = { ok: true; document: Document } | { ok: false; error: XmlError };

class Failure extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly position: number,
    readonly detail: { name?: string; open?: Element } = {}
  ) {
    super(kind);
  }
}

/** A name: no spaces or markup characters, and not starting with a digit, a dash or a dot. */
const NAME = /[^\s<>/=?!"'&;]+/y;
const validName = (name: string) => !/^[0-9.-]/.test(name);
const ENTITY = /&(?:[A-Za-z_:][\w.:-]*|#[0-9]+|#x[0-9a-fA-F]+);/y;

class Parser {
  i = 0;
  constructor(readonly text: string) {}

  fail(kind: ErrorKind, position = this.i, detail: { name?: string; open?: Element } = {}): never {
    throw new Failure(kind, position, detail);
  }

  place(position: number) {
    const before = this.text.slice(0, position);
    return { line: before.split('\n').length, column: position - before.lastIndexOf('\n') };
  }

  space(): boolean {
    const start = this.i;
    while (' \t\n\r'.includes(this.text[this.i] ?? 'x')) this.i++;
    return this.i > start;
  }

  name(): string {
    NAME.lastIndex = this.i;
    const found = NAME.exec(this.text)?.[0];
    if (!found || !validName(found)) this.fail('name');
    this.i += found.length;
    return found;
  }

  /** Reads up to and including `end`, and gives what is before it. */
  until(end: string, from: number): string {
    const at = this.text.indexOf(end, this.i);
    if (at === -1) this.fail('unterminated', from);
    const value = this.text.slice(this.i, at);
    this.i = at + end.length;
    return value;
  }

  /** Every & in text or an attribute value has to start an entity. */
  checkEntities(from: number, to: number): void {
    for (let at = this.text.indexOf('&', from); at !== -1 && at < to; at = this.text.indexOf('&', at + 1)) {
      ENTITY.lastIndex = at;
      if (!ENTITY.test(this.text)) this.fail('ampersand', at);
    }
  }

  /** Anything that starts with <! or <? */
  special(): Node {
    const start = this.i;
    if (this.text.startsWith('<!--', this.i)) {
      this.i += 4;
      const value = this.until('-->', start);
      const dashes = value.indexOf('--');
      if (dashes !== -1 || value.endsWith('-')) this.fail('comment', start + 4 + (dashes === -1 ? value.length - 1 : dashes));
      return { type: 'comment', value };
    }
    if (this.text.startsWith('<![CDATA[', this.i)) {
      this.i += 9;
      return { type: 'cdata', value: this.until(']]>', start) };
    }
    if (this.text.startsWith('<?', this.i)) {
      this.i += 2;
      const target = this.name();
      if (target.toLowerCase() === 'xml') this.fail('declaration', start);
      this.space();
      return { type: 'instruction', target, value: this.until('?>', start) };
    }
    if (/^<!DOCTYPE/i.test(this.text.slice(this.i, this.i + 9))) {
      // up to the closing >, skipping an internal subset between [ ] and quoted text
      let depth = 0;
      let quote = '';
      for (this.i += 9; this.i < this.text.length; this.i++) {
        const ch = this.text[this.i];
        if (quote) {
          if (ch === quote) quote = '';
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '[') depth++;
        else if (ch === ']') depth--;
        else if (ch === '>' && depth === 0) {
          this.i++;
          return { type: 'doctype', value: this.text.slice(start, this.i) };
        }
      }
      this.fail('unterminated', start);
    }
    return this.fail('tag', start);
  }

  element(): Element {
    const start = this.i;
    this.i++;
    const { line, column } = this.place(start);
    const element: Element = { type: 'element', name: this.name(), attributes: [], children: [], selfClosing: false, line, column };

    for (;;) {
      const spaced = this.space();
      const ch = this.text[this.i];
      if (ch === undefined) this.fail('tag', start, { name: element.name });
      if (ch === '>') {
        this.i++;
        break;
      }
      if (ch === '/' && this.text[this.i + 1] === '>') {
        this.i += 2;
        element.selfClosing = true;
        return element;
      }
      if (!spaced) this.fail('tag', this.i, { name: element.name });
      const at = this.i;
      const name = this.name();
      this.space();
      if (this.text[this.i] !== '=') this.fail('attribute', at, { name });
      this.i++;
      this.space();
      const quote = this.text[this.i];
      if (quote !== '"' && quote !== "'") this.fail('attribute', at, { name });
      const from = ++this.i;
      const end = this.text.indexOf(quote, from);
      if (end === -1) this.fail('attribute', at, { name });
      const lt = this.text.indexOf('<', from);
      if (lt !== -1 && lt < end) this.fail('attributeLt', lt, { name });
      this.checkEntities(from, end);
      if (element.attributes.some((a) => a.name === name)) this.fail('duplicateAttribute', at, { name });
      element.attributes.push({ name, value: this.text.slice(from, end), quote });
      this.i = end + 1;
    }

    element.children = this.content(element);
    return element;
  }

  /** The children of `parent` up to its closing tag; with no parent, everything at the top of the document. */
  content(parent: Element | null): Node[] {
    const nodes: Node[] = [];
    for (;;) {
      const lt = this.text.indexOf('<', this.i);
      const end = lt === -1 ? this.text.length : lt;
      if (end > this.i) {
        this.checkEntities(this.i, end);
        nodes.push({ type: 'text', value: this.text.slice(this.i, end) });
        this.i = end;
      }
      if (lt === -1) {
        if (parent) this.fail('unclosed', this.text.length, { name: parent.name, open: parent });
        return nodes;
      }
      const next = this.text[this.i + 1];
      if (next === '/') {
        const at = this.i;
        this.i += 2;
        const name = this.name();
        this.space();
        if (this.text[this.i] !== '>') this.fail('tag', at, { name });
        this.i++;
        if (!parent) this.fail('strayClose', at, { name });
        if (name !== parent.name) this.fail('mismatch', at, { name, open: parent });
        return nodes;
      }
      if (next === '!' || next === '?') nodes.push(this.special());
      else nodes.push(this.element());
    }
  }

  document(): Document {
    let declaration: string | null = null;
    if (this.text.startsWith('<?xml') && /\s|\?/.test(this.text[5] ?? '')) {
      const end = this.text.indexOf('?>');
      if (end === -1) this.fail('unterminated', 0);
      declaration = this.text.slice(0, end + 2);
      this.i = end + 2;
    }
    const start = this.i;
    const children = this.content(null).filter((node) => node.type !== 'text' || node.value.trim() !== '');
    const roots = children.filter((node): node is Element => node.type === 'element');
    const text = children.find((node) => node.type === 'text' || node.type === 'cdata');
    if (!roots.length) this.fail(this.text.trim() ? (text ? 'beforeRoot' : 'noRoot') : 'empty', text ? this.firstTextPosition(start) : 0);
    if (text) {
      const before = children.indexOf(text) < children.indexOf(roots[0]);
      this.fail(before ? 'beforeRoot' : 'afterRoot', before ? this.firstTextPosition(start) : this.afterRootPosition(roots[0]));
    }
    if (roots.length > 1) this.fail('afterRoot', this.offset(roots[1]), { name: roots[1].name });
    return { declaration, children, root: roots[0] };
  }

  offset(element: Element): number {
    return (
      this.text
        .split('\n')
        .slice(0, element.line - 1)
        .reduce((sum, line) => sum + line.length + 1, 0) +
      element.column -
      1
    );
  }

  /** Where the first text outside the root element starts. */
  firstTextPosition(from: number): number {
    const match = /\S/.exec(this.text.slice(from));
    return from + (match?.index ?? 0);
  }

  /** Where the first non-whitespace after the root element's end is: that is what should not be there. */
  afterRootPosition(root: Element): number {
    // parse the root again from its start to find where it ends
    const again = new Parser(this.text);
    again.i = this.offset(root);
    again.element();
    const rest = /[^\s<]|<(?![!?])/.exec(this.text.slice(again.i));
    return again.i + (rest?.index ?? 0);
  }
}

/** Reads an XML document, or says where and why it is not well-formed. */
export function parse(text: string): Parsed {
  // a byte order mark in front is not part of the document
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const parser = new Parser(source);
  try {
    return { ok: true, document: parser.document() };
  } catch (e) {
    if (!(e instanceof Failure)) throw e;
    const open = e.detail.open;
    return {
      ok: false,
      error: { kind: e.kind, ...parser.place(e.position), name: e.detail.name ?? '', open: open && { name: open.name, line: open.line } }
    };
  }
}

const startTag = (e: Element) => `<${e.name}${e.attributes.map((a) => ` ${a.name}=${a.quote}${a.value}${a.quote}`).join('')}`;
const isSpace = (node: Node) => node.type === 'text' && node.value.trim() === '';

/** One node as text, without changing anything inside it. */
function raw(node: Node): string {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'cdata':
      return `<![CDATA[${node.value}]]>`;
    case 'comment':
      return `<!--${node.value}-->`;
    case 'instruction':
      return `<?${node.target}${node.value ? ` ${node.value}` : ''}?>`;
    case 'doctype':
      return node.value;
    case 'element':
      return node.selfClosing ? `${startTag(node)}/>` : `${startTag(node)}>${node.children.map(raw).join('')}</${node.name}>`;
  }
}

/** xml:space="preserve" on an element says its whitespace matters: it is left exactly as it is. */
const preserves = (e: Element) => e.attributes.some((a) => a.name === 'xml:space' && a.value === 'preserve');

function layout(node: Node, indent: string, depth: number): string {
  const pad = indent.repeat(depth);
  if (node.type !== 'element') return pad + raw(node).trim();
  if (node.selfClosing) return `${pad}${startTag(node)}/>`;
  const children = node.children.filter((child) => !isSpace(child));
  if (!children.length) return `${pad}${startTag(node)}></${node.name}>`;
  const hasText = children.some((child) => child.type === 'text' || child.type === 'cdata');
  // text mixed with elements (<p>a <b>b</b> c</p>) is content: adding line breaks would change it
  if (preserves(node) || (hasText && children.length > 1)) return pad + raw(node);
  if (hasText) return `${pad}${startTag(node)}>${raw(children[0]).trim()}</${node.name}>`;
  return `${pad}${startTag(node)}>\n${children.map((child) => layout(child, indent, depth + 1)).join('\n')}\n${pad}</${node.name}>`;
}

function compact(node: Node): string {
  if (node.type !== 'element') return raw(node);
  if (node.selfClosing) return `${startTag(node)}/>`;
  const hasText = node.children.some((child) => (child.type === 'text' && !isSpace(child)) || child.type === 'cdata');
  // whitespace between elements goes; whitespace next to text stays, it may be part of the text
  const children = preserves(node) || hasText ? node.children : node.children.filter((child) => !isSpace(child));
  return `${startTag(node)}>${children.map((child) => (preserves(node) ? raw(child) : compact(child))).join('')}</${node.name}>`;
}

/** The document laid out for reading. `indent` is what one level is indented with; null removes the layout instead. */
export function format(document: Document, indent: string | null = '  '): string {
  const parts = [
    ...(document.declaration ? [document.declaration] : []),
    ...document.children.map((node) => (indent === null ? compact(node) : layout(node, indent, 0)))
  ];
  return parts.join(indent === null ? '' : '\n');
}

export interface Stats {
  elements: number;
  attributes: number;
  /** How deep the deepest element is; the root is 1 */
  depth: number;
}

export function stats(document: Document): Stats {
  const out: Stats = { elements: 0, attributes: 0, depth: 0 };
  const walk = (element: Element, depth: number) => {
    out.elements++;
    out.attributes += element.attributes.length;
    out.depth = Math.max(out.depth, depth);
    for (const child of element.children) if (child.type === 'element') walk(child, depth + 1);
  };
  walk(document.root, 1);
  return out;
}

const PREDEFINED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Text or an attribute value with its entities replaced: the five predefined ones and numeric ones. Others are left as written. */
export const decode = (value: string) =>
  value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z_:][\w.:-]*);/g, (whole, body: string) => {
    if (!body.startsWith('#')) return PREDEFINED[body] ?? whole;
    const code = body[1] === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });

/** Text made safe to put into XML: & and < always, and the quote in use inside an attribute value. */
export const encode = (value: string, quote?: '"' | "'") =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/["']/g, (ch) => (ch === quote ? (ch === '"' ? '&quot;' : '&apos;') : ch));
