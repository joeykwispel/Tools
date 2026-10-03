/**
 * Making an SVG smaller without changing the picture: what an editor leaves behind goes, numbers lose the decimals
 * nobody sees. And the SVG as a data URI, for a stylesheet or an <img>. The XML itself is read by the parser of the
 * XML formatter.
 */
import { encodeText } from '../base64/logic';
import { format, parse, type Attribute, type Document, type Element, type Node, type XmlError } from '../xml/logic';

export interface Options {
  /** Comments go, except the ones that start with ! (licences) */
  comments: boolean;
  /** The <?xml ?> line, the doctype, instructions and <metadata> go */
  metadata: boolean;
  /** Elements and attributes of drawing programs go, and namespaces nothing uses */
  editor: boolean;
  /** Groups and <defs> without anything in them go */
  empty: boolean;
  /** Everything on one line; otherwise laid out with two spaces */
  oneLine: boolean;
  /** How many decimals a number keeps; null leaves numbers as written */
  precision: number | null;
}

export const DEFAULTS: Options = { comments: true, metadata: true, editor: true, empty: true, oneLine: true, precision: 3 };

export type Result =
  { ok: true; svg: string; before: Document; after: Document } | { ok: false; reason: 'xml'; error: XmlError } | { ok: false; reason: 'root'; name: string };

const SVG = 'http://www.w3.org/2000/svg';

/** Where the namespaces of drawing programs start: Inkscape, Illustrator, Sketch, Figma, Affinity and Vectornator. */
const EDITORS = [
  'http://www.inkscape.org/namespaces/',
  'http://sodipodi.sourceforge.net/',
  'http://ns.adobe.com/',
  'http://www.bohemiancoding.com/sketch/',
  'http://www.figma.com/figma/',
  'http://www.serif.com/',
  'http://vectornator.io'
];

/** Elements that draw nothing when there is nothing in them. */
const CONTAINERS = new Set(['g', 'defs']);

/** Attributes that hold a number, or a list of them. */
const NUMERIC = new Set(
  (
    'x y x1 y1 x2 y2 cx cy r rx ry fx fy width height dx dy offset opacity fill-opacity stroke-opacity stop-opacity stroke-width ' +
    'stroke-miterlimit stroke-dashoffset stroke-dasharray font-size letter-spacing word-spacing points viewBox transform ' +
    'gradientTransform patternTransform stdDeviation'
  ).split(' ')
);

const prefixOf = (name: string) => (name.includes(':') ? name.slice(0, name.indexOf(':')) : '');
const isSpace = (node: Node) => node.type === 'text' && node.value.trim() === '';

/** A number with at most `precision` decimals, written as short as SVG allows: .5 and not 0.5. */
export function short(value: number, precision: number): string {
  const text = String(Number(value.toFixed(precision)));
  return text.replace(/^(-?)0\./, '$1.');
}

const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/** The numbers in a value like "0 0 24.000 24.000" or "translate(1.2345, 5)" rounded; everything else stays. */
export function roundList(value: string, precision: number): string {
  return value
    .replace(NUMBER, (number, at: number) => {
      const rounded = short(Number(number), precision);
      // 1.04.5 is two numbers: without a space the rounded 1 and .5 would become one
      return at > 0 && /[\d.]/.test(value[at - 1]) && !rounded.startsWith('-') ? ` ${rounded}` : rounded;
    })
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

/** How many numbers each path command takes. */
const ARGUMENTS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/**
 * Path data with its numbers rounded and written as short as it goes. Read command by command, because the two flags
 * of an arc may be written against the next number (a1 1 0 01.5.5). Null when the path can not be read: it is left alone.
 */
export function roundPath(d: string, precision: number): string | null {
  const number = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/iy;
  const skip = /[\s,]*/y;
  let i = 0;
  let out = '';
  const space = () => {
    skip.lastIndex = i;
    skip.exec(d);
    i = skip.lastIndex;
  };
  space();
  if (i < d.length && d[i].toLowerCase() !== 'm') return null;
  while (i < d.length) {
    const command = d[i++];
    const count = ARGUMENTS[command.toLowerCase()];
    if (count === undefined) return null;
    out += command;
    let last = '';
    let sets = 0;
    for (space(); count > 0 && i < d.length && /[-+.\d]/.test(d[i]); space()) {
      for (let n = 0; n < count; n++) {
        space();
        let next: string;
        if (command.toLowerCase() === 'a' && (n === 3 || n === 4)) {
          if (d[i] !== '0' && d[i] !== '1') return null;
          next = d[i++];
        } else {
          number.lastIndex = i;
          const found = number.exec(d);
          if (!found) return null;
          i = number.lastIndex;
          next = short(Number(found[0]), precision);
        }
        // a minus sign separates by itself, and so does the dot of .5 after a number that already has one
        const touching = next.startsWith('-') || (next.startsWith('.') && last.includes('.'));
        out += last && !touching ? ` ${next}` : next;
        last = next;
      }
      sets++;
    }
    if (count > 0 && sets === 0) return null;
  }
  return out;
}

function round(attribute: Attribute, precision: number): Attribute {
  // an entity in the value is left alone: what it stands for is not known here
  if (attribute.value.includes('&')) return attribute;
  if (attribute.name === 'd') return { ...attribute, value: roundPath(attribute.value, precision) ?? attribute.value };
  return NUMERIC.has(attribute.name) ? { ...attribute, value: roundList(attribute.value, precision) } : attribute;
}

/** Every element of a tree, the one given first. */
function* elements(element: Element): Generator<Element> {
  yield element;
  for (const child of element.children) if (child.type === 'element') yield* elements(child);
}

/** The prefixes that stand for the namespace of a drawing program in this document. */
function editorPrefixes(root: Element): Set<string> {
  const found = new Set<string>();
  for (const element of elements(root))
    for (const { name, value } of element.attributes)
      if (name.startsWith('xmlns:') && EDITORS.some((start) => value.startsWith(start))) found.add(name.slice(6));
  return found;
}

function clean(node: Node, options: Options, editor: Set<string>): Node[] {
  switch (node.type) {
    case 'comment':
      return options.comments && !node.value.startsWith('!') ? [] : [node];
    case 'instruction':
      return options.metadata ? [] : [node];
    case 'doctype':
      // a doctype that defines entities is needed to read the document
      return options.metadata && !/<!ENTITY/i.test(node.value) ? [] : [node];
    case 'element': {
      if (options.metadata && node.name === 'metadata') return [];
      if (options.editor && editor.has(prefixOf(node.name))) return [];
      const attributes = node.attributes
        .filter((a) => !(options.editor && (editor.has(prefixOf(a.name)) || (a.name.startsWith('xmlns:') && editor.has(a.name.slice(6))))))
        .map((a) => (options.precision === null ? a : round(a, options.precision)));
      const children = node.children.flatMap((child) => clean(child, options, editor));
      if (options.empty && CONTAINERS.has(node.name) && children.every(isSpace)) return [];
      return [{ ...node, attributes, children, selfClosing: children.length === 0 }];
    }
    default:
      return [node];
  }
}

/** Without the xmlns:… declarations of prefixes that no element or attribute uses. */
function withoutUnusedNamespaces(root: Element): Element {
  const used = new Set<string>();
  for (const element of elements(root)) {
    used.add(prefixOf(element.name));
    for (const { name } of element.attributes) if (!name.startsWith('xmlns:')) used.add(prefixOf(name));
  }
  const strip = (element: Element): Element => ({
    ...element,
    attributes: element.attributes.filter((a) => !a.name.startsWith('xmlns:') || used.has(a.name.slice(6))),
    children: element.children.map((child) => (child.type === 'element' ? strip(child) : child))
  });
  return strip(root);
}

/** The SVG made smaller, or why it could not be read. */
export function optimise(text: string, options: Options = DEFAULTS): Result {
  const parsed = parse(text);
  if (!parsed.ok) return { ok: false, reason: 'xml', error: parsed.error };
  const before = parsed.document;
  if (before.root.name !== 'svg' && !before.root.name.endsWith(':svg')) return { ok: false, reason: 'root', name: before.root.name };

  const editor = editorPrefixes(before.root);
  let root = before.root;
  const children = before.children.flatMap((node) => {
    if (node !== before.root) return clean(node, options, editor);
    // <svg> is not something clean() takes away, so this is the root again
    root = clean(node, options, editor)[0] as Element;
    if (options.editor) root = withoutUnusedNamespaces(root);
    return [root];
  });
  const after: Document = { declaration: options.metadata ? null : before.declaration, children, root };
  return { ok: true, svg: format(after, options.oneLine ? null : '  '), before, after };
}

/** How many bytes a text is as UTF-8: what it takes in a file. */
export const bytes = (text: string) => new TextEncoder().encode(text).length;

/** How much smaller `after` is than `before`, in whole percent; 0 when it is not smaller. */
export const saved = (before: number, after: number) => (before > 0 && after < before ? Math.round((1 - after / before) * 100) : 0);

/** Only what has to be escaped in a data URI is: the rest stays readable, and shorter than Base64. */
const escape = (text: string) =>
  text.replace(/[^\w \-.!~*'();/?:@=+$,]/gu, (char) => {
    try {
      return encodeURIComponent(char);
    } catch {
      // half of a surrogate pair: there is no character to write
      return '%EF%BF%BD';
    }
  });

/**
 * The document as a data URI, for src="…" or url("…"). An image needs the SVG namespace on its root, so it is added
 * when it is missing. Escaped as text unless `base64`; then attribute values get single quotes where that is possible,
 * which saves a %22 for each.
 */
export function dataUri(document: Document, base64 = false): string {
  const quotes = (element: Element): Element => ({
    ...element,
    attributes: element.attributes.map((a) => (!base64 && a.quote === '"' && !a.value.includes("'") ? { ...a, quote: "'" as const } : a)),
    children: element.children.map((child) => (child.type === 'element' ? quotes(child) : child))
  });
  let root = quotes(document.root);
  if (!prefixOf(root.name) && !root.attributes.some((a) => a.name === 'xmlns'))
    root = { ...root, attributes: [{ name: 'xmlns', value: SVG, quote: base64 ? '"' : "'" }, ...root.attributes] };
  const svg = format({ ...document, root, children: document.children.map((node) => (node === document.root ? root : node)) }, null);
  return base64 ? `data:image/svg+xml;base64,${encodeText(svg)}` : `data:image/svg+xml,${escape(svg)}`;
}
