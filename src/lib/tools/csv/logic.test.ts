import { describe, expect, it } from 'vitest';
import { detect, filter, number, parse, sort, table, toJson } from './logic';

const column = (n: number) => `Column ${n}`;

describe('parse', () => {
  it('splits rows and fields', () => {
    expect(parse('a,b,c\n1,2,3\n', ',')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3']
    ]);
  });

  it('reads quoted fields: delimiters, line breaks and doubled quotes inside them', () => {
    expect(parse('name,note\n"Lovelace, Ada","said ""hi""\nand left"\n', ',')).toEqual([
      ['name', 'note'],
      ['Lovelace, Ada', 'said "hi"\nand left']
    ]);
  });

  it('keeps empty fields, also quoted ones and at the ends of a row', () => {
    expect(parse(',a,,\n"",""\n', ',')).toEqual([
      ['', 'a', '', ''],
      ['', '']
    ]);
  });

  it('accepts every kind of line break, skips empty lines and ignores a byte order mark', () => {
    expect(parse(`${String.fromCharCode(0xfeff)}a;b\r\n1;2\r\r\n\n3;4`, ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4']
    ]);
  });

  it('treats a quote in the middle of a field as an ordinary character', () => {
    expect(parse('5" screen,ok', ',')).toEqual([['5" screen', 'ok']]);
  });

  it('gives no rows for an empty text', () => {
    expect(parse('', ',')).toEqual([]);
    expect(parse('\n\n', ',')).toEqual([]);
  });
});

describe('detect', () => {
  it('finds the delimiter that gives the same number of columns on every line', () => {
    expect(detect('a,b,c\n1,2,3')).toBe(',');
    expect(detect('naam;prijs\nkoffie;2,50\nthee;1,95')).toBe(';');
    expect(detect('a\tb\n1\t2')).toBe('\t');
    expect(detect('a|b|c\n1|2|3')).toBe('|');
  });

  it('is not fooled by delimiters inside quotes', () => {
    expect(detect('name;note\n"Lovelace, Ada, and more";"a, b, c"')).toBe(';');
  });

  it('falls back to a comma when nothing fits', () => {
    expect(detect('just one column\nand another line')).toBe(',');
    expect(detect('')).toBe(',');
  });
});

describe('table', () => {
  const rows = [['name', 'age'], ['Ada', '36', 'extra'], ['Bob']];

  it('takes the first row as header and makes every row as wide as the widest', () => {
    expect(table(rows, true, column)).toEqual({
      header: ['name', 'age', 'Column 3'],
      rows: [
        ['Ada', '36', 'extra'],
        ['Bob', '', '']
      ],
      ragged: 2
    });
  });

  it('numbers the columns when there is no header', () => {
    const t = table(
      [
        ['a', 'b'],
        ['c', 'd']
      ],
      false,
      column
    );
    expect(t.header).toEqual(['Column 1', 'Column 2']);
    expect(t.rows).toHaveLength(2);
    expect(t.ragged).toBe(0);
  });

  it('handles no rows at all', () => {
    expect(table([], true, column)).toEqual({ header: [], rows: [], ragged: 0 });
  });
});

describe('number', () => {
  it('reads numbers as they are written in a CSV', () => {
    expect(number('12')).toBe(12);
    expect(number(' -3.5 ')).toBe(-3.5);
    expect(number('2,50')).toBe(2.5);
    expect(number('1e3')).toBe(1000);
    expect(number('.5')).toBe(0.5);
  });

  it('gives null for anything else', () => {
    for (const text of ['', 'abc', '1.2.3', '12 kg', '1,000,000', '0x10', '-']) expect(number(text), text).toBeNull();
  });
});

describe('sort', () => {
  const rows = [
    ['b', '10'],
    ['a', '9'],
    ['C', ''],
    ['d', '2,5']
  ];

  it('sorts numbers as numbers, with empty values last in both directions', () => {
    expect(sort(rows, 1, 'ascending').map((r) => r[1])).toEqual(['2,5', '9', '10', '']);
    expect(sort(rows, 1, 'descending').map((r) => r[1])).toEqual(['10', '9', '2,5', '']);
  });

  it('sorts text without regard to case, and numbers inside text by value', () => {
    expect(sort(rows, 0, 'ascending').map((r) => r[0])).toEqual(['a', 'b', 'C', 'd']);
    expect(sort([['item 10'], ['item 2'], ['Item 1']], 0, 'ascending').map((r) => r[0])).toEqual(['Item 1', 'item 2', 'item 10']);
  });

  it('does not change the rows it was given', () => {
    const before = JSON.stringify(rows);
    sort(rows, 0, 'descending');
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe('filter', () => {
  const rows = [
    ['Ada', 'London'],
    ['Bob', 'Druten'],
    ['Carol', 'londonderry']
  ];

  it('keeps the rows that have the text in any column', () => {
    expect(filter(rows, 'LONDON').map((r) => r[0])).toEqual(['Ada', 'Carol']);
    expect(filter(rows, 'bob')).toEqual([['Bob', 'Druten']]);
    expect(filter(rows, '  ')).toEqual(rows);
    expect(filter(rows, 'zzz')).toEqual([]);
  });
});

describe('toJson', () => {
  it('writes one object per row', () => {
    expect(
      JSON.parse(
        toJson({
          header: ['name', 'age'],
          rows: [
            ['Ada', '36'],
            ['Bob', '']
          ]
        })
      )
    ).toEqual([
      { name: 'Ada', age: '36' },
      { name: 'Bob', age: '' }
    ]);
  });

  it('keeps both columns when a name is used twice', () => {
    expect(JSON.parse(toJson({ header: ['id', 'id'], rows: [['1', '2']] }))).toEqual([{ id: '1', 'id 2': '2' }]);
  });
});
