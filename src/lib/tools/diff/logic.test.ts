import { describe, expect, it } from 'vitest';
import { compare, count, diff, hunks, lines, normaliseJson, toText } from './logic';

/** Applies a list of operations: what you get when you follow them must be the second text. */
const apply = (ops: ReturnType<typeof diff<string>>) => ({
  before: ops.filter((op) => op.type !== 'insert').map((op) => op.value),
  after: ops.filter((op) => op.type !== 'delete').map((op) => op.value)
});
const signs = (before: string, after: string, options = {}) =>
  compare(before, after, options)
    .map((line) => (line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' ') + line.text)
    .join('|');

describe('diff', () => {
  it('finds the shortest way from one list to the other', () => {
    const ops = diff([...'ABCABBA'], [...'CBABAC']);
    expect(apply(ops)).toEqual({ before: [...'ABCABBA'], after: [...'CBABAC'] });
    // the classic example: five edits is the least there is
    expect(ops.filter((op) => op.type !== 'equal')).toHaveLength(5);
  });

  it('handles the edges', () => {
    expect(diff([], [])).toEqual([]);
    expect(diff(['a'], [])).toEqual([{ type: 'delete', value: 'a' }]);
    expect(diff([], ['a'])).toEqual([{ type: 'insert', value: 'a' }]);
    expect(diff(['a', 'b'], ['a', 'b'])).toEqual([
      { type: 'equal', value: 'a' },
      { type: 'equal', value: 'b' }
    ]);
    expect(diff(['a'], ['b'])).toEqual([
      { type: 'delete', value: 'a' },
      { type: 'insert', value: 'b' }
    ]);
  });

  it('always gives operations that lead from the first list to the second', () => {
    // a fixed pseudo-random sequence, so a failure can be repeated
    let seed = 42;
    const random = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
    for (let round = 0; round < 200; round++) {
      const a = Array.from({ length: random(12) }, () => 'abcd'[random(4)]);
      const b = Array.from({ length: random(12) }, () => 'abcd'[random(4)]);
      expect(apply(diff(a, b)), `${a.join('')} → ${b.join('')}`).toEqual({ before: a, after: b });
    }
  });

  it('copes with two long lists that have nothing in common', () => {
    const a = Array.from({ length: 5000 }, (_, i) => `a${i}`);
    const b = Array.from({ length: 5000 }, (_, i) => `b${i}`);
    const ops = diff(a, b);
    expect(apply(ops)).toEqual({ before: a, after: b });
  });
});

describe('lines', () => {
  it('splits on every kind of line break, and ignores the last one', () => {
    expect(lines('a\nb\r\nc\rd\n')).toEqual(['a', 'b', 'c', 'd']);
    expect(lines('')).toEqual([]);
    expect(lines('a\n\n')).toEqual(['a', '']);
  });
});

describe('compare', () => {
  it('marks added and removed lines, with their line numbers', () => {
    const result = compare('one\ntwo\nthree', 'one\n2\nthree\nfour');
    expect(result.map((l) => [l.type, l.text, l.before, l.after])).toEqual([
      ['equal', 'one', 1, 1],
      ['delete', 'two', 2, null],
      ['insert', '2', null, 2],
      ['equal', 'three', 3, 3],
      ['insert', 'four', null, 4]
    ]);
    expect(count(result)).toEqual({ added: 2, removed: 1 });
  });

  it('can ignore whitespace and case', () => {
    expect(signs('a  b\nC', 'a b \nc')).toBe('-a  b|-C|+a b |+c');
    expect(signs('a  b\nC', 'a b \nc', { ignoreWhitespace: true })).toBe(' a b |-C|+c');
    expect(signs('a  b\nC', 'a b \nc', { ignoreWhitespace: true, ignoreCase: true })).toBe(' a b | c');
  });

  it('marks the words that changed inside a changed line', () => {
    const [removed, added] = compare('const total = price * 2;', 'const total = price * 3;');
    expect(removed.parts?.filter((p) => p.changed).map((p) => p.text)).toEqual(['2']);
    expect(added.parts?.filter((p) => p.changed).map((p) => p.text)).toEqual(['3']);
    expect(added.parts?.map((p) => p.text).join('')).toBe('const total = price * 3;');
  });

  it('does not mark words when two lines have too little in common', () => {
    const [removed, added] = compare('alpha', 'omega');
    expect(removed.parts).toBeUndefined();
    expect(added.parts).toBeUndefined();
    const little = compare('the quick brown fox', 'the end');
    expect(little.every((l) => !l.parts)).toBe(true);
  });

  it('pairs a removed line with the added line it most looks like, also when the numbers differ', () => {
    const result = compare('keep\nprice = 2', 'keep\nsomething new entirely\nprice = 3');
    const marked = (text: string) =>
      result
        .find((l) => l.text === text)
        ?.parts?.filter((p) => p.changed)
        .map((p) => p.text);
    expect(marked('price = 2')).toEqual(['2']);
    expect(marked('price = 3')).toEqual(['3']);
    expect(marked('something new entirely')).toBeUndefined();
  });

  it('says nothing changed for equal texts', () => {
    expect(count(compare('same\ntext\n', 'same\ntext'))).toEqual({ added: 0, removed: 0 });
  });
});

describe('hunks', () => {
  const before = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
  const after = before.replace('line 10', 'LINE TEN');

  it('keeps a few lines around each change and counts the rest', () => {
    const blocks = hunks(compare(before, after), 2);
    expect(blocks.map((b) => ('skipped' in b ? `skip ${b.skipped}` : `${b.lines.length} lines`))).toEqual(['skip 7', '6 lines', 'skip 8']);
    const shown = blocks[1];
    expect('lines' in shown && shown.lines.map((l) => l.text)).toEqual(['line 8', 'line 9', 'line 10', 'LINE TEN', 'line 11', 'line 12']);
  });

  it('gives one skipped block when nothing changed, and everything when the context is large', () => {
    expect(hunks(compare(before, before))).toEqual([{ skipped: 20 }]);
    expect(hunks(compare(before, after), 100)).toHaveLength(1);
    expect(hunks([])).toEqual([]);
  });
});

describe('toText', () => {
  it('writes the comparison with + and - in front', () => {
    expect(toText(compare('a\nb', 'a\nc'))).toBe('  a\n- b\n+ c');
  });
});

describe('normaliseJson', () => {
  it('makes two documents that mean the same compare as equal', () => {
    const a = normaliseJson('{"b":1,"a":{"y":[1,2],"x":null}}');
    const b = normaliseJson('{\n  "a": { "x": null, "y": [1, 2] },\n  "b": 1\n}');
    expect(a.ok && b.ok && a.text === b.text).toBe(true);
    expect(a.ok && count(compare(a.text, b.ok ? b.text : ''))).toEqual({ added: 0, removed: 0 });
  });

  it('shows a real difference on its own line', () => {
    const a = normaliseJson('{"name":"Ada","age":36}');
    const b = normaliseJson('{"age":37,"name":"Ada"}');
    expect(a.ok && b.ok && signs(a.text, b.text)).toBe(' {|-  "age": 36,|+  "age": 37,|   "name": "Ada"| }');
  });

  it('reports invalid JSON', () => {
    expect(normaliseJson('{"a":1,}')).toMatchObject({ ok: false, error: { kind: 'trailingComma' } });
  });
});
