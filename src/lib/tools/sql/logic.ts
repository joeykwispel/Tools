/**
 * Laying out SQL so it can be read: one clause per line, the columns of a SELECT under each other, AND and OR on their
 * own lines, subqueries indented. It only moves whitespace and changes the case of keywords: it does not understand the
 * query, so it works for any dialect and never changes what the query means.
 */

export interface Token {
  type: 'word' | 'string' | 'number' | 'operator' | 'punctuation' | 'comment' | 'other';
  text: string;
  /** The token was the first on its line in the source: tells a comment of its own from one behind code */
  lineStart: boolean;
}

const TOKEN = new RegExp(
  [
    '(?<space>\\s+)',
    '(?<comment>--[^\\n]*|/\\*[\\s\\S]*?(?:\\*/|$))',
    // 'text' with '' or \' inside, "identifiers", `identifiers`, and PostgreSQL's $tag$ text $tag$
    '(?<string>\'(?:[^\'\\\\]|\\\\[\\s\\S]|\'\')*\'?|"(?:[^"]|"")*"?|`[^`]*`?|\\$(?<tag>[A-Za-z_]*)\\$[\\s\\S]*?(?:\\$\\k<tag>\\$|$))',
    '(?<number>[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)',
    // names, and placeholders like :name, @name and $1
    '(?<word>[\\p{L}_][\\p{L}\\p{N}_$]*|[:@$][\\p{L}\\p{N}_]+|\\?)',
    '(?<operator>::|<>|!=|<=|>=|\\|\\||->>|->|[-+*/%=<>])',
    '(?<punctuation>[(),;.])',
    '(?<other>[\\s\\S])'
  ].join('|'),
  'uy'
);

/** Cuts SQL into tokens; whitespace is dropped. Every other character of the input ends up in a token. */
export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  TOKEN.lastIndex = 0;
  let lineStart = true;
  for (let match = TOKEN.exec(sql); match; match = TOKEN.exec(sql)) {
    const groups = match.groups!;
    if (groups.space !== undefined) {
      lineStart ||= groups.space.includes('\n');
      continue;
    }
    const type = (['comment', 'string', 'number', 'word', 'operator', 'punctuation', 'other'] as const).find((t) => groups[t] !== undefined);
    if (type) tokens.push({ type, text: match[0], lineStart });
    lineStart = false;
  }
  return tokens;
}

/** Words that are written in the chosen case. Function names (count, coalesce, …) are left as they are. */
const KEYWORDS = new Set(
  `add all alter and any as asc begin between by cascade case check column commit conflict constraint create cross current_date
  current_timestamp default delete desc distinct do drop else end except exists false fetch filter first following for foreign from full
  group having if ilike in index inner insert intersect into is join key last lateral left like limit natural not nothing null nulls offset
  on only or order outer over partition preceding primary range recursive references returning right rollback row rows select set table
  then to top true truncate union unique update using values view when where window with`.split(/\s+/)
);

/** Keywords of several words that start a clause or a join; the longest that fits is taken. */
const PHRASES = [
  ['left', 'outer', 'join'],
  ['right', 'outer', 'join'],
  ['full', 'outer', 'join'],
  ['left', 'join'],
  ['right', 'join'],
  ['full', 'join'],
  ['inner', 'join'],
  ['cross', 'join'],
  ['natural', 'join'],
  ['group', 'by'],
  ['order', 'by'],
  ['insert', 'into'],
  ['delete', 'from'],
  ['union', 'all'],
  ['create', 'table'],
  ['on', 'conflict']
];

/** Clauses whose items go under each other, one per line. */
const LIST_CLAUSES = new Set(['select', 'set']);
/** Clauses that start a line and keep what follows on it. */
const LINE_CLAUSES = new Set(
  'from where group by|order by|having|limit|offset|fetch|union|union all|except|intersect|values|insert into|update|delete from|with|returning|window|create table|on conflict'
    .replace('from where group by', 'from|where|group by')
    .split('|')
);
/** Clauses in which AND and OR start a new line. */
const CONDITION_CLAUSES = new Set(['where', 'having', 'join']);

export interface Options {
  /** How keywords are written; 'keep' leaves them as they were typed */
  keywords?: 'upper' | 'lower' | 'keep';
  /** What one level is indented with */
  indent?: string;
}

interface Level {
  /** How deep this query is nested */
  depth: number;
  clause: string;
  /** Open brackets that are not a subquery: function calls, IN lists, tuples */
  brackets: number;
  /** In a list clause, before its first item */
  awaitingItem: boolean;
  /** This level is a list between brackets (the columns of CREATE TABLE): its commas break the line */
  list: boolean;
}

/** The SQL laid out for reading. */
export function format(sql: string, { keywords = 'upper', indent = '  ' }: Options = {}): string {
  const tokens = tokenize(sql);
  const lower = tokens.map((t) => (t.type === 'word' ? t.text.toLowerCase() : ''));
  const lines: string[] = [''];
  const levels: Level[] = [{ depth: 0, clause: '', brackets: 0, awaitingItem: false, list: false }];
  let level = levels[0];
  /** The previous token written, for deciding about the space before the next one */
  let previous: Token | null = null;
  let previousWasKeyword = false;
  /** After BETWEEN, the next AND belongs to it and does not start a line */
  let between = false;
  let caseDepth = 0;
  let glue = false;

  const cased = (text: string) => (keywords === 'upper' ? text.toUpperCase() : keywords === 'lower' ? text.toLowerCase() : text);
  const newline = (extra = 0) => {
    const pad = indent.repeat(level.depth + extra);
    if (lines.at(-1)!.trim() === '') lines[lines.length - 1] = pad;
    else lines.push(pad);
  };
  const write = (text: string, space: boolean) => {
    const line = lines.at(-1)!;
    lines[lines.length - 1] = line + (space && line.trim() !== '' && !glue ? ' ' : '') + text;
    glue = false;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'comment') {
      // a comment behind code stays behind that code, also when a new line was just started for what comes next
      if (!token.lineStart && lines.length > 1 && lines.at(-1)!.trim() === '') {
        lines[lines.length - 2] += ` ${token.text}`;
        continue;
      }
      write(token.text, true);
      // nothing may follow a -- comment on its line
      if (token.text.startsWith('--')) lines.push(indent.repeat(level.depth + (level.clause ? 1 : 0)));
      continue;
    }

    // a keyword of several words counts as one
    let word = lower[i];
    let text = token.text;
    if (word) {
      const phrase = PHRASES.find((p) => p.every((part, j) => lower[i + j] === part));
      if (phrase) {
        word = phrase.join(' ');
        text = tokens
          .slice(i, i + phrase.length)
          .map((t) => t.text)
          .join(' ');
        i += phrase.length - 1;
      }
    }
    const isKeyword = word !== '' && (KEYWORDS.has(word) || word.includes(' '));
    const out = isKeyword ? cased(text) : text;
    const top = level.brackets === 0;
    const isJoin = word.endsWith('join');

    if (token.text === ';') {
      write(';', false);
      // the next statement starts from scratch, after an empty line
      levels.length = 1;
      level = levels[0];
      Object.assign(level, { clause: '', brackets: 0, awaitingItem: false });
      between = false;
      caseDepth = 0;
      if (tokens.slice(i + 1).some((t) => t.type !== 'comment' || true)) lines.push('', '');
    } else if (token.text === '(') {
      const next = lower.slice(i + 1).find((_, j) => tokens[i + 1 + j].type !== 'comment');
      const subquery = next === 'select' || next === 'with';
      const columns = level.clause === 'create table' && top;
      // "count(" but "IN (", and a space before the column list of INSERT INTO t (…) and CREATE TABLE t (…)
      const afterName = top && (level.clause === 'insert into' || level.clause === 'create table');
      write('(', previous !== null && (previousWasKeyword || previous.type !== 'word' || afterName) && previous.text !== '(');
      if (subquery || columns) {
        level = { depth: level.depth + 1, clause: '', brackets: 0, awaitingItem: false, list: columns };
        levels.push(level);
        newline();
      } else {
        level.brackets++;
        glue = true;
      }
    } else if (token.text === ')') {
      if (level.brackets > 0) {
        level.brackets--;
        write(')', false);
      } else if (levels.length > 1) {
        levels.pop();
        level = levels.at(-1)!;
        newline(level.clause && !LIST_CLAUSES.has(level.clause) ? 0 : level.clause ? 1 : 0);
        write(')', false);
      } else write(')', false);
    } else if (token.text === ',') {
      write(',', false);
      if (top && (LIST_CLAUSES.has(level.clause) || level.list)) newline(level.list ? 0 : 1);
    } else if (token.text === '.') {
      write('.', false);
      glue = true;
    } else if (token.text === '::') {
      write('::', false);
      glue = true;
    } else if (top && caseDepth === 0 && LIST_CLAUSES.has(word)) {
      newline();
      write(out, true);
      level.clause = word;
      level.awaitingItem = true;
    } else if (top && caseDepth === 0 && (LINE_CLAUSES.has(word) || isJoin)) {
      newline();
      write(out, true);
      level.clause = isJoin ? 'join' : word;
      level.awaitingItem = false;
    } else if (top && caseDepth === 0 && (word === 'and' || word === 'or') && CONDITION_CLAUSES.has(level.clause) && !between) {
      newline(1);
      write(out, true);
    } else {
      if (word === 'and') between = false;
      if (word === 'between') between = true;
      if (word === 'case') caseDepth++;
      if (word === 'end' && caseDepth > 0) caseDepth--;
      // the first column of a SELECT goes on its own line; DISTINCT and ALL stay behind the keyword
      if (level.awaitingItem && top && word !== 'distinct' && word !== 'all' && word !== 'top') {
        level.awaitingItem = false;
        newline(1);
      }
      // a sign in front of a value (-1) sticks to it; between two values (a - 1) it has spaces
      const sign =
        (token.text === '-' || token.text === '+') && (previous === null || previousWasKeyword || previous.type === 'operator' || '(,'.includes(previous.text));
      const afterOpen = previous?.text === '(';
      write(out, !afterOpen);
      if (sign) glue = true;
    }

    previous = token;
    previousWasKeyword = isKeyword;
  }

  return lines
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
