import { describe, expect, it } from 'vitest';
import { jsonToYaml, yamlToJson } from './logic';

const json = (yaml: string) => {
  const result = yamlToJson(yaml);
  if (!result.ok) throw new Error(result.message);
  return JSON.parse(result.text) as unknown;
};
const yaml = (text: string, indent = 2) => {
  const result = jsonToYaml(text, indent);
  if (!result.ok) throw new Error(result.kind);
  return result.text;
};

describe('yamlToJson', () => {
  it('reads maps, lists and the scalar types', () => {
    const text = `
name: tools
version: 1.5
private: true
nothing: null
tilde: ~
tags:
  - json
  - yaml
scripts:
  dev: vite dev
  quoted: "yes"
`;
    expect(json(text)).toEqual({
      name: 'tools',
      version: 1.5,
      private: true,
      nothing: null,
      tilde: null,
      tags: ['json', 'yaml'],
      scripts: { dev: 'vite dev', quoted: 'yes' }
    });
  });

  it('follows YAML 1.2: yes, no and on are strings, not booleans', () => {
    expect(json('a: yes\nb: no\nc: on\nd: true')).toEqual({ a: 'yes', b: 'no', c: 'on', d: true });
  });

  it('reads block strings, anchors and aliases', () => {
    expect(json('text: |\n  line one\n  line two\nfolded: >\n  one\n  two\n')).toEqual({ text: 'line one\nline two\n', folded: 'one two\n' });
    expect(json('base: &b\n  a: 1\ncopy: *b\nmerged:\n  <<: *b\n  c: 2')).toMatchObject({ base: { a: 1 }, copy: { a: 1 } });
  });

  it('turns several documents into an array, and says how many there were', () => {
    const result = yamlToJson('a: 1\n---\nb: 2\n');
    expect(result.ok && result.documents).toBe(2);
    expect(result.ok && JSON.parse(result.text)).toEqual([{ a: 1 }, { b: 2 }]);
    expect(yamlToJson('a: 1').ok && (yamlToJson('a: 1') as { documents: number }).documents).toBe(1);
  });

  it('indents the JSON as asked', () => {
    const result = yamlToJson('a:\n  b: 1', 4);
    expect(result.ok && result.text).toBe('{\n    "a": {\n        "b": 1\n    }\n}');
  });

  it('gives null for an empty input, as YAML does', () => {
    expect(yamlToJson('')).toMatchObject({ ok: true, text: 'null' });
    expect(yamlToJson('# only a comment\n')).toMatchObject({ ok: true, text: 'null' });
  });

  it('says where the YAML is wrong', () => {
    const result = yamlToJson('a: 1\nb: [1, 2\nc: 3');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.line).toBeGreaterThanOrEqual(2);
    expect(!result.ok && result.message).not.toMatch(/at line/);
    const tabs = yamlToJson('a:\n\tb: 1');
    expect(tabs.ok).toBe(false);
    expect(!tabs.ok && tabs.line).toBe(2);
  });
});

describe('jsonToYaml', () => {
  it('writes maps, lists and scalars', () => {
    expect(yaml('{"name":"tools","tags":["a","b"],"nested":{"ok":true,"n":null,"x":1.5}}')).toBe(
      'name: tools\ntags:\n  - a\n  - b\nnested:\n  ok: true\n  n: null\n  x: 1.5\n'
    );
  });

  it('quotes strings that would otherwise be read as something else', () => {
    const text = yaml('{"a":"true","b":"123","c":"null","d":"with: colon","e":"","f":"# not a comment"}');
    expect(json(text)).toEqual({ a: 'true', b: '123', c: 'null', d: 'with: colon', e: '', f: '# not a comment' });
    expect(text).toContain('a: "true"');
  });

  it('keeps a long string on one line and writes line breaks as a block', () => {
    const long = 'word '.repeat(40).trim();
    expect(yaml(JSON.stringify({ long }))).toBe(`long: ${long}\n`);
    expect(yaml('{"text":"line one\\nline two\\n"}')).toBe('text: |\n  line one\n  line two\n');
  });

  it('indents as asked', () => {
    expect(yaml('{"a":{"b":[1]}}', 4)).toBe('a:\n    b:\n        - 1\n');
  });

  it('goes round: YAML to JSON to YAML to JSON gives the same value', () => {
    const source = 'a: 1\nlist:\n  - x\n  - y: [1, 2, 3]\ntext: "quoted: yes"\nempty: {}\n';
    const once = yamlToJson(source);
    expect(once.ok).toBe(true);
    expect(json(yaml(once.ok ? once.text : ''))).toEqual(json(source));
  });

  it('reports invalid JSON with the place and the kind of error', () => {
    expect(jsonToYaml('{"a": 1,}')).toMatchObject({ ok: false, line: 1, column: 9, kind: 'trailingComma' });
    expect(jsonToYaml('')).toMatchObject({ ok: false, kind: 'empty' });
  });
});
