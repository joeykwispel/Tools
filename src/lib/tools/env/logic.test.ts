import { describe, expect, it } from 'vitest';
import { envName, fromJson, parseEnv, quote, toJson } from './logic';

const values = (text: string) => Object.fromEntries(parseEnv(text).values);
const problems = (text: string) => parseEnv(text).problems.map((p) => `${p.line} ${p.kind} ${p.text}`);

describe('parseEnv', () => {
  it('reads names and values, skipping comments and empty lines', () => {
    expect(
      values(`
# the database
DB_HOST=localhost
DB_PORT=5432

export API_KEY=abc123
EMPTY=
`)
    ).toEqual({ DB_HOST: 'localhost', DB_PORT: '5432', API_KEY: 'abc123', EMPTY: '' });
  });

  it('trims unquoted values and ends them at a comment', () => {
    expect(values('A =  hello world  \nB=value # a comment\nC=a#b\nD=# only a comment?')).toEqual({
      A: 'hello world',
      B: 'value',
      C: 'a#b',
      D: '# only a comment?'
    });
  });

  it('takes single quotes literally, and reads escapes in double quotes', () => {
    expect(values(`A='keep $THIS \\n as it is # too'\nB="line one\\nline two\\t\\"quoted\\" \\\\ # kept"\nC=\`back tick\``)).toEqual({
      A: 'keep $THIS \\n as it is # too',
      B: 'line one\nline two\t"quoted" \\ # kept',
      C: 'back tick'
    });
  });

  it('reads a double-quoted value that runs over several lines', () => {
    expect(values('KEY="-----BEGIN-----\nabc\ndef\n-----END-----"\nNEXT=1')).toEqual({ KEY: '-----BEGIN-----\nabc\ndef\n-----END-----', NEXT: '1' });
  });

  it('ignores what follows a closing quote, such as a comment', () => {
    expect(values('A="x" # note\nB=\'y\'   ')).toEqual({ A: 'x', B: 'y' });
  });

  it('keeps an equals sign inside a value', () => {
    expect(values('URL=postgres://u:p@host/db?sslmode=require&x=1')).toEqual({ URL: 'postgres://u:p@host/db?sslmode=require&x=1' });
  });

  it('reports lines it can not read, with their line number, and reads the rest', () => {
    const text = 'GOOD=1\njust some words\n2BAD=x\nMY VAR=y\nOPEN="never closed\n';
    expect(values(text)).toEqual({ GOOD: '1' });
    expect(problems(text)).toEqual(['2 noEquals just some words', '3 badName 2BAD', '4 badName MY VAR', '5 openQuote OPEN']);
  });

  it('lets the last of two equal names win, and says so', () => {
    expect(values('A=1\nB=2\nA=3')).toEqual({ A: '3', B: '2' });
    expect(problems('A=1\nB=2\nA=3')).toEqual(['3 duplicate A']);
  });

  it('accepts Windows line endings', () => {
    expect(values('A=1\r\nB=2\r\n')).toEqual({ A: '1', B: '2' });
  });
});

describe('toJson', () => {
  it('writes the variables as an object of strings', () => {
    expect(toJson(parseEnv('PORT=3000\nDEBUG=true'))).toBe('{\n  "PORT": "3000",\n  "DEBUG": "true"\n}');
    expect(toJson(parseEnv(''))).toBe('{}');
  });
});

describe('quote', () => {
  it('leaves simple values bare and quotes the rest', () => {
    expect(quote('localhost')).toBe('localhost');
    expect(quote('https://example.com/a?b=1,2')).toBe('"https://example.com/a?b=1,2"');
    expect(quote('user@example.com')).toBe('user@example.com');
    expect(quote('')).toBe('');
    expect(quote('hello world')).toBe('"hello world"');
    expect(quote('a#b')).toBe('"a#b"');
    expect(quote('say "hi"\n')).toBe('"say \\"hi\\"\\n"');
    expect(quote("it's")).toBe('"it\'s"');
  });

  it('writes values that are read back the same', () => {
    for (const value of ['plain', 'with space', ' padded ', 'a#b', 'a #b', 'q"uote', "it's", 'line\nbreak', 'back\\slash', '$VAR', 'tab\there', ''])
      expect(values(`X=${quote(value)}`).X, JSON.stringify(value)).toBe(value);
  });
});

describe('envName', () => {
  it('writes a name the environment way', () => {
    expect(envName('apiUrl')).toBe('API_URL');
    expect(envName('api-url')).toBe('API_URL');
    expect(envName('DB_HOST')).toBe('DB_HOST');
    expect(envName('db.host name')).toBe('DB_HOST_NAME');
    expect(envName('port2')).toBe('PORT2');
  });
});

describe('fromJson', () => {
  it('writes one line per value', () => {
    expect(fromJson({ PORT: 3000, DEBUG: true, NAME: 'my app', NOTHING: null })).toEqual({
      ok: true,
      text: 'PORT=3000\nDEBUG=true\nNAME="my app"\nNOTHING=\n',
      count: 4
    });
  });

  it('flattens nested objects and arrays', () => {
    expect(fromJson({ db: { host: 'localhost', ports: [5432, 5433] }, apiKey: 'x' })).toEqual({
      ok: true,
      text: 'DB_HOST=localhost\nDB_PORTS_0=5432\nDB_PORTS_1=5433\nAPI_KEY=x\n',
      count: 4
    });
  });

  it('can keep the names as they are', () => {
    expect(fromJson({ apiKey: 'x', db: { host: 'y' } }, false)).toMatchObject({ text: 'apiKey=x\ndb_host=y\n' });
  });

  it('goes round: an environment file to JSON and back gives the same variables', () => {
    const source = 'A=1\nB="two words"\nC=\nD="multi\\nline"\n';
    const again = fromJson(JSON.parse(toJson(parseEnv(source))), false);
    expect(again.ok && values(again.text)).toEqual(values(source));
  });

  it('needs an object', () => {
    for (const value of [[1, 2], 'text', 42, null]) expect(fromJson(value)).toEqual({ ok: false, error: 'notObject' });
    expect(fromJson({})).toEqual({ ok: true, text: '', count: 0 });
  });
});
