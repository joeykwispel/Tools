import { describe, expect, it } from 'vitest';
import { split, transform } from './logic';

describe('split', () => {
  it('reads every kind of line break, and ignores the last one', () => {
    expect(split('a\nb\r\nc\rd\n')).toEqual(['a', 'b', 'c', 'd']);
    expect(split('')).toEqual([]);
    expect(split('a\n\n')).toEqual(['a', '']);
    expect(split('one')).toEqual(['one']);
  });
});

describe('transform', () => {
  it('changes nothing without options', () => {
    expect(transform(' b \n\na\n b ')).toEqual([' b ', '', 'a', ' b ']);
  });

  it('trims lines and removes empty ones', () => {
    expect(transform('  a  \n\t\n b\n\n', { trim: true })).toEqual(['a', '', 'b', '']);
    expect(transform('  a  \n\t\n b\n\n', { removeEmpty: true })).toEqual(['  a  ', ' b']);
    expect(transform('  a  \n\t\n b\n\n', { trim: true, removeEmpty: true })).toEqual(['a', 'b']);
  });

  it('keeps the first of lines that are the same', () => {
    expect(transform('b\na\nb\nB\na', { unique: true })).toEqual(['b', 'a', 'B']);
    expect(transform('b\na\nb\nB\na', { unique: true, ignoreCase: true })).toEqual(['b', 'a']);
  });

  it('trims before it looks for doubles', () => {
    expect(transform('a\n a \na', { unique: true })).toEqual(['a', ' a ']);
    expect(transform('a\n a \na', { unique: true, trim: true })).toEqual(['a']);
  });

  it('sorts the way people expect: numbers by value, accents next to their letter', () => {
    expect(transform('item 10\nitem 2\nItem 1\nébène\nzebra\neast', { order: 'ascending' })).toEqual(['east', 'ébène', 'Item 1', 'item 2', 'item 10', 'zebra']);
    expect(transform('b\na\nc', { order: 'descending' })).toEqual(['c', 'b', 'a']);
  });

  it('sorts upper and lower case apart, or together when asked', () => {
    expect(transform('b\nB\na\nA', { order: 'ascending' })).toEqual(['a', 'A', 'b', 'B']);
    // equal lines keep the order they came in
    expect(transform('B\nb\nA\na', { order: 'ascending', ignoreCase: true })).toEqual(['A', 'a', 'B', 'b']);
  });

  it('sorts by length, shortest first, and can reverse the order', () => {
    expect(transform('ccc\na\nbb\nd', { order: 'length' })).toEqual(['a', 'd', 'bb', 'ccc']);
    expect(transform('1\n2\n3', { order: 'reverse' })).toEqual(['3', '2', '1']);
    // an emoji is one character long
    expect(transform('ab\n😀', { order: 'length' })).toEqual(['😀', 'ab']);
  });

  it('numbers the lines last, lined up', () => {
    expect(transform('b\na', { order: 'ascending', number: true })).toEqual(['1. a', '2. b']);
    expect(transform(Array.from({ length: 10 }, (_, i) => `l${i}`).join('\n'), { number: true }).slice(8)).toEqual([' 9. l8', '10. l9']);
  });

  it('does all steps together', () => {
    expect(
      transform(' pear \napple\n\nPear\napple\n banana', { trim: true, removeEmpty: true, unique: true, ignoreCase: true, order: 'ascending', number: true })
    ).toEqual(['1. apple', '2. banana', '3. pear']);
  });
});
