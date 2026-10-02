import type { Document, Element } from '../xml/logic';

/**
 * The parts of the XPath tester that need no browser: which namespaces a document declares, and where a node that was
 * found sits in the document. The query itself is run by the browser's own XPath 1.0 engine (document.evaluate).
 */

export interface Namespace {
  /** The prefix to use in a query */
  prefix: string;
  uri: string;
  /** Declared as xmlns="…" without a prefix: the prefix here was made up, because XPath has no default namespace */
  isDefault: boolean;
}

/**
 * Every namespace the document declares, anywhere, with a prefix to use in a query. Elements in a default namespace
 * (xmlns="…") can only be found with a prefix, so one is made up for them: d, then d2, d3, …
 */
export function namespaces(document: Document): Namespace[] {
  const declared: Namespace[] = [];
  const walk = (element: Element) => {
    for (const { name, value } of element.attributes) {
      if (name !== 'xmlns' && !name.startsWith('xmlns:')) continue;
      const prefix = name === 'xmlns' ? '' : name.slice(6);
      // xmlns="" switches the default namespace off again: nothing to bind
      if (value === '' || declared.some((n) => (n.isDefault ? prefix === '' : n.prefix === prefix) && n.uri === value)) continue;
      declared.push({ prefix, uri: value, isDefault: prefix === '' });
    }
    for (const child of element.children) if (child.type === 'element') walk(child);
  };
  walk(document.root);

  // the document's own prefixes first; the same prefix bound to another URI further down loses to the first
  const out: Namespace[] = [];
  for (const ns of declared) if (!ns.isDefault && !out.some((o) => o.prefix === ns.prefix)) out.push(ns);
  const taken = new Set(out.map((n) => n.prefix));
  for (const ns of declared) {
    if (!ns.isDefault) continue;
    let prefix = 'd';
    for (let n = 2; taken.has(prefix); n++) prefix = `d${n}`;
    taken.add(prefix);
    out.push({ ...ns, prefix });
  }
  return out;
}

/** What the tester needs to know of a DOM node. The browser's nodes fit; so do the stand-ins in the tests. */
export interface NodeLike {
  /** 1 element, 2 attribute, 3 text, 4 CDATA, 7 processing instruction, 8 comment, 9 document */
  nodeType: number;
  /** The name as written, with its prefix */
  nodeName: string;
  parentNode: NodeLike | null;
  previousSibling: NodeLike | null;
  nextSibling: NodeLike | null;
  /** For an attribute: the element it is on */
  ownerElement?: NodeLike | null;
}

export type Kind = 'element' | 'attribute' | 'text' | 'comment' | 'instruction' | 'document';

export const kindOf = (node: NodeLike): Kind =>
  (({ 1: 'element', 2: 'attribute', 3: 'text', 4: 'text', 7: 'instruction', 8: 'comment', 9: 'document' }) as Record<number, Kind>)[node.nodeType] ?? 'element';

/** The same kind of node for the position count: both text and CDATA are text() to XPath. */
const alike = (a: NodeLike, b: NodeLike) =>
  a.nodeType === 1 ? b.nodeType === 1 && b.nodeName === a.nodeName : kindOf(a) === kindOf(b) && (a.nodeType !== 7 || a.nodeName === b.nodeName);

/**
 * Where a node is, written as a path of names and positions: /order/lines/line[2]/@sku. A position is only written
 * when the node has siblings of the same name. The names are as written in the document, so the path is for reading,
 * not for running against a document with a default namespace.
 */
export function pathOf(node: NodeLike): string {
  if (node.nodeType === 9) return '/';
  if (node.nodeType === 2) return `${node.ownerElement ? pathOf(node.ownerElement) : ''}/@${node.nodeName}`;
  const step = { text: 'text()', comment: 'comment()', instruction: `processing-instruction('${node.nodeName}')` }[kindOf(node) as string] ?? node.nodeName;
  let before = 0;
  for (let s = node.previousSibling; s; s = s.previousSibling) if (alike(node, s)) before++;
  let after = false;
  for (let s = node.nextSibling; s && !after; s = s.nextSibling) after = alike(node, s);
  const parent = node.parentNode && node.parentNode.nodeType !== 9 ? pathOf(node.parentNode) : '';
  return `${parent}/${step}${before || after ? `[${before + 1}]` : ''}`;
}

/**
 * Whether a query that found nothing may have missed because of a default namespace: the document has one, and the
 * query uses none of the prefixes that stand for it.
 */
export const missesDefaultNamespace = (query: string, all: readonly Namespace[]) => {
  const defaults = all.filter((n) => n.isDefault);
  return defaults.length > 0 && !defaults.some((n) => query.includes(`${n.prefix}:`));
};
