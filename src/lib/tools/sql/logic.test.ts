import { describe, expect, it } from 'vitest';
import { format, tokenize } from './logic';

/** What a query is made of, whatever its layout and the case of its keywords. */
const substance = (sql: string) =>
  tokenize(sql)
    .map((t) => (t.type === 'word' ? t.text.toLowerCase() : t.text))
    .join(' ');

describe('tokenize', () => {
  it('keeps strings, identifiers and comments whole', () => {
    expect(tokenize(`select 'it''s; -- not', "my col", \`x y\` -- note\n/* block */ from t`).map((t) => t.text)).toEqual([
      'select',
      "'it''s; -- not'",
      ',',
      '"my col"',
      ',',
      '`x y`',
      '-- note',
      '/* block */',
      'from',
      't'
    ]);
  });

  it('reads numbers, operators and placeholders', () => {
    expect(tokenize('a>=1.5e3 and b<>:name or c=$1 and d::int || ?').map((t) => t.text)).toEqual([
      'a',
      '>=',
      '1.5e3',
      'and',
      'b',
      '<>',
      ':name',
      'or',
      'c',
      '=',
      '$1',
      'and',
      'd',
      '::',
      'int',
      '||',
      '?'
    ]);
  });

  it('reads PostgreSQL dollar-quoted text', () => {
    expect(tokenize("select $fn$ it's; here $fn$, $$x$$").map((t) => t.text)).toEqual(['select', "$fn$ it's; here $fn$", ',', '$$x$$']);
  });

  it('loses nothing, also when a quote or comment is never closed', () => {
    for (const sql of ["select 'open", 'select /* open', 'select "open', 'a § b ~ c'])
      expect(
        tokenize(sql)
          .map((t) => t.text)
          .join('')
          .replace(/\s/g, ''),
        sql
      ).toBe(sql.replace(/\s/g, ''));
  });
});

describe('format', () => {
  it('puts each clause on its own line and the columns under each other', () => {
    expect(
      format(
        'select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = true and o.total > 100 group by u.id, u.name order by orders desc limit 10;'
      )
    ).toBe(
      `SELECT
  u.id,
  u.name,
  count(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.active = TRUE
  AND o.total > 100
GROUP BY u.id, u.name
ORDER BY orders DESC
LIMIT 10;`
    );
  });

  it('keeps DISTINCT behind SELECT and * as it is', () => {
    expect(format('select distinct * from t')).toBe('SELECT DISTINCT\n  *\nFROM t');
    expect(format('select count(*), t.* from t')).toBe('SELECT\n  count(*),\n  t.*\nFROM t');
  });

  it('indents a subquery, and keeps other brackets on the line', () => {
    expect(format('select * from (select id from t where x in (1,2,3)) s where s.id > 5')).toBe(
      `SELECT
  *
FROM (
  SELECT
    id
  FROM t
  WHERE x IN (1, 2, 3)
) s
WHERE s.id > 5`
    );
  });

  it('formats a WITH query', () => {
    expect(format('with recent as (select * from orders where created > now()) select count(*) from recent')).toBe(
      `WITH recent AS (
  SELECT
    *
  FROM orders
  WHERE created > now()
)
SELECT
  count(*)
FROM recent`
    );
  });

  it('does not break BETWEEN … AND …, a CASE, or a condition inside brackets', () => {
    expect(format('select case when a = 1 and b = 2 then 1 else 0 end from t where d between 1 and 5 and (x = 1 or y = 2)')).toBe(
      `SELECT
  CASE WHEN a = 1 AND b = 2 THEN 1 ELSE 0 END
FROM t
WHERE d BETWEEN 1 AND 5
  AND (x = 1 OR y = 2)`
    );
  });

  it('formats INSERT, UPDATE and DELETE', () => {
    expect(format("insert into users (name, age) values ('Ada', 36), ('Bob', -1) returning id")).toBe(
      "INSERT INTO users (name, age)\nVALUES ('Ada', 36), ('Bob', -1)\nRETURNING id"
    );
    expect(format('update users set name = :name, age = age + 1 where id = ?')).toBe('UPDATE users\nSET\n  name = :name,\n  age = age + 1\nWHERE id = ?');
    expect(format('delete from users where id = 1')).toBe('DELETE FROM users\nWHERE id = 1');
  });

  it('puts the columns of CREATE TABLE under each other', () => {
    expect(format('create table users (id int primary key, name varchar(100) not null, created timestamp default now())')).toBe(
      `CREATE TABLE users (
  id int PRIMARY KEY,
  name varchar(100) NOT NULL,
  created timestamp DEFAULT now()
)`
    );
  });

  it('separates statements with an empty line', () => {
    expect(format('select 1; select 2;')).toBe('SELECT\n  1;\n\nSELECT\n  2;');
  });

  it('keeps comments, and nothing follows a line comment on its line', () => {
    expect(format('select a, -- the id\n b /* name */ from t')).toBe('SELECT\n  a, -- the id\n  b /* name */\nFROM t');
  });

  it('writes keywords in the chosen case and leaves names alone', () => {
    const sql = 'Select Name From Users Where Id = 1';
    expect(format(sql, { keywords: 'lower' })).toBe('select\n  Name\nfrom Users\nwhere Id = 1');
    expect(format(sql, { keywords: 'keep' })).toBe('Select\n  Name\nFrom Users\nWhere Id = 1');
    expect(format(sql)).toBe('SELECT\n  Name\nFROM Users\nWHERE Id = 1');
  });

  it('indents with what it is given', () => {
    expect(format('select a from t where x = 1 and y = 2', { indent: '    ' })).toBe('SELECT\n    a\nFROM t\nWHERE x = 1\n    AND y = 2');
  });

  it('handles casts, signs and string concatenation', () => {
    expect(format("select a::text || '-' || b, -1, x - 1, +2 from t")).toBe("SELECT\n  a::text || '-' || b,\n  -1,\n  x - 1,\n  +2\nFROM t");
  });

  const queries = [
    'select u.id, count(*) from users u join orders o on o.user_id = u.id and o.paid where u.x between 1 and 2 or u.y is null group by u.id having count(*) > 1 order by 2 desc limit 5 offset 10',
    'with a as (select 1), b as (select * from a where exists (select 1 from c)) select * from b union all select * from a',
    "insert into t (a, b) select x, y from u where z like '%;%' on conflict (a) do update set b = excluded.b",
    'select case when a then (select max(x) from y) else 0 end as m, coalesce(b, -1) from t -- end'
  ];

  it('changes nothing but whitespace and the case of keywords', () => {
    for (const sql of queries) expect(substance(format(sql)), sql).toBe(substance(sql));
  });

  it('gives the same result when it formats its own output', () => {
    for (const sql of queries) {
      const once = format(sql);
      expect(format(once), sql).toBe(once);
    }
  });

  it('gives an empty result for an empty input', () => {
    expect(format('')).toBe('');
    expect(format('  \n ')).toBe('');
  });
});
