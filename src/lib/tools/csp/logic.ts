/**
 * Content Security Policy: reading a policy (as a bare value, a header or a <meta> tag), saying what each part
 * allows, pointing at what makes it weak, and writing it back as a header or a tag. Follows CSP Level 3.
 */

export interface Directive {
  /** In lower case, the way a browser compares it */
  name: string;
  values: string[];
}

export interface Policy {
  directives: Directive[];
  /** Names that occur more than once: a browser keeps the first and ignores the rest */
  duplicates: string[];
  /** Pasted as a Content-Security-Policy-Report-Only header: it reports and blocks nothing */
  reportOnly: boolean;
}

const entities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&(#39|apos);/g, "'")
    .replace(/&amp;/g, '&');

/** Reads a policy. A whole header line or a whole <meta> tag may be pasted: the policy is taken out of it. */
export function parse(text: string): Policy {
  let value = text.trim();
  let reportOnly = false;
  if (/<meta\b/i.test(value)) {
    const content = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(value);
    reportOnly = /content-security-policy-report-only/i.test(value);
    value = entities(content ? (content[1] ?? content[2]) : '');
  } else {
    const header = /^content-security-policy(-report-only)?\s*:/i.exec(value);
    if (header) {
      reportOnly = !!header[1];
      value = value.slice(header[0].length);
    }
  }

  const directives: Directive[] = [];
  const duplicates: string[] = [];
  for (const part of value.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/).filter(Boolean);
    if (!name) continue;
    const lower = name.toLowerCase();
    if (directives.some((directive) => directive.name === lower)) {
      if (!duplicates.includes(lower)) duplicates.push(lower);
    } else directives.push({ name: lower, values });
  }
  return { directives, duplicates, reportOnly };
}

/** The policy as one line: the value of the header. */
export const serialize = (directives: Directive[]) => directives.map(({ name, values }) => [name, ...values].join(' ')).join('; ');

export const toHeader = (directives: Directive[], reportOnly = false) => `Content-Security-Policy${reportOnly ? '-Report-Only' : ''}: ${serialize(directives)}`;

/** Directives a browser ignores when the policy comes in a <meta> tag instead of a header. */
export const NOT_IN_META = ['frame-ancestors', 'report-uri', 'sandbox'];

/** The policy as a tag for the <head>, without what does not work there. */
export function toMeta(directives: Directive[]): string {
  const content = serialize(directives.filter(({ name }) => !NOT_IN_META.includes(name)));
  return `<meta http-equiv="Content-Security-Policy" content="${content.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`;
}

/** What kind of value a directive takes. */
export type Takes = 'sources' | 'tokens' | 'nothing';

/** Every directive a browser knows, with what to start from when it is added. */
export const KNOWN: Record<string, { takes: Takes; start: string; deprecated?: true }> = {
  'default-src': { takes: 'sources', start: "'self'" },
  'script-src': { takes: 'sources', start: "'self'" },
  'script-src-elem': { takes: 'sources', start: "'self'" },
  'script-src-attr': { takes: 'sources', start: "'none'" },
  'style-src': { takes: 'sources', start: "'self'" },
  'style-src-elem': { takes: 'sources', start: "'self'" },
  'style-src-attr': { takes: 'sources', start: "'none'" },
  'img-src': { takes: 'sources', start: "'self' data:" },
  'font-src': { takes: 'sources', start: "'self'" },
  'connect-src': { takes: 'sources', start: "'self'" },
  'media-src': { takes: 'sources', start: "'self'" },
  'object-src': { takes: 'sources', start: "'none'" },
  'frame-src': { takes: 'sources', start: "'self'" },
  'child-src': { takes: 'sources', start: "'self'" },
  'worker-src': { takes: 'sources', start: "'self'" },
  'manifest-src': { takes: 'sources', start: "'self'" },
  'base-uri': { takes: 'sources', start: "'self'" },
  'form-action': { takes: 'sources', start: "'self'" },
  'frame-ancestors': { takes: 'sources', start: "'none'" },
  sandbox: { takes: 'tokens', start: '' },
  'report-to': { takes: 'tokens', start: 'default' },
  'report-uri': { takes: 'tokens', start: '/csp-report' },
  'require-trusted-types-for': { takes: 'tokens', start: "'script'" },
  'trusted-types': { takes: 'tokens', start: 'default' },
  'upgrade-insecure-requests': { takes: 'nothing', start: '' },
  'block-all-mixed-content': { takes: 'nothing', start: '', deprecated: true },
  'prefetch-src': { takes: 'sources', start: "'self'", deprecated: true },
  'plugin-types': { takes: 'tokens', start: '', deprecated: true }
};

export const KEYWORDS = [
  'none',
  'self',
  'unsafe-inline',
  'unsafe-eval',
  'wasm-unsafe-eval',
  'unsafe-hashes',
  'strict-dynamic',
  'report-sample',
  'inline-speculation-rules'
] as const;
export type Keyword = (typeof KEYWORDS)[number];

export type Source =
  | { kind: 'keyword'; keyword: Keyword }
  | { kind: 'nonce' }
  | { kind: 'hash'; algorithm: string }
  /** https: or data: — anything with that scheme */
  | { kind: 'scheme'; scheme: string }
  /** The star: any address */
  | { kind: 'any' }
  | { kind: 'host'; /** *.example.com */ wildcard: boolean }
  /** A keyword, nonce or hash without its single quotes: a browser reads it as a host name */
  | { kind: 'unquoted' }
  | { kind: 'unknown' };

const BASE64 = '[A-Za-z0-9+/_-]+={0,2}';
const HOST = /^([a-z][a-z0-9+.-]*:\/\/)?(\*|(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*)(:(\d+|\*))?(\/\S*)?$/i;

/** What one entry of a source list is. */
export function classify(value: string): Source {
  if (value === '*') return { kind: 'any' };
  const quoted = /^'(.*)'$/.exec(value)?.[1];
  if (quoted !== undefined) {
    const lower = quoted.toLowerCase();
    if ((KEYWORDS as readonly string[]).includes(lower)) return { kind: 'keyword', keyword: lower as Keyword };
    if (new RegExp(`^nonce-${BASE64}$`).test(quoted)) return { kind: 'nonce' };
    const hash = new RegExp(`^(sha256|sha384|sha512)-${BASE64}$`, 'i').exec(quoted);
    return hash ? { kind: 'hash', algorithm: hash[1].toLowerCase() } : { kind: 'unknown' };
  }
  if ((KEYWORDS as readonly string[]).includes(value.toLowerCase()) || /^(nonce|sha256|sha384|sha512)-/i.test(value)) return { kind: 'unquoted' };
  if (/^[a-z][a-z0-9+.-]*:$/i.test(value)) return { kind: 'scheme', scheme: value.toLowerCase() };
  if (HOST.test(value)) return { kind: 'host', wildcard: /^([a-z][a-z0-9+.-]*:\/\/)?\*\./i.test(value) };
  return { kind: 'unknown' };
}

export type Level = 'bad' | 'warn' | 'info';

export interface Finding {
  level: Level;
  id:
    | 'noScript'
    | 'unsafeInline'
    | 'unsafeEval'
    | 'anyScript'
    | 'dataScript'
    | 'objectSrc'
    | 'baseUri'
    | 'frameAncestors'
    | 'unquoted'
    | 'unknownSource'
    | 'unknownDirective'
    | 'duplicate'
    | 'deprecated'
    | 'noneAndMore'
    | 'insecure'
    | 'reportOnly';
  directive?: string;
  value?: string;
}

const ORDER: Level[] = ['bad', 'warn', 'info'];

/** What makes this policy weaker than it looks, worst first. An empty policy has no findings: there is nothing to judge. */
export function audit({ directives, duplicates, reportOnly }: Policy): Finding[] {
  if (!directives.length) return [];
  const findings: Finding[] = [];
  const find = (name: string) => directives.find((directive) => directive.name === name);
  const fallback = find('default-src');

  for (const name of duplicates) findings.push({ level: 'warn', id: 'duplicate', directive: name });

  for (const { name, values } of directives) {
    const known = KNOWN[name];
    if (!known) {
      findings.push({ level: 'warn', id: 'unknownDirective', directive: name });
      continue;
    }
    if (known.deprecated) findings.push({ level: 'info', id: 'deprecated', directive: name });
    if (known.takes !== 'sources') continue;
    const sources = values.map((value) => ({ value, source: classify(value) }));
    for (const { value, source } of sources) {
      if (source.kind === 'unquoted') findings.push({ level: 'bad', id: 'unquoted', directive: name, value });
      else if (source.kind === 'unknown') findings.push({ level: 'warn', id: 'unknownSource', directive: name, value });
      else if (/^(http|ws):/i.test(value)) findings.push({ level: 'warn', id: 'insecure', directive: name, value });
    }
    if (values.length > 1 && sources.some(({ source }) => source.kind === 'keyword' && source.keyword === 'none')) {
      findings.push({ level: 'warn', id: 'noneAndMore', directive: name });
    }
  }

  // scripts are what a policy is for: every directive that decides about them is looked at
  const scripts = ['script-src', 'script-src-elem', 'script-src-attr'].map(find).filter((directive) => directive !== undefined);
  if (!scripts.length && fallback) scripts.push(fallback);
  if (!scripts.length) findings.push({ level: 'bad', id: 'noScript' });
  for (const { name, values } of scripts) {
    const sources = values.map((value) => ({ value, source: classify(value) }));
    const has = (keyword: Keyword) => sources.some(({ source }) => source.kind === 'keyword' && source.keyword === keyword);
    // with a nonce or a hash in the list a browser ignores 'unsafe-inline'; with 'strict-dynamic' it ignores hosts and schemes too
    const trusted = sources.some(({ source }) => source.kind === 'nonce' || source.kind === 'hash');
    const strict = has('strict-dynamic');
    if (has('unsafe-inline') && !trusted && !strict) findings.push({ level: 'bad', id: 'unsafeInline', directive: name });
    if (has('unsafe-eval')) findings.push({ level: 'warn', id: 'unsafeEval', directive: name });
    if (strict) continue;
    for (const { value, source } of sources) {
      if (source.kind === 'any' || (source.kind === 'scheme' && ['https:', 'http:'].includes(source.scheme))) {
        findings.push({ level: 'bad', id: 'anyScript', directive: name, value });
      } else if (source.kind === 'scheme' && source.scheme === 'data:') findings.push({ level: 'bad', id: 'dataScript', directive: name });
    }
  }

  const objects = find('object-src') ?? fallback;
  if (!objects || !(objects.values.length === 1 && objects.values[0].toLowerCase() === "'none'")) findings.push({ level: 'warn', id: 'objectSrc' });
  // these two do not fall back on default-src
  if (!find('base-uri')) findings.push({ level: 'warn', id: 'baseUri' });
  if (!find('frame-ancestors')) findings.push({ level: 'info', id: 'frameAncestors' });
  if (reportOnly) findings.push({ level: 'info', id: 'reportOnly' });

  return findings.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
}

/** Policies to start from. */
export const PRESETS = {
  /** A site that serves everything itself */
  site: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  /** Scripts by nonce: the nonce has to be a new random value in every response */
  strict: "script-src 'nonce-CHANGEME' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
  /** Nothing allowed: add what the page turns out to need */
  locked: "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
} as const;
export type Preset = keyof typeof PRESETS;

/** The policy with one more directive at the end, with a sensible value to start from. */
export const add = (directives: Directive[], name: string): Directive[] => [
  ...directives,
  { name, values: (KNOWN[name]?.start ?? '').split(' ').filter(Boolean) }
];
