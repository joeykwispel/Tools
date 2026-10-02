/** Environment files (.env, as dotenv reads them) to JSON and back. */

export interface Problem {
  /** Line in the input, from 1 */
  line: number;
  kind:
    | /** no = on the line */ 'noEquals'
    | /** a name with characters a variable can't have */ 'badName'
    | /** a quote that is never closed */ 'openQuote'
    | /** the name was used before; this one wins */ 'duplicate';
  /** The name, or the start of the line */
  text: string;
}

export interface Env {
  /** Name → value, in the order of the file; a name used twice keeps its first place and its last value */
  values: Map<string, string>;
  problems: Problem[];
}

const NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const DOUBLE_ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' };

/**
 * Reads an environment file. Per line: NAME=value, optionally after "export". A value may be in single quotes (taken
 * literally), double quotes (with \n, \t, \" and \\, and it may run over several lines) or backticks; without quotes it
 * is trimmed and ends at a # that follows a space. Lines that are empty or start with # are skipped.
 */
export function parseEnv(text: string): Env {
  const values = new Map<string, string>();
  const problems: Problem[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const number = i + 1;
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals === -1) {
      problems.push({ line: number, kind: 'noEquals', text: line.slice(0, 40) });
      continue;
    }
    const name = line
      .slice(0, equals)
      .replace(/^export\s+/, '')
      .trim();
    if (!NAME.test(name)) {
      problems.push({ line: number, kind: 'badName', text: name.slice(0, 40) });
      continue;
    }

    let rest = line.slice(equals + 1).trimStart();
    let value: string;
    const quote = rest[0];
    if (quote === '"' || quote === "'" || quote === '`') {
      // find the closing quote; inside double quotes a backslash escapes the next character, and the value may span lines
      let body = '';
      let closed = false;
      for (let at = 1; ; at++) {
        if (at >= rest.length) {
          if (quote === "'" || i + 1 >= lines.length) break;
          body += '\n';
          rest = lines[++i];
          at = -1;
          continue;
        }
        const ch = rest[at];
        if (ch === quote) {
          closed = true;
          break;
        }
        if (quote === '"' && ch === '\\' && at + 1 < rest.length) {
          const next = rest[++at];
          body += DOUBLE_ESCAPES[next] ?? `\\${next}`;
        } else body += ch;
      }
      if (!closed) {
        problems.push({ line: number, kind: 'openQuote', text: name });
        continue;
      }
      value = body;
    } else {
      // a comment starts at a # that follows whitespace: "a#b" is a value, "a #b" is a with a comment
      value = rest.replace(/\s+#.*$/, '').trim();
    }

    if (values.has(name)) problems.push({ line: number, kind: 'duplicate', text: name });
    values.set(name, value);
  }
  return { values, problems };
}

/** The variables as a JSON object. Every value is a string: an environment has no other type. */
export const toJson = (env: Env, indent = 2) => JSON.stringify(Object.fromEntries(env.values), null, indent);

/** A value as it is written in an environment file: bare when that is safe, otherwise in double quotes with escapes. */
export function quote(value: string): string {
  if (value === '') return '';
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\t', '\\t')}"`;
}

/** "apiUrl" and "api-url" → "API_URL": the way environment variables are named. */
export const envName = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

export type FromJson = { ok: true; text: string; count: number } | { ok: false; error: 'notObject' };

/**
 * A JSON object as an environment file. Nested objects and arrays are flattened, their names joined with _
 * ({"db": {"host": "x"}} → DB_HOST=x, {"hosts": ["a"]} → HOSTS_0=a); null becomes an empty value.
 * With `rename`, names are written the environment way (apiUrl → API_URL).
 */
export function fromJson(value: unknown, rename = true): FromJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'notObject' };
  const lines: string[] = [];
  const walk = (node: unknown, prefix: string) => {
    if (node && typeof node === 'object') {
      for (const [key, inner] of Object.entries(node)) walk(inner, prefix ? `${prefix}_${rename ? envName(key) : key}` : rename ? envName(key) : key);
    } else lines.push(`${prefix}=${quote(node === null || node === undefined ? '' : String(node))}`);
  };
  walk(value, '');
  return { ok: true, text: lines.join('\n') + (lines.length ? '\n' : ''), count: lines.length };
}
