/**
 * A curl command read the way a shell and curl read it, and the same request written as fetch().
 * Three steps: the command line is split into words (quotes, backslashes, line continuations), the words are read as
 * curl's options, and the request that comes out is written as JavaScript.
 */
import { encodeText } from '../base64/logic';

export type Tokens = { ok: true; tokens: string[] } | { ok: false };

const ANSI: Record<string, string> = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', e: '\x1b', f: '\f', v: '\v', '\\': '\\', "'": "'", '"': '"' };

/** What Windows' cmd makes of a line before curl sees it: ^ escapes the next character, and ^ at the end joins the lines. */
const fromCmd = (command: string) => command.replace(/\^(\r?\n|[\s\S])/g, (_, next: string) => (/\r?\n/.test(next) ? '' : next));

/**
 * Splits a command line into words like bash does: '…' is literal, "…" allows \" and \\, $'…' knows \n and \x41, a
 * backslash escapes one character, and a backslash at the end of a line joins it with the next. A command copied for
 * Windows' cmd (with ^) is read too. Not ok when a quote is never closed.
 */
export function tokenize(command: string): Tokens {
  const cmd = /\^\r?\n|\^"/.test(command);
  const text = cmd ? fromCmd(command) : command;
  const tokens: string[] = [];
  let word: string | null = null;
  let i = 0;
  const add = (piece: string) => (word = (word ?? '') + piece);
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (word !== null) tokens.push(word);
      word = null;
      i++;
    } else if (ch === '\\' && !cmd) {
      // a backslash before a line break is a line that goes on; before anything else it makes that character plain
      if (text[i + 1] === '\n') i += 2;
      else if (text[i + 1] === '\r' && text[i + 2] === '\n') i += 3;
      else {
        add(text[i + 1] ?? '');
        i += 2;
      }
    } else if (ch === "'" && !cmd) {
      const end = text.indexOf("'", i + 1);
      if (end < 0) return { ok: false };
      add(text.slice(i + 1, end));
      i = end + 1;
    } else if (ch === '$' && text[i + 1] === "'" && !cmd) {
      let piece = '';
      for (i += 2; text[i] !== "'"; i++) {
        if (i >= text.length) return { ok: false };
        if (text[i] !== '\\') {
          piece += text[i];
          continue;
        }
        const rest = text.slice(i + 1);
        const code = /^x[0-9a-fA-F]{1,2}|^u[0-9a-fA-F]{1,4}|^U[0-9a-fA-F]{1,8}/.exec(rest);
        const octal = /^[0-7]{1,3}/.exec(rest);
        if (code) {
          piece += String.fromCodePoint(Math.min(parseInt(code[0].slice(1), 16), 0x10ffff));
          i += code[0].length;
        } else if (octal) {
          piece += String.fromCharCode(parseInt(octal[0], 8));
          i += octal[0].length;
        } else {
          piece += ANSI[rest[0]] ?? `\\${rest[0] ?? ''}`;
          i++;
        }
      }
      add(piece);
      i++;
    } else if (ch === '"') {
      let piece = '';
      for (i++; text[i] !== '"'; i++) {
        if (i >= text.length) return { ok: false };
        // in bash a backslash only counts before these; for cmd, curl itself reads \" as a quote
        if (text[i] === '\\' && (cmd ? '"\\' : '"\\$`').includes(text[i + 1] ?? ' ')) piece += text[++i];
        else if (text[i] === '\\' && text[i + 1] === '\n' && !cmd) i++;
        else piece += text[i];
      }
      add(piece);
      i++;
    } else {
      add(ch);
      i++;
    }
  }
  if (word !== null) tokens.push(word);
  return { ok: true, tokens };
}

export interface Field {
  name: string;
  /** The value, or the name of the file when `file` */
  value: string;
  file: boolean;
}

export type Body =
  { kind: 'text'; text: string } | { kind: 'form'; fields: Field[] } | /** read by curl from a file, which a page can not do */ { kind: 'file'; name: string };

export interface Request {
  url: string;
  method: string;
  headers: [name: string, value: string][];
  body: Body | null;
  /** From --max-time: after this many milliseconds the request is given up */
  timeout: number | null;
}

export type NoteId =
  /** the address had no scheme: curl takes http:// */
  | 'scheme'
  /** -k: fetch can not skip the check of a certificate */
  | 'insecure'
  /** a Cookie header: a browser does not let a page set it */
  | 'cookie'
  /** data read from a file */
  | 'file'
  /** a body with GET or HEAD: fetch refuses that */
  | 'bodyWithGet'
  /** more than one address: only the first is used */
  | 'urls'
  /** options with no counterpart in fetch */
  | 'ignored';

export interface Note {
  id: NoteId;
  vars: Record<string, string>;
}

export type ErrorId = 'empty' | 'notCurl' | 'quote' | 'noUrl' | 'missing';
export type Parsed = { ok: true; request: Request; notes: Note[] } | { ok: false; error: ErrorId; vars: Record<string, string> };

/** Short options and the long ones they stand for. */
const SHORT: Record<string, string> = {
  X: 'request',
  H: 'header',
  d: 'data',
  F: 'form',
  u: 'user',
  A: 'user-agent',
  e: 'referer',
  b: 'cookie',
  I: 'head',
  G: 'get',
  k: 'insecure',
  m: 'max-time',
  r: 'range',
  o: 'output',
  x: 'proxy',
  c: 'cookie-jar',
  w: 'write-out',
  T: 'upload-file',
  E: 'cert',
  K: 'config',
  D: 'dump-header',
  C: 'continue-at',
  U: 'proxy-user',
  z: 'time-cond',
  L: 'location',
  s: 'silent',
  S: 'show-error',
  v: 'verbose',
  i: 'include',
  f: 'fail',
  O: 'remote-name',
  J: 'remote-header-name',
  N: 'no-buffer',
  g: 'globoff',
  '#': 'progress-bar',
  '4': 'ipv4',
  '6': 'ipv6',
  '0': 'http1.0',
  n: 'netrc',
  q: 'disable',
  a: 'append',
  R: 'remote-time',
  j: 'junk-session-cookies'
};

/** Options that are followed by a value. */
const WITH_VALUE = new Set(
  (
    'request header data data-raw data-binary data-ascii data-urlencode json form form-string user user-agent referer cookie url max-time range ' +
    'oauth2-bearer output proxy cookie-jar write-out upload-file cert key cacert capath config dump-header continue-at proxy-user time-cond ' +
    'connect-timeout retry retry-delay retry-max-time resolve limit-rate max-redirs interface ciphers tls-max connect-to unix-socket proto ' +
    'request-target aws-sigv4 max-filesize speed-limit speed-time keepalive-time dns-servers cert-type key-type pass pinnedpubkey trace ' +
    'trace-ascii stderr netrc-file local-port quote expect100-timeout proxy-header noproxy'
  ).split(' ')
);

/** Options about how curl runs or what it prints, or that fetch does by itself: nothing to say about them. */
const SILENT = new Set(
  (
    'location location-trusted silent show-error verbose include fail fail-with-body compressed no-buffer progress-bar globoff output ' +
    'remote-name remote-header-name http1.0 http1.1 http2 http2-prior-knowledge http3 no-keepalive tcp-nodelay ipv4 ipv6 write-out ' +
    'disable no-progress-meter styled-output trace trace-ascii stderr dump-header'
  ).split(' ')
);

/** A value for --data-urlencode: `name=text` keeps the name and escapes the text; just `text` or `=text` escapes it all. */
function urlencode(value: string): string {
  const at = value.indexOf('=');
  const escape = (text: string) => encodeURIComponent(text).replaceAll('%20', '+');
  return at <= 0 ? escape(value.slice(at + 1)) : `${value.slice(0, at)}=${escape(value.slice(at + 1))}`;
}

/** Reads a curl command: the request it makes, and what in it has no counterpart in fetch. */
export function parse(command: string): Parsed {
  const fail = (error: ErrorId, vars: Record<string, string> = {}): Parsed => ({ ok: false, error, vars });
  if (!command.trim()) return fail('empty');
  const split = tokenize(command);
  if (!split.ok) return fail('quote');
  const words = split.tokens[0] === '$' ? split.tokens.slice(1) : split.tokens;
  if (!/^(.*[\\/])?curl(\.exe)?$/i.test(words[0] ?? '')) return fail('notCurl', { word: words[0] ?? '' });

  const urls: string[] = [];
  const headers: [string, string][] = [];
  const data: string[] = [];
  const fields: Field[] = [];
  const ignored: string[] = [];
  const notes: Note[] = [];
  const note = (id: NoteId, vars: Record<string, string> = {}) => notes.push({ id, vars });
  let method = '';
  let [head, get, json] = [false, false, false];
  let file: string | null = null;
  let timeout: number | null = null;
  let referrer = '';

  const apply = (name: string, value: string, written: string) => {
    switch (name) {
      case 'url':
        urls.push(value);
        break;
      case 'request':
        method = value.toUpperCase();
        break;
      case 'header': {
        const at = value.indexOf(':');
        // "Name;" is a header without a value; "Name:" takes away one curl would send by itself
        if (at < 0 && value.endsWith(';')) headers.push([value.slice(0, -1).trim(), '']);
        else if (at > 0 && value.slice(at + 1).trim()) headers.push([value.slice(0, at).trim(), value.slice(at + 1).trim()]);
        break;
      }
      case 'data':
      case 'data-ascii':
      case 'data-binary':
        if (value.startsWith('@')) file = value.slice(1);
        else data.push(value);
        break;
      case 'data-raw':
        data.push(value);
        break;
      case 'data-urlencode':
        if (/^[^=]*@/.test(value)) file = value.slice(value.indexOf('@') + 1);
        else data.push(urlencode(value));
        break;
      case 'json':
        json = true;
        if (value.startsWith('@')) file = value.slice(1);
        else data.push(value);
        break;
      case 'form':
      case 'form-string': {
        const at = value.indexOf('=');
        const content = value.slice(at + 1);
        const isFile = name === 'form' && /^[@<]/.test(content);
        // name=@photo.png;type=image/png: what comes after the ; is about the file, not part of its name
        fields.push({ name: at < 0 ? value : value.slice(0, at), value: isFile ? content.slice(1).split(';')[0] : content, file: isFile });
        break;
      }
      case 'user':
        headers.push(['Authorization', `Basic ${encodeText(value)}`]);
        break;
      case 'oauth2-bearer':
        headers.push(['Authorization', `Bearer ${value}`]);
        break;
      case 'user-agent':
        headers.push(['User-Agent', value]);
        break;
      case 'cookie':
        headers.push(['Cookie', value]);
        break;
      case 'range':
        headers.push(['Range', `bytes=${value}`]);
        break;
      case 'referer':
        referrer = value;
        break;
      case 'max-time':
        timeout = Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value) * 1000) : null;
        break;
      case 'head':
        head = true;
        break;
      case 'get':
        get = true;
        break;
      case 'insecure':
        note('insecure');
        break;
      default:
        if (!SILENT.has(name) && !ignored.includes(written)) ignored.push(written);
    }
  };

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (word.startsWith('--') && word.length > 2) {
      const name = word.slice(2);
      if (WITH_VALUE.has(name)) {
        if (i + 1 >= words.length) return fail('missing', { option: word });
        apply(name, words[++i], word);
      } else apply(name, '', word);
    } else if (word.startsWith('-') && word.length > 1 && word !== '--') {
      // -sSL is three options; -XPOST and -H'…' carry their value against them
      for (let at = 1; at < word.length; at++) {
        const name = SHORT[word[at]] ?? word[at];
        if (!WITH_VALUE.has(name)) {
          apply(name, '', `-${word[at]}`);
          continue;
        }
        const attached = word.slice(at + 1);
        if (!attached && i + 1 >= words.length) return fail('missing', { option: `-${word[at]}` });
        apply(name, attached || words[++i], `-${word[at]}`);
        break;
      }
    } else if (word !== '--') urls.push(word);
  }

  if (!urls.length) return fail('noUrl');
  if (urls.length > 1) note('urls', { count: String(urls.length) });
  let url = urls[0];
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    url = `http://${url}`;
    note('scheme');
  }

  const has = (name: string) => headers.some(([known]) => known.toLowerCase() === name);
  let body: Body | null = null;
  if (get && data.length) url += (url.includes('?') ? '&' : '?') + data.join('&');
  else if (fields.length) body = { kind: 'form', fields };
  else if (file !== null) body = { kind: 'file', name: file };
  else if (data.length) body = { kind: 'text', text: json ? data.join('') : data.join('&') };

  // what curl adds by itself and fetch does not
  if (json) {
    if (!has('content-type')) headers.push(['Content-Type', 'application/json']);
    if (!has('accept')) headers.push(['Accept', 'application/json']);
  } else if (body && body.kind !== 'form' && !has('content-type')) headers.push(['Content-Type', 'application/x-www-form-urlencoded']);
  if (referrer) headers.push(['Referer', referrer]);

  if (!method) method = head ? 'HEAD' : body ? 'POST' : 'GET';
  if (body && (method === 'GET' || method === 'HEAD')) note('bodyWithGet', { method });
  if (body?.kind === 'file') note('file', { name: body.name });
  if (fields.some((field) => field.file)) note('file', { name: fields.find((field) => field.file)?.value ?? '' });
  if (has('cookie')) note('cookie');
  if (ignored.length) note('ignored', { options: ignored.join(', ') });
  return { ok: true, request: { url, method, headers, body, timeout }, notes };
}

const ESCAPES: Record<string, string> = { '\\': '\\\\', "'": "\\'", '\n': '\\n', '\r': '\\r', '\t': '\\t' };

/** A string as JavaScript writes it, in single quotes. */
export function quote(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // control characters and the two line separators would break the line the string is on
    const plain = code >= 0x20 && code !== 0x7f && code !== 0x2028 && code !== 0x2029;
    out += ESCAPES[ch] ?? (plain ? ch : `\\u${code.toString(16).padStart(4, '0')}`);
  }
  return `'${out}'`;
}

const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name));

/** A value from JSON written as a JavaScript literal: keys without quotes where that can be, strings in single quotes. */
export function literal(value: unknown, indent = ''): string {
  const deeper = `${indent}  `;
  if (typeof value === 'string') return quote(value);
  if (Array.isArray(value)) return value.length ? `[\n${value.map((item) => deeper + literal(item, deeper)).join(',\n')}\n${indent}]` : '[]';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    return entries.length ? `{\n${entries.map(([name, item]) => `${deeper}${key(name)}: ${literal(item, deeper)}`).join(',\n')}\n${indent}}` : '{}';
  }
  return String(value);
}

/** The body as an object when it is JSON and sent as JSON, so it can be written with JSON.stringify(). */
function jsonBody(request: Request): unknown {
  if (request.body?.kind !== 'text') return undefined;
  if (!request.headers.some(([name, value]) => name.toLowerCase() === 'content-type' && /json/i.test(value))) return undefined;
  try {
    const value: unknown = JSON.parse(request.body.text);
    return value && typeof value === 'object' ? value : undefined;
  } catch {
    return undefined;
  }
}

export type Reading = 'json' | 'text' | 'none';

/** The request as fetch() code. `reading` is what to do with the answer. */
export function toFetch(request: Request, reading: Reading = 'json'): string {
  const lines: string[] = [];
  const options: string[] = [];
  const { body } = request;
  if (request.method !== 'GET') options.push(`method: ${quote(request.method)}`);

  // Referer can not be set as a header: fetch has an option of its own for it
  const referrer = request.headers.find(([name]) => name.toLowerCase() === 'referer')?.[1];
  const headers = request.headers.filter(([name]) => name.toLowerCase() !== 'referer');
  const names = headers.map(([name]) => name.toLowerCase());
  if (headers.length) {
    // the same header twice does not fit in an object: then it is a list of pairs
    const pairs = new Set(names).size < names.length;
    const rows = headers.map(([name, value]) => (pairs ? `    [${quote(name)}, ${quote(value)}]` : `    ${key(name)}: ${quote(value)}`));
    options.push(`headers: ${pairs ? '[' : '{'}\n${rows.join(',\n')}\n  ${pairs ? ']' : '}'}`);
  }

  if (body?.kind === 'form') {
    lines.push('const form = new FormData();');
    for (const field of body.fields)
      lines.push(
        field.file ? `form.append(${quote(field.name)}, file); // ${field.value}: a File or Blob` : `form.append(${quote(field.name)}, ${quote(field.value)});`
      );
    lines.push('');
    options.push('body: form');
  } else if (body?.kind === 'file') {
    lines.push(`const contents = ''; // what is in ${body.name}`, '');
    options.push('body: contents');
  } else if (body) {
    const value = jsonBody(request);
    options.push(`body: ${value === undefined ? quote(body.text) : `JSON.stringify(${literal(value, '  ')})`}`);
  }
  if (referrer) options.push(`referrer: ${quote(referrer)}`);
  if (request.timeout) options.push(`signal: AbortSignal.timeout(${request.timeout})`);

  const joined = options.map((option) => `  ${option}`).join(',\n');
  lines.push(options.length ? `const response = await fetch(${quote(request.url)}, {\n${joined}\n});` : `const response = await fetch(${quote(request.url)});`);
  if (reading !== 'none' && request.method !== 'HEAD') lines.push(`const data = await response.${reading}();`);
  return lines.join('\n');
}
