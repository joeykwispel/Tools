import { describe, expect, it } from 'vitest';
import { parse } from '../xml/logic';
import { jsonToXml, xmlName, xmlToJson, type Json } from './logic';

const toJson = (xml: string, types = false): Json => {
  const parsed = parse(xml);
  if (!parsed.ok) throw new Error(`${parsed.error.kind} at ${parsed.error.line}:${parsed.error.column}`);
  return xmlToJson(parsed.document, { types });
};
const toXml = (value: Json, options = {}) => jsonToXml(value, { declaration: false, ...options });

describe('xmlToJson', () => {
  it('follows the convention: @ for attributes, #text for text next to them', () => {
    expect(toJson('<a x="1">text</a>')).toEqual({ a: { '@x': '1', '#text': 'text' } });
    expect(toJson('<a>text</a>')).toEqual({ a: 'text' });
    expect(toJson('<a/>')).toEqual({ a: null });
    expect(toJson('<a></a>')).toEqual({ a: null });
    expect(toJson('<a x="1"/>')).toEqual({ a: { '@x': '1' } });
  });

  it('makes an array of elements with the same name, and keeps the order of names', () => {
    expect(toJson('<list><item>a</item><other/><item>b</item><item>c</item></list>')).toEqual({ list: { item: ['a', 'b', 'c'], other: null } });
    expect(Object.keys((toJson('<a><z/><y/><x/></a>') as { a: object }).a)).toEqual(['z', 'y', 'x']);
  });

  it('reads a whole document, ignoring the layout, comments and instructions', () => {
    expect(
      toJson(`<?xml version="1.0"?>
<!-- an order -->
<order id="1042">
  <customer>
    <name>Ada &amp; Co</name>
  </customer>
  <?page break?>
  <line sku="A-1"><price currency="EUR">4.50</price></line>
  <line sku="B-7"><price currency="EUR">9.95</price></line>
  <note><![CDATA[<b>raw</b> & more]]></note>
</order>`)
    ).toEqual({
      order: {
        '@id': '1042',
        customer: { name: 'Ada & Co' },
        line: [
          { '@sku': 'A-1', price: { '@currency': 'EUR', '#text': '4.50' } },
          { '@sku': 'B-7', price: { '@currency': 'EUR', '#text': '9.95' } }
        ],
        note: '<b>raw</b> & more'
      }
    });
  });

  it('keeps every value a string, unless asked for types', () => {
    const xml = '<a n="42"><b>1.5</b><c>true</c><d>007</d><e>1e3</e><f>text</f><g>-0</g></a>';
    expect(toJson(xml)).toEqual({ a: { '@n': '42', b: '1.5', c: 'true', d: '007', e: '1e3', f: 'text', g: '-0' } });
    expect(toJson(xml, true)).toEqual({ a: { '@n': 42, b: 1.5, c: true, d: '007', e: 1000, f: 'text', g: -0 } });
  });

  it('joins the text around elements, and keeps prefixes in names', () => {
    expect(toJson('<p>Hello <b>big</b> world</p>')).toEqual({ p: { b: 'big', '#text': 'Hello  world' } });
    expect(toJson('<s:Envelope xmlns:s="urn:s"><s:Body/></s:Envelope>')).toEqual({ 's:Envelope': { '@xmlns:s': 'urn:s', 's:Body': null } });
  });
});

describe('jsonToXml', () => {
  it('follows the same convention the other way', () => {
    expect(toXml({ a: { '@x': '1', '#text': 'text' } })).toBe('<a x="1">text</a>');
    expect(toXml({ a: 'text' })).toBe('<a>text</a>');
    expect(toXml({ a: null })).toBe('<a/>');
    expect(toXml({ a: { '@x': 1 } })).toBe('<a x="1"/>');
    expect(toXml({ a: { b: [1, 2] } })).toBe('<a>\n  <b>1</b>\n  <b>2</b>\n</a>');
  });

  it('writes a document with the declaration and the chosen indent', () => {
    expect(jsonToXml({ order: { '@id': 7, lines: { line: [{ sku: 'A' }, { sku: 'B' }] }, paid: true } })).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<order id="7">
  <lines>
    <line>
      <sku>A</sku>
    </line>
    <line>
      <sku>B</sku>
    </line>
  </lines>
  <paid>true</paid>
</order>`);
    expect(toXml({ a: { b: { c: 1 } } }, { indent: '\t' })).toBe('<a>\n\t<b>\n\t\t<c>1</c>\n\t</b>\n</a>');
    expect(toXml({ a: { b: { c: 1 } } }, { indent: null })).toBe('<a><b><c>1</c></b></a>');
  });

  it('wraps a value that has no single root of its own', () => {
    expect(toXml({ a: 1, b: 2 })).toBe('<root>\n  <a>1</a>\n  <b>2</b>\n</root>');
    expect(toXml([1, 2])).toBe('<root>\n  <item>1</item>\n  <item>2</item>\n</root>');
    expect(toXml('just text')).toBe('<root>just text</root>');
    expect(toXml({ list: [1, 2] })).toBe('<root>\n  <list>1</list>\n  <list>2</list>\n</root>');
    expect(toXml({ a: 1, b: 2 }, { rootName: 'data' })).toBe('<data>\n  <a>1</a>\n  <b>2</b>\n</data>');
  });

  it('escapes text and attribute values', () => {
    expect(toXml({ a: { '@t': 'say "hi" & <go>', '#text': '1 < 2 & 3 > 2' } })).toBe('<a t="say &quot;hi&quot; &amp; &lt;go&gt;">1 &lt; 2 &amp; 3 &gt; 2</a>');
  });

  it('makes valid names of keys that are not', () => {
    expect(xmlName('first name')).toBe('first_name');
    expect(xmlName('1st')).toBe('_1st');
    expect(xmlName('a/b')).toBe('a_b');
    expect(xmlName('')).toBe('_');
    expect(xmlName('soap:Body')).toBe('soap:Body');
    expect(xmlName('straße-1.x')).toBe('straße-1.x');
    expect(toXml({ 'my data': { '2nd item': 1 } })).toBe('<my_data>\n  <_2nd_item>1</_2nd_item>\n</my_data>');
  });

  it('handles nested arrays and text next to children', () => {
    expect(toXml({ a: { row: [[1, 2], [3]] } })).toBe(
      '<a>\n  <row>\n    <item>1</item>\n    <item>2</item>\n  </row>\n  <row>\n    <item>3</item>\n  </row>\n</a>'
    );
    expect(toXml({ p: { '#text': 'Hello', b: 'big' } })).toBe('<p>\n  Hello\n  <b>big</b>\n</p>');
  });

  it('always gives well-formed XML', () => {
    for (const value of [{ a: { '@x': '<>&"', b: [null, '', 0, false, { c: ']]>' }] } }, [[['deep']]], { '': { '@': 1 } }, 'x', 42, null, {}] as Json[])
      expect(parse(jsonToXml(value)).ok, JSON.stringify(value)).toBe(true);
  });
});

describe('round trip', () => {
  it('gives the same JSON back after going through XML', () => {
    for (const value of [
      {
        order: {
          '@id': '1042',
          customer: { name: 'Ada & Co' },
          line: [
            { '@sku': 'A-1', price: '4.50' },
            { '@sku': 'B-7', price: '9.95' }
          ],
          note: null
        }
      },
      { a: 'text' },
      { a: { '@x': '1', '#text': 'both' } },
      { list: { item: ['a', 'b', 'c'] } }
    ] as Json[])
      expect(toJson(jsonToXml(value)), JSON.stringify(value)).toEqual(value);
  });

  it('gives the same XML back after going through JSON, for a document without mixed content', () => {
    const xml =
      '<order id="1042">\n  <customer>\n    <name>Ada</name>\n  </customer>\n  <line sku="A-1">2</line>\n  <line sku="B-7">1</line>\n  <note/>\n</order>';
    expect(toXml(toJson(xml))).toBe(xml);
  });
});
