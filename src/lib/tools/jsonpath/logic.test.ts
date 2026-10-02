import { describe, expect, it } from 'vitest';
import { PathError, evaluate, normalPath, parse } from './logic';

/** The bookstore of the JSONPath specification (RFC 9535, figure 1). */
const STORE = {
  store: {
    book: [
      { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
      { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
      { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99 },
      { category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', isbn: '0-395-19395-8', price: 22.99 }
    ],
    bicycle: { color: 'red', price: 399 }
  }
};

const values = (query: string, document: unknown = STORE) => evaluate(parse(query), document).map((m) => m.value);
const paths = (query: string, document: unknown = STORE) => evaluate(parse(query), document).map((m) => normalPath(m.path));
const titles = (query: string) => (values(query) as { title: string }[]).map((b) => b.title);
const error = (query: string) => {
  try {
    parse(query);
    return 'ok';
  } catch (e) {
    return e instanceof PathError ? `${e.kind} ${e.position}` : String(e);
  }
};

describe('the examples of RFC 9535', () => {
  it('$.store.book[*].author: the authors of all books in the store', () => {
    expect(values('$.store.book[*].author')).toEqual(['Nigel Rees', 'Evelyn Waugh', 'Herman Melville', 'J. R. R. Tolkien']);
  });

  it('$..author: all authors', () => {
    expect(values('$..author')).toEqual(['Nigel Rees', 'Evelyn Waugh', 'Herman Melville', 'J. R. R. Tolkien']);
  });

  it('$.store.*: all things in the store', () => {
    expect(values('$.store.*')).toEqual([STORE.store.book, STORE.store.bicycle]);
  });

  it('$.store..price: the prices of everything in the store', () => {
    expect(values('$.store..price').sort()).toEqual([12.99, 22.99, 399, 8.95, 8.99].sort());
  });

  it('$..book[2]: the third book, and its members', () => {
    expect(titles('$..book[2]')).toEqual(['Moby Dick']);
    expect(values('$..book[2].author')).toEqual(['Herman Melville']);
    expect(values('$..book[2].publisher')).toEqual([]);
  });

  it('$..book[-1]: the last book in order', () => {
    expect(titles('$..book[-1]')).toEqual(['The Lord of the Rings']);
  });

  it('$..book[0,1] and $..book[:2]: the first two books', () => {
    expect(titles('$..book[0,1]')).toEqual(['Sayings of the Century', 'Sword of Honour']);
    expect(titles('$..book[:2]')).toEqual(['Sayings of the Century', 'Sword of Honour']);
  });

  it('$..book[?@.isbn]: all books with an ISBN', () => {
    expect(titles('$..book[?@.isbn]')).toEqual(['Moby Dick', 'The Lord of the Rings']);
  });

  it('$..book[?@.price<10]: all books cheaper than 10', () => {
    expect(titles('$..book[?@.price<10]')).toEqual(['Sayings of the Century', 'Moby Dick']);
  });

  it('$..*: every member value and array element', () => {
    expect(values('$..*')).toHaveLength(27);
  });
});

describe('selectors', () => {
  it('reads names in brackets, with either quote and with escapes', () => {
    const document = { 'a b': 1, "it's": 2, 'x.y': 3, é: 4 };
    expect(values("$['a b']", document)).toEqual([1]);
    expect(values('$["it\'s"]', document)).toEqual([2]);
    expect(values("$['it\\'s']", document)).toEqual([2]);
    expect(values("$['x.y']", document)).toEqual([3]);
    expect(values(`$['${'\\' + 'u'}00e9']`, document)).toEqual([4]);
    expect(values('$.é', document)).toEqual([4]);
  });

  it('slices like the specification says', () => {
    const list = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(values('$[1:3]', list)).toEqual(['b', 'c']);
    expect(values('$[5:]', list)).toEqual(['f', 'g']);
    expect(values('$[1:5:2]', list)).toEqual(['b', 'd']);
    expect(values('$[5:1:-2]', list)).toEqual(['f', 'd']);
    expect(values('$[::-1]', list)).toEqual(['g', 'f', 'e', 'd', 'c', 'b', 'a']);
    expect(values('$[-2:]', list)).toEqual(['f', 'g']);
    expect(values('$[::0]', list)).toEqual([]);
    expect(values('$[10:20]', list)).toEqual([]);
  });

  it('gives nothing for an index or name that is not there, or on the wrong kind of value', () => {
    expect(values('$[9]', [1, 2])).toEqual([]);
    expect(values('$[-9]', [1, 2])).toEqual([]);
    expect(values('$.a', [1, 2])).toEqual([]);
    expect(values('$[0]', { a: 1 })).toEqual([]);
    expect(values('$.a.b.c', { a: 1 })).toEqual([]);
  });

  it('selects the document itself with $', () => {
    expect(values('$', 42)).toEqual([42]);
    expect(paths('$', 42)).toEqual(['$']);
  });
});

describe('filters', () => {
  it('compares with every operator', () => {
    expect(titles('$.store.book[?@.price == 8.99]')).toEqual(['Moby Dick']);
    expect(titles('$.store.book[?@.price != 8.99]')).toHaveLength(3);
    expect(titles('$.store.book[?@.price >= 12.99]')).toEqual(['Sword of Honour', 'The Lord of the Rings']);
    expect(titles('$.store.book[?@.price <= 8.95]')).toEqual(['Sayings of the Century']);
    expect(titles("$.store.book[?@.category == 'reference']")).toEqual(['Sayings of the Century']);
    expect(titles('$.store.book[?@.author > "J"]')).toEqual(['Nigel Rees', 'J. R. R. Tolkien'].map((a) => STORE.store.book.find((b) => b.author === a)!.title));
  });

  it('combines conditions with && || ! and brackets, also in the older [?(...)] form', () => {
    expect(titles("$.store.book[?@.category == 'fiction' && @.price < 10]")).toEqual(['Moby Dick']);
    expect(titles('$.store.book[?@.price < 9 || @.price > 20]')).toEqual(['Sayings of the Century', 'Moby Dick', 'The Lord of the Rings']);
    expect(titles('$.store.book[?!@.isbn]')).toEqual(['Sayings of the Century', 'Sword of Honour']);
    expect(titles("$.store.book[?(@.isbn && (@.price < 10 || @.author == 'nobody'))]")).toEqual(['Moby Dick']);
  });

  it('can compare with a value elsewhere in the document', () => {
    expect(titles('$.store.book[?@.price < $.store.book[1].price]')).toEqual(['Sayings of the Century', 'Moby Dick']);
  });

  it('never matches a comparison with a member that is not there, except to say so', () => {
    expect(titles('$.store.book[?@.isbn == null]')).toEqual([]);
    expect(titles('$.store.book[?@.isbn != "x"]')).toHaveLength(4);
    expect(values('$[?@.a == @.b]', [{ a: 1, b: 1 }, { a: 1, b: 2 }, {}])).toEqual([{ a: 1, b: 1 }, {}]);
  });

  it('does not compare different kinds of value as larger or smaller', () => {
    expect(values('$[?@ < 5]', [1, '1', null, true, 9])).toEqual([1]);
    expect(values('$[?@ == true]', [1, true, 'true'])).toEqual([true]);
  });

  it('filters the members of an object too', () => {
    expect(paths('$.store[?@.color]')).toEqual(["$['store']['bicycle']"]);
  });
});

describe('normalPath', () => {
  it('writes where each match was found', () => {
    expect(paths('$..book[?@.price<9].title')).toEqual(["$['store']['book'][0]['title']", "$['store']['book'][2]['title']"]);
    expect(normalPath(["it's", 'a\\b', 3])).toBe("$['it\\'s']['a\\\\b'][3]");
  });
});

describe('errors', () => {
  it('says where a query is wrong', () => {
    expect(error('store.book')).toBe('start 0');
    expect(error('')).toBe('end 0');
    expect(error('$.')).toBe('end 2');
    expect(error('$.store.')).toBe('end 8');
    expect(error('$[')).toBe('end 2');
    expect(error('$[0')).toBe('end 3');
    expect(error("$['open")).toBe('string 2');
    expect(error('$.a b')).toBe('unexpected 4');
    expect(error('$[?@.a ==]')).toBe('unexpected 9');
    expect(error('$[?5]')).toBe('unexpected 4');
    expect(error('$[?(@.a]')).toBe('unexpected 7');
    expect(error('$..')).toBe('end 3');
    expect(error('$[1.5]')).toBe('unexpected 3');
  });
});
