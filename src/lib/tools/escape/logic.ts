/** Escaping a string for the places a developer pastes it: JSON, JavaScript, a regular expression, a shell command. */

export type Target = 'json' | 'js' | 'regex' | 'shell';

const BACKSLASH = '\\';
/** The start of a unicode escape, put together here so it is never mistaken for one in this file. */
const UNICODE = BACKSLASH + 'u';

const hex4 = (unit: number) => UNICODE + unit.toString(16).padStart(4, '0');
/** Everything outside printable ASCII as unicode escapes, one per UTF-16 unit (so a pair for an emoji, as JSON wants it). */
const asciiOnly = (body: string) => body.replace(/[^\x20-\x7e]/g, (ch) => [...Array(ch.length).keys()].map((i) => hex4(ch.charCodeAt(i))).join(''));

const JS_SHORT: Record<string, string> = { '\\': '\\\\', "'": "\\'", '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f', '\v': '\\v' };

function jsBody(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (JS_SHORT[ch]) out += JS_SHORT[ch];
    // other control characters, and the two line separators that end a line inside a string in older engines
    else if (code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029) out += hex4(code);
    else out += ch;
  }
  return out;
}

export interface Options {
  /** Put the quotes around the result, so it can be pasted as a string literal (JSON and JavaScript) */
  quotes?: boolean;
  /** Also escape everything outside ASCII (JSON and JavaScript) */
  ascii?: boolean;
}

/** `text`, escaped so that it means itself in the target. */
export function escape(text: string, target: Target, { quotes = false, ascii = false }: Options = {}): string {
  switch (target) {
    case 'json': {
      // JSON.stringify is the definition of a JSON string; take its contents
      const body = JSON.stringify(text).slice(1, -1);
      const done = ascii ? asciiOnly(body) : body;
      return quotes ? `"${done}"` : done;
    }
    case 'js': {
      const body = jsBody(text);
      const done = ascii ? asciiOnly(body) : body;
      return quotes ? `'${done}'` : done;
    }
    case 'regex':
      // every character that has a meaning in a pattern, plus / for a regex literal and - for inside [...]
      return text.replace(/[\\^$.*+?()[\]{}|/-]/g, '\\$&');
    case 'shell':
      // single quotes take everything literally; a single quote itself has to step outside them
      return `'${text.replaceAll("'", "'\\''")}'`;
  }
}

export type Unescaped = { ok: true; text: string } | { ok: false; error: 'escape' | 'quote'; at: number };

const SIMPLE: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };

/** Reads the escapes of a JSON or JavaScript string. Surrounding quotes are optional. */
function unescapeString(input: string, quoteChars: string): Unescaped {
  const first = input[0];
  const quoted = input.length >= 2 && quoteChars.includes(first) && input.endsWith(first);
  const text = quoted ? input.slice(1, -1) : input;
  const offset = quoted ? 1 : 0;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== BACKSLASH) {
      out += text[i];
      continue;
    }
    const at = i + offset;
    const next = text[++i];
    if (next === undefined) return { ok: false, error: 'escape', at };
    if (next === 'x' || next === 'u') {
      // \xHH, \uHHHH or \u{H…}
      const braced = next === 'u' && text[i + 1] === '{';
      const end = braced ? text.indexOf('}', i) : i + (next === 'x' ? 2 : 4);
      const digits = braced ? text.slice(i + 2, end) : text.slice(i + 1, end + 1);
      const wanted = braced ? /^[0-9a-fA-F]{1,6}$/ : next === 'x' ? /^[0-9a-fA-F]{2}$/ : /^[0-9a-fA-F]{4}$/;
      const code = parseInt(digits, 16);
      if (end === -1 || !wanted.test(digits) || code > 0x10ffff) return { ok: false, error: 'escape', at };
      out += braced ? String.fromCodePoint(code) : String.fromCharCode(code);
      i = end;
    } else if (next === '\n') {
      // a backslash at the end of a line continues the string on the next one
    } else out += SIMPLE[next] ?? next;
  }
  return { ok: true, text: out };
}

/** Reads a shell word: '…' literally, "…" with a few escapes, and a backslash before any other character. */
function unescapeShell(text: string): Unescaped {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") {
      const end = text.indexOf("'", i + 1);
      if (end === -1) return { ok: false, error: 'quote', at: i };
      out += text.slice(i + 1, end);
      i = end;
    } else if (ch === '"') {
      const start = i;
      for (i++; i < text.length && text[i] !== '"'; i++) {
        // inside double quotes a backslash only escapes these four
        if (text[i] === BACKSLASH && '"\\$`'.includes(text[i + 1] ?? '')) i++;
        out += text[i];
      }
      if (i >= text.length) return { ok: false, error: 'quote', at: start };
    } else if (ch === BACKSLASH) {
      if (i + 1 >= text.length) return { ok: false, error: 'escape', at: i };
      out += text[++i];
    } else out += ch;
  }
  return { ok: true, text: out };
}

/** The opposite of `escape`: what the escaped text stands for. */
export function unescape(text: string, target: Target): Unescaped {
  switch (target) {
    case 'json':
      return unescapeString(text, '"');
    case 'js':
      return unescapeString(text, '\'"`');
    case 'regex':
      // only an escaped symbol is undone: \d, \n and \b mean something else than the letter
      return { ok: true, text: text.replace(/\\([^A-Za-z0-9\s])/g, '$1') };
    case 'shell':
      return unescapeShell(text);
  }
}
