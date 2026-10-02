import { describe, expect, it } from 'vitest';
import { parse } from '../xml/logic';
import { kindOf, missesDefaultNamespace, namespaces, pathOf, type NodeLike } from './logic';

const ns = (xml: string) => {
  const parsed = parse(xml);
  if (!parsed.ok) throw new Error(parsed.error.kind);
  return namespaces(parsed.document).map((n) => `${n.prefix}=${n.uri}${n.isDefault ? ' (default)' : ''}`);
};

/** A stand-in for a DOM tree: [type, name, children…] turned into nodes that know their parent and siblings. */
type Spec = [type: number, name: string, ...children: Spec[]];
function tree(spec: Spec, parent: NodeLike | null = null): NodeLike & { children: NodeLike[] } {
  const [nodeType, nodeName, ...kids] = spec;
  const node = { nodeType, nodeName, parentNode: parent, previousSibling: null, nextSibling: null, children: [] as NodeLike[] } as NodeLike & {
    children: NodeLike[];
  };
  node.children = kids.map((kid) => tree(kid, node));
  node.children.forEach((child, i) => {
    child.previousSibling = node.children[i - 1] ?? null;
    child.nextSibling = node.children[i + 1] ?? null;
  });
  return node;
}
const find = (node: NodeLike & { children?: NodeLike[] }, ...indexes: number[]): NodeLike =>
  indexes.reduce((n, i) => (n as NodeLike & { children: NodeLike[] }).children[i], node as NodeLike);

describe('namespaces', () => {
  it('lists the prefixes a document declares, anywhere in it', () => {
    expect(ns('<soap:Envelope xmlns:soap="urn:soap"><soap:Body><m:Get xmlns:m="urn:m"/></soap:Body></soap:Envelope>')).toEqual(['soap=urn:soap', 'm=urn:m']);
  });

  it('makes up a prefix for a default namespace', () => {
    expect(ns('<order xmlns="urn:orders"><line/></order>')).toEqual(['d=urn:orders (default)']);
  });

  it('gives each default namespace its own prefix, and avoids prefixes the document uses', () => {
    expect(ns('<a xmlns="urn:one" xmlns:d="urn:taken"><b xmlns="urn:two"/></a>')).toEqual(['d=urn:taken', 'd2=urn:one (default)', 'd3=urn:two (default)']);
  });

  it('lists a namespace once, and ignores xmlns="" (no namespace)', () => {
    expect(ns('<a xmlns="urn:one" xmlns:x="urn:x"><b xmlns="urn:one" xmlns:x="urn:x"><c xmlns=""/></b></a>')).toEqual(['x=urn:x', 'd=urn:one (default)']);
  });

  it('gives nothing for a document without namespaces', () => {
    expect(ns('<a b="1"><c/></a>')).toEqual([]);
  });
});

describe('pathOf', () => {
  // <order><lines><line/><!-- c --><line>text<![CDATA[x]]></line><note/></lines></order>
  const doc = tree([9, '#document', [1, 'order', [1, 'lines', [1, 'line'], [8, '#comment'], [1, 'line', [3, '#text'], [4, '#cdata-section']], [1, 'note']]]]);

  it('writes names, with a position only where there are siblings of the same name', () => {
    expect(pathOf(doc)).toBe('/');
    expect(pathOf(find(doc, 0))).toBe('/order');
    expect(pathOf(find(doc, 0, 0))).toBe('/order/lines');
    expect(pathOf(find(doc, 0, 0, 0))).toBe('/order/lines/line[1]');
    expect(pathOf(find(doc, 0, 0, 2))).toBe('/order/lines/line[2]');
    expect(pathOf(find(doc, 0, 0, 3))).toBe('/order/lines/note');
  });

  it('writes text, comments and instructions as their node tests', () => {
    expect(pathOf(find(doc, 0, 0, 1))).toBe('/order/lines/comment()');
    // text and CDATA are both text() to XPath, so they count together
    expect(pathOf(find(doc, 0, 0, 2, 0))).toBe('/order/lines/line[2]/text()[1]');
    expect(pathOf(find(doc, 0, 0, 2, 1))).toBe('/order/lines/line[2]/text()[2]');
    expect(pathOf(tree([9, '#document', [7, 'xml-stylesheet'], [1, 'a']]).children[0])).toBe("/processing-instruction('xml-stylesheet')");
  });

  it('writes an attribute after the element it is on', () => {
    const line = find(doc, 0, 0, 2);
    const attribute: NodeLike = { nodeType: 2, nodeName: 'sku', parentNode: null, previousSibling: null, nextSibling: null, ownerElement: line };
    expect(pathOf(attribute)).toBe('/order/lines/line[2]/@sku');
  });

  it('keeps prefixes as written', () => {
    const soap = tree([9, '#document', [1, 'soap:Envelope', [1, 'soap:Body']]]);
    expect(pathOf(find(soap, 0, 0))).toBe('/soap:Envelope/soap:Body');
  });
});

describe('kindOf', () => {
  it('names the kinds of node', () => {
    const node = (nodeType: number): NodeLike => ({ nodeType, nodeName: 'x', parentNode: null, previousSibling: null, nextSibling: null });
    expect([1, 2, 3, 4, 7, 8, 9].map((type) => kindOf(node(type)))).toEqual(['element', 'attribute', 'text', 'text', 'instruction', 'comment', 'document']);
  });
});

describe('missesDefaultNamespace', () => {
  const all = [
    { prefix: 'soap', uri: 'urn:soap', isDefault: false },
    { prefix: 'd', uri: 'urn:orders', isDefault: true }
  ];

  it('is true when the document has a default namespace and the query does not use its prefix', () => {
    expect(missesDefaultNamespace('//line', all)).toBe(true);
    expect(missesDefaultNamespace('//soap:Body/line', all)).toBe(true);
    expect(missesDefaultNamespace('//d:line', all)).toBe(false);
  });

  it('is false when there is no default namespace', () => {
    expect(missesDefaultNamespace('//line', all.slice(0, 1))).toBe(false);
    expect(missesDefaultNamespace('//line', [])).toBe(false);
  });
});
