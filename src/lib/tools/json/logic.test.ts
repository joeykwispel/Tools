import { describe, expect, it } from 'vitest';
import { duplicateKeys, format, parse, size, sortKeys, toValue, type Node } from './logic';

/** The start of a unicode escape, put together here so the test file never holds one that is not meant as one. */
const U = '\\' + 'u';

const node = (text: string): Node => {
  const parsed = parse(text);
  if (!parsed.ok) throw new Error(`${parsed.error.kind} at ${parsed.error.position}`);
  return parsed.node;
};
const error = (text: string) => {
  const parsed = parse(text);
  return parsed.ok ? 'ok' : `${parsed.error.kind} ${parsed.error.line}:${parsed.error.column}`;
};

describe('parse', () => {
  it('reads the same values as JSON.parse', () => {
    for (const text of [
      '{"a":1,"b":[true,false,null],"c":{"d":"e"}}',
      '[]',
      '{}',
      '"just a string"',
      '-0.5e-3',
      '  [ 1 , 2 ]  ',
      `"tab\\t quote\\" slash\\/ back\\\\ ${U}00e9 ${U}d83d${U}de00"`,
      '[1, 2.5, -3, 4e10, 5E-2, 0, -0]',
      '{"":{"":[[[]]]}}',
      '\n\t{"a"\r\n:\t1}\n'
    ])
      expect(toValue(node(text)), text).toEqual(JSON.parse(text));
  });

  it('accepts everything JSON.parse accepts, and refuses everything it refuses', () => {
    const cases = [
      '1',
      '01',
      '1.',
      '.5',
      '1e',
      '-',
      '+1',
      'tru',
      'nul',
      'NaN',
      'undefined',
      '"a',
      '"\\q"',
      '[1,]',
      '{"a":1,}',
      '{a:1}',
      "{'a':1}",
      '[1 2]',
      '{"a" 1}',
      '{"a":}',
      '1 2',
      '',
      '  ',
      '"\t"',
      '[',
      '{',
      '{"a":1',
      '[1,',
      `"${U}12"`,
      '// x\n1',
      '"ok" // x'
    ];
    for (const text of cases) {
      let valid = true;
      try {
        JSON.parse(text);
      } catch {
        valid = false;
      }
      expect(parse(text).ok, JSON.stringify(text)).toBe(valid);
    }
  });

  it('says what is wrong, and where', () => {
    expect(error('')).toBe('empty 1:1');
    expect(error('{"a": 1,\n  "b": 2,\n}')).toBe('trailingComma 3:1');
    expect(error('[1, 2,]')).toBe('trailingComma 1:7');
    expect(error("{'a': 1}")).toBe('singleQuote 1:2');
    expect(error('{"a": \'x\'}')).toBe('singleQuote 1:7');
    expect(error('{a: 1}')).toBe('unquotedKey 1:2');
    expect(error('{"a": 1 // one\n}')).toBe('comment 1:9');
    expect(error('/* hi */ 1')).toBe('comment 1:1');
    expect(error('{"a": 01}')).toBe('number 1:7');
    expect(error('[1.]')).toBe('number 1:2');
    expect(error('"a\\qb"')).toBe('escape 1:3');
    expect(error('"line\nbreak"')).toBe('control 1:6');
    expect(error('{"a": 1} extra')).toBe('extra 1:10');
    expect(error('{"a": 1')).toBe('end 1:8');
    expect(error('{"a": [1, 2')).toBe('end 1:12');
    expect(error('"open')).toBe('end 1:6');
    expect(error('{"a" 1}')).toBe('char 1:6');
    expect(error('[1 2]')).toBe('char 1:4');
    expect(error('{"a": tru}')).toBe('char 1:7');
    expect(error('{"a": undefined}')).toBe('char 1:7');
  });

  it('gives the character it found', () => {
    const parsed = parse('[1 2]');
    expect(!parsed.ok && parsed.error.found).toBe('2');
    const end = parse('[1');
    expect(!end.ok && end.error.found).toBe('');
  });
});

describe('format', () => {
  const text = '{"name":"Zoë","tags":["a","b"],"empty":{},"none":[],"n":null,"ok":true}';

  it('indents with what it is given', () => {
    expect(format(node(text))).toBe('{\n  "name": "Zoë",\n  "tags": [\n    "a",\n    "b"\n  ],\n  "empty": {},\n  "none": [],\n  "n": null,\n  "ok": true\n}');
    expect(format(node('[1,[2]]'), '\t')).toBe('[\n\t1,\n\t[\n\t\t2\n\t]\n]');
    expect(format(node('{"a":{"b":1}}'), '    ')).toBe('{\n    "a": {\n        "b": 1\n    }\n}');
  });

  it('minifies', () => {
    expect(format(node('{ "a" : [ 1 , 2 ] ,\n "b" : "x y" }'), null)).toBe('{"a":[1,2],"b":"x y"}');
  });

  it('gives a document that means the same', () => {
    for (const indent of ['  ', '\t', null]) expect(JSON.parse(format(node(text), indent))).toEqual(JSON.parse(text));
  });

  it('keeps numbers and strings exactly as they were written', () => {
    const exact = `{"big":12345678901234567890,"one":1.0,"exp":1E5,"esc":"${U}00e9\\/"}`;
    expect(format(node(exact), null)).toBe(exact);
    // JSON.parse would have changed all four
    expect(JSON.stringify(JSON.parse(exact))).not.toBe(exact);
  });
});

describe('sortKeys', () => {
  it('sorts the keys of every object, and leaves arrays in their order', () => {
    expect(format(sortKeys(node('{"b":1,"a":{"z":[{"y":1,"x":2}],"c":3},"B":0}')), null)).toBe('{"B":0,"a":{"c":3,"z":[{"x":2,"y":1}]},"b":1}');
  });
});

describe('duplicateKeys', () => {
  it('finds keys that an object has twice, at any depth', () => {
    expect(duplicateKeys(node('{"a":1,"b":{"x":1,"x":2},"a":3,"c":[{"k":1,"k":2}]}')).sort()).toEqual(['a', 'k', 'x']);
    expect(duplicateKeys(node('{"a":1,"b":{"a":1}}'))).toEqual([]);
  });
});

describe('size', () => {
  it('counts what an object or array holds directly', () => {
    expect(size(node('{"a":1,"b":[1,2,3]}'))).toBe(2);
    expect(size(node('[1,[2,3]]'))).toBe(2);
    expect(size(node('"text"'))).toBe(0);
  });
});
