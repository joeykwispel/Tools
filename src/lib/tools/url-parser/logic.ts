/**
 * A URL taken apart: scheme, host, port, path, query and fragment, as a browser reads them (the URL standard), and the
 * query parameters one by one. Changing a parameter rewrites only that parameter; the rest of the address stays as written.
 */
import { decode, encode } from '../url/logic';

export interface Param {
  /** Name and value as they read: %20 and + are spaces */
  key: string;
  value: string;
  /** As written in the address */
  rawKey: string;
  /** Null when there is no = at all: ?flag */
  rawValue: string | null;
}

export interface Parts {
  /** The whole address as a browser sends it */
  href: string;
  /** Without the colon: https */
  scheme: string;
  username: string;
  password: string;
  /** As it goes over the wire: an international name in its xn-- form */
  host: string;
  /** The same host as it is read: münchen.de. Equal to `host` for a plain name */
  hostUnicode: string;
  /** Empty when it is not written */
  port: string;
  /** The port that is used when none is written; null for a scheme without one */
  defaultPort: number | null;
  path: string;
  /** Without the ? */
  query: string;
  /** Without the # */
  fragment: string;
  /** Scheme, host and port: what a browser compares for "same origin". Empty for a scheme without one */
  origin: string;
}

export type Parsed =
  | {
      ok: true;
      /** There was no scheme: read as https:// */
      assumed: boolean;
      /** There was no host either: only path, query and fragment mean something */
      relative: boolean;
      parts: Parts;
      /** The pieces of the path between the slashes, as they read */
      segments: string[];
      params: Param[];
    }
  | { ok: false; error: 'empty' | 'invalid' };

const DEFAULT_PORTS: Record<string, number> = { http: 80, https: 443, ws: 80, wss: 443, ftp: 21 };

/**
 * One label of a host name from its xn-- form (without the xn--) back to what it reads as: Punycode, RFC 3492.
 * Null when it is not valid.
 */
export function fromPunycode(input: string): string | null {
  const [base, tMin, tMax, skew, damp] = [36, 1, 26, 38, 700];
  const out: number[] = [];
  const basic = Math.max(input.lastIndexOf('-'), 0);
  for (let j = 0; j < basic; j++) {
    if (input.charCodeAt(j) >= 128) return null;
    out.push(input.charCodeAt(j));
  }
  let [n, i, bias] = [128, 0, 72];
  for (let index = basic > 0 ? basic + 1 : 0; index < input.length;) {
    const old = i;
    for (let weight = 1, k = base; ; k += base) {
      if (index >= input.length) return null;
      const code = input.charCodeAt(index++);
      const digit = code >= 48 && code <= 57 ? code - 22 : code >= 65 && code <= 90 ? code - 65 : code >= 97 && code <= 122 ? code - 97 : base;
      if (digit >= base) return null;
      i += digit * weight;
      const threshold = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < threshold) break;
      weight *= base - threshold;
    }
    const length = out.length + 1;
    let delta = old === 0 ? Math.floor((i - old) / damp) : (i - old) >> 1;
    delta += Math.floor(delta / length);
    let k = 0;
    for (; delta > ((base - tMin) * tMax) >> 1; k += base) delta = Math.floor(delta / (base - tMin));
    bias = k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
    n += Math.floor(i / length);
    i %= length;
    if (n > 0x10ffff) return null;
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

const unicodeHost = (host: string) =>
  host
    .split('.')
    .map((label) => (label.startsWith('xn--') ? (fromPunycode(label.slice(4)) ?? label) : label))
    .join('.');

/** The parameters of a query (without the ?), in order. Empty pieces, as in a&&b, are skipped like a browser does. */
export function readParams(query: string): Param[] {
  return query
    .split('&')
    .filter(Boolean)
    .map((piece) => {
      const at = piece.indexOf('=');
      const [rawKey, rawValue] = at < 0 ? [piece, null] : [piece.slice(0, at), piece.slice(at + 1)];
      return { key: decode(rawKey, true).text, value: decode(rawValue ?? '', true).text, rawKey, rawValue };
    });
}

/** Reads an address. Without a scheme it is read as https://; starting with / ? or # it is read as a place on some site. */
export function parse(text: string): Parsed {
  const input = text.trim();
  if (!input) return { ok: false, error: 'empty' };
  const relative = /^[/?#]/.test(input) && !input.startsWith('//');
  // localhost:3000/a starts like a scheme, but a scheme is not followed by a port
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(input) && !/^[^/?#]*:\d+([/?#]|$)/.test(input);
  const assumed = !relative && !hasScheme;
  let url: URL;
  try {
    url = relative ? new URL(input, 'https://relative.invalid') : new URL(assumed ? `https://${input.replace(/^\/\//, '')}` : input);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  const scheme = url.protocol.slice(0, -1);
  const text_ = (value: string) => decode(value).text;
  const parts: Parts = relative
    ? {
        href: url.pathname + url.search + url.hash,
        scheme: '',
        username: '',
        password: '',
        host: '',
        hostUnicode: '',
        port: '',
        defaultPort: null,
        path: url.pathname,
        query: url.search.slice(1),
        fragment: url.hash.slice(1),
        origin: ''
      }
    : {
        href: url.href,
        scheme,
        username: text_(url.username),
        password: text_(url.password),
        host: url.hostname,
        hostUnicode: unicodeHost(url.hostname),
        port: url.port,
        defaultPort: DEFAULT_PORTS[scheme] ?? null,
        path: url.pathname,
        query: url.search.slice(1),
        fragment: url.hash.slice(1),
        origin: url.origin === 'null' ? '' : url.origin
      };
  const segments = url.pathname.startsWith('/')
    ? url.pathname
        .slice(1)
        .split('/')
        .filter((segment, i, all) => segment || i < all.length - 1)
        .map(text_)
    : [];
  return { ok: true, assumed, relative, parts, segments, params: readParams(parts.query) };
}

/** A name or value written so it can go into a query. */
export const escape = (text: string) => encode(text, 'component');

/** The address with another query: the parameters as given, raw. What is before the ? and after the # stays as written. */
export function withParams(text: string, params: Pick<Param, 'rawKey' | 'rawValue'>[]): string {
  const hash = text.indexOf('#');
  const [before, fragment] = hash < 0 ? [text, ''] : [text.slice(0, hash), text.slice(hash)];
  const mark = before.indexOf('?');
  const base = mark < 0 ? before : before.slice(0, mark);
  const query = params.map(({ rawKey, rawValue }) => (rawValue === null ? rawKey : `${rawKey}=${rawValue}`)).join('&');
  return `${base}${params.length ? `?${query}` : ''}${fragment}`;
}

/** The parameters as JSON: a name that is there more than once gets a list. */
export function toJson(params: Param[]): string {
  const found = new Map<string, string | string[]>();
  for (const { key, value } of params) {
    const known = found.get(key);
    found.set(key, known === undefined ? value : Array.isArray(known) ? [...known, value] : [known, value]);
  }
  return JSON.stringify(Object.fromEntries(found), null, 2);
}
