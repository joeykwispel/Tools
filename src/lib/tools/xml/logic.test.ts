import { describe, expect, it } from 'vitest';
import { decode, encode, format, parse, stats, type Document } from './logic';

const document = (text: string): Document => {
  const parsed = parse(text);
  if (!parsed.ok) throw new Error(`${parsed.error.kind} at ${parsed.error.line}:${parsed.error.column}`);
  return parsed.document;
};
const error = (text: string) => {
  const parsed = parse(text);
  return parsed.ok ? 'ok' : `${parsed.error.kind} ${parsed.error.line}:${parsed.error.column}${parsed.error.name ? ` ${parsed.error.name}` : ''}`;
};

describe('parse', () => {
  it('reads elements, attributes, text and everything else a document can hold', () => {
    const doc = document(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE note [<!ENTITY x "y">]>
<!-- a note -->
<note id="1" lang='nl'>
  <to>Ada &amp; Bob</to>
  <body><![CDATA[<b>raw</b> & more]]></body>
  <?page break?>
  <empty/>
</note>`);
    expect(doc.declaration).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    expect(doc.children.map((n) => n.type)).toEqual(['doctype', 'comment', 'element']);
    expect(doc.root.name).toBe('note');
    expect(doc.root.attributes).toEqual([
      { name: 'id', value: '1', quote: '"' },
      { name: 'lang', value: 'nl', quote: "'" }
    ]);
    const elements = doc.root.children.filter((n) => n.type === 'element');
    expect(elements.map((e) => e.type === 'element' && e.name)).toEqual(['to', 'body', 'empty']);
    expect(doc.root.children.find((n) => n.type === 'instruction')).toEqual({ type: 'instruction', target: 'page', value: 'break' });
    expect(elements[1].type === 'element' && elements[1].children).toEqual([{ type: 'cdata', value: '<b>raw</b> & more' }]);
    expect(elements[2].type === 'element' && elements[2].selfClosing).toBe(true);
  });

  it('knows where each element starts', () => {
    const doc = document('<a>\n  <b/>\n</a>');
    expect([doc.root.line, doc.root.column]).toEqual([1, 1]);
    const b = doc.root.children.find((n) => n.type === 'element');
    expect(b?.type === 'element' && [b.line, b.column]).toEqual([2, 3]);
  });

  it('accepts namespaces, dashes, dots and non-ASCII names, and a byte order mark in front', () => {
    expect(error(`${String.fromCharCode(0xfeff)}<soap:Envelope xmlns:soap="x"><my-el.v2 attr_1="a"/><straße/></soap:Envelope>`)).toBe('ok');
  });

  it('says what is wrong, and where', () => {
    expect(error('')).toBe('empty 1:1');
    expect(error('   \n ')).toBe('empty 1:1');
    expect(error('<!-- only a comment -->')).toBe('noRoot 1:1');
    expect(error('<a><b></a>')).toBe('mismatch 1:7 a');
    expect(error('<a>\n  <b>\n</a>')).toBe('mismatch 3:1 a');
    expect(error('<a><b>')).toBe('unclosed 1:7 b');
    expect(error('<a>text')).toBe('unclosed 1:8 a');
    expect(error('</a>')).toBe('strayClose 1:1 a');
    expect(error('<a/><b/>')).toBe('afterRoot 1:5 b');
    expect(error('<a/> trailing')).toBe('afterRoot 1:6');
    expect(error('hello <a/>')).toBe('beforeRoot 1:1');
    expect(error('<a b></a>')).toBe('attribute 1:4 b');
    expect(error('<a b=c></a>')).toBe('attribute 1:4 b');
    expect(error('<a b="c></a>')).toBe('attribute 1:4 b');
    expect(error('<a b="1" b="2"/>')).toBe('duplicateAttribute 1:10 b');
    expect(error('<a b="x<y"/>')).toBe('attributeLt 1:8 b');
    expect(error('<a>fish & chips</a>')).toBe('ampersand 1:9');
    expect(error('<a b="x&y"/>')).toBe('ampersand 1:8');
    expect(error('<a>&amp;&#38;&#x26;&custom;</a>')).toBe('ok');
    expect(error('<a><!-- open</a>')).toBe('unterminated 1:4');
    expect(error('<a><![CDATA[ open</a>')).toBe('unterminated 1:4');
    expect(error('<a><!-- a -- b --></a>')).toBe('comment 1:11');
    expect(error('<a>\n<?xml version="1.0"?></a>')).toBe('declaration 2:1');
    expect(error('<1a/>')).toBe('name 1:2');
    expect(error('< a/>')).toBe('name 1:2');
    expect(error('<a')).toBe('tag 1:1 a');
    expect(error('<a b="1"c="2"/>')).toBe('tag 1:9 a');
    expect(error('<a>1 < 2</a>')).toBe('name 1:7');
  });

  it('tells which element is open when a closing tag does not fit', () => {
    const parsed = parse('<root>\n  <item>\n</root>');
    expect(!parsed.ok && parsed.error).toMatchObject({ kind: 'mismatch', name: 'root', open: { name: 'item', line: 2 } });
  });
});

describe('format', () => {
  const source =
    '<?xml version="1.0"?><!-- c --><root a="1"><item id="1"><name>Ada</name><tags/></item><item id="2"><name>  Bob  </name><empty></empty></item></root>';

  it('puts each element on its own line, and keeps text on the line of its element', () => {
    expect(format(document(source))).toBe(`<?xml version="1.0"?>
<!-- c -->
<root a="1">
  <item id="1">
    <name>Ada</name>
    <tags/>
  </item>
  <item id="2">
    <name>Bob</name>
    <empty></empty>
  </item>
</root>`);
  });

  it('indents with what it is given', () => {
    expect(format(document('<a><b><c/></b></a>'), '\t')).toBe('<a>\n\t<b>\n\t\t<c/>\n\t</b>\n</a>');
  });

  it('formats its own output to the same thing, and the result is the same document', () => {
    const once = format(document(source));
    expect(format(document(once))).toBe(once);
    // laying out trims the text of an element that holds nothing else ("  Bob  "); apart from that nothing changes
    expect(format(document(once), null)).toBe(format(document(source.replace('  Bob  ', 'Bob')), null));
  });

  it('leaves text mixed with elements exactly as it is', () => {
    expect(format(document('<doc><p>Hello <b>big</b> world</p></doc>'))).toBe('<doc>\n  <p>Hello <b>big</b> world</p>\n</doc>');
  });

  it('leaves the contents of xml:space="preserve" and CDATA alone', () => {
    expect(format(document('<a><pre xml:space="preserve">  two\n  lines  </pre><s><![CDATA[ x < y ]]></s></a>'))).toBe(
      '<a>\n  <pre xml:space="preserve">  two\n  lines  </pre>\n  <s><![CDATA[ x < y ]]></s>\n</a>'
    );
  });

  it('keeps attribute values and their quotes as written', () => {
    expect(format(document(`<a x='say "hi"' y="it&apos;s &amp; more"/>`))).toBe(`<a x='say "hi"' y="it&apos;s &amp; more"/>`);
  });

  it('removes the layout when asked', () => {
    expect(format(document('<?xml version="1.0"?>\n<root>\n  <item>\n    <name>Ada</name>\n  </item>\n  <!-- c -->\n</root>\n'), null)).toBe(
      '<?xml version="1.0"?><root><item><name>Ada</name></item><!-- c --></root>'
    );
    expect(format(document('<p>Hello <b>big</b> world</p>'), null)).toBe('<p>Hello <b>big</b> world</p>');
  });

  it('keeps a doctype and instructions', () => {
    expect(format(document('<!DOCTYPE html><?go now?><html/>'))).toBe('<!DOCTYPE html>\n<?go now?>\n<html/>');
  });
});

describe('stats', () => {
  it('counts elements and attributes, and how deep the document goes', () => {
    expect(stats(document('<a x="1"><b y="2" z="3"><c/></b><d/></a>'))).toEqual({ elements: 4, attributes: 3, depth: 3 });
  });
});

describe('decode and encode', () => {
  it('replaces the predefined and the numeric entities', () => {
    expect(decode('a &lt; b &amp;&amp; c &gt; d &quot;e&quot; &apos;f&apos; &#233; &#x1F600;')).toBe('a < b && c > d "e" \'f\' é 😀');
  });

  it('leaves entities it does not know as written', () => {
    expect(decode('&nbsp; &custom; &#0;')).toBe('&nbsp; &custom; &#0;');
  });

  it('makes text safe for XML, and reverses', () => {
    expect(encode('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
    expect(encode(`say "hi" it's`, '"')).toBe(`say &quot;hi&quot; it's`);
    expect(encode(`say "hi" it's`, "'")).toBe(`say "hi" it&apos;s`);
    for (const text of ['a < b & c', `q " and '`, '&amp; already']) expect(decode(encode(text, '"'))).toBe(text);
  });
});
