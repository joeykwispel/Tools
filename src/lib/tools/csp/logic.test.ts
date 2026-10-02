import { describe, expect, it } from 'vitest';
import { KNOWN, PRESETS, add, audit, classify, parse, serialize, toHeader, toMeta, type Finding } from './logic';

const ids = (policy: string) => audit(parse(policy)).map((finding) => finding.id);
const findings = (policy: string): Finding[] => audit(parse(policy));

describe('parse', () => {
  it('splits a policy into directives and values', () => {
    expect(parse("default-src 'self'; img-src 'self' data: https://img.example.com;upgrade-insecure-requests")).toEqual({
      directives: [
        { name: 'default-src', values: ["'self'"] },
        { name: 'img-src', values: ["'self'", 'data:', 'https://img.example.com'] },
        { name: 'upgrade-insecure-requests', values: [] }
      ],
      duplicates: [],
      reportOnly: false
    });
  });

  it('is easy about spaces, empty parts, line breaks and capitals in names', () => {
    expect(parse("  Default-Src   'self' ;;\n  SCRIPT-SRC\t'none' ; ").directives).toEqual([
      { name: 'default-src', values: ["'self'"] },
      { name: 'script-src', values: ["'none'"] }
    ]);
    expect(parse('').directives).toEqual([]);
    expect(parse(' ; ; ').directives).toEqual([]);
  });

  it('keeps the first of a directive that is there twice', () => {
    expect(parse("script-src 'self'; script-src https://evil.example; script-src 'none'")).toMatchObject({
      directives: [{ name: 'script-src', values: ["'self'"] }],
      duplicates: ['script-src']
    });
  });

  it('takes the policy out of a header line', () => {
    expect(parse("Content-Security-Policy: default-src 'none'")).toMatchObject({
      directives: [{ name: 'default-src', values: ["'none'"] }],
      reportOnly: false
    });
    expect(parse("content-security-policy-report-only:default-src 'none'; report-to main")).toMatchObject({
      directives: [
        { name: 'default-src', values: ["'none'"] },
        { name: 'report-to', values: ['main'] }
      ],
      reportOnly: true
    });
  });

  it('takes the policy out of a meta tag', () => {
    expect(parse(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src https://a.example/?x=1&amp;y=2">`).directives).toEqual([
      { name: 'default-src', values: ["'self'"] },
      { name: 'img-src', values: ['https://a.example/?x=1&y=2'] }
    ]);
    expect(parse(`<meta content='default-src &#39;self&#39;' http-equiv='Content-Security-Policy'>`).directives).toEqual([
      { name: 'default-src', values: ["'self'"] }
    ]);
    expect(parse('<meta http-equiv="Content-Security-Policy">').directives).toEqual([]);
  });
});

describe('serialize, toHeader and toMeta', () => {
  const { directives } = parse("default-src   'self';frame-ancestors 'none'; img-src https://a.example/?x=1&y=2 ; sandbox");

  it('writes the policy as one tidy line', () => {
    expect(serialize(directives)).toBe("default-src 'self'; frame-ancestors 'none'; img-src https://a.example/?x=1&y=2; sandbox");
    expect(serialize([])).toBe('');
  });

  it('writes a header, also one that only reports', () => {
    expect(toHeader(parse("default-src 'self'").directives)).toBe("Content-Security-Policy: default-src 'self'");
    expect(toHeader(parse("default-src 'self'").directives, true)).toBe("Content-Security-Policy-Report-Only: default-src 'self'");
  });

  it('writes a meta tag without what does not work there', () => {
    expect(toMeta(directives)).toBe(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src https://a.example/?x=1&amp;y=2">`);
  });

  it('reads back what it wrote', () => {
    const policy = parse(PRESETS.site);
    expect(parse(toHeader(policy.directives)).directives).toEqual(policy.directives);
    expect(parse(toMeta(parse("default-src 'self'; img-src data:").directives)).directives).toEqual(parse("default-src 'self'; img-src data:").directives);
  });
});

describe('classify', () => {
  it('knows the keywords, in any case', () => {
    expect(classify("'self'")).toEqual({ kind: 'keyword', keyword: 'self' });
    expect(classify("'NONE'")).toEqual({ kind: 'keyword', keyword: 'none' });
    expect(classify("'unsafe-inline'")).toEqual({ kind: 'keyword', keyword: 'unsafe-inline' });
    expect(classify("'strict-dynamic'")).toEqual({ kind: 'keyword', keyword: 'strict-dynamic' });
    expect(classify("'wasm-unsafe-eval'")).toEqual({ kind: 'keyword', keyword: 'wasm-unsafe-eval' });
  });

  it('knows nonces and hashes', () => {
    expect(classify("'nonce-r4nd0m+/='")).toEqual({ kind: 'nonce' });
    expect(classify("'sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0='")).toEqual({ kind: 'hash', algorithm: 'sha256' });
    expect(classify("'sha512-abc_-'")).toEqual({ kind: 'hash', algorithm: 'sha512' });
    expect(classify("'nonce-'")).toEqual({ kind: 'unknown' });
    expect(classify("'md5-abc'")).toEqual({ kind: 'unknown' });
  });

  it('knows schemes, hosts and the star', () => {
    expect(classify('https:')).toEqual({ kind: 'scheme', scheme: 'https:' });
    expect(classify('DATA:')).toEqual({ kind: 'scheme', scheme: 'data:' });
    expect(classify('*')).toEqual({ kind: 'any' });
    expect(classify('example.com')).toEqual({ kind: 'host', wildcard: false });
    expect(classify('https://cdn.example.com:8443/js/')).toEqual({ kind: 'host', wildcard: false });
    expect(classify('*.example.com')).toEqual({ kind: 'host', wildcard: true });
    expect(classify('https://*.example.com')).toEqual({ kind: 'host', wildcard: true });
    expect(classify('wss://example.com:*')).toEqual({ kind: 'host', wildcard: false });
    expect(classify('localhost:3000')).toEqual({ kind: 'host', wildcard: false });
  });

  it('sees a keyword without its quotes, and what is nothing at all', () => {
    expect(classify('self')).toEqual({ kind: 'unquoted' });
    expect(classify('unsafe-inline')).toEqual({ kind: 'unquoted' });
    expect(classify('nonce-abc')).toEqual({ kind: 'unquoted' });
    expect(classify('sha256-abc=')).toEqual({ kind: 'unquoted' });
    expect(classify("'something'")).toEqual({ kind: 'unknown' });
    expect(classify('https://')).toEqual({ kind: 'unknown' });
    expect(classify('"self"')).toEqual({ kind: 'unknown' });
  });
});

describe('audit', () => {
  it('has nothing bad to say about the policies to start from', () => {
    expect(findings(PRESETS.site).filter((finding) => finding.level !== 'info')).toEqual([]);
    expect(findings(PRESETS.strict)).toEqual([]);
    expect(findings(PRESETS.locked)).toEqual([]);
    expect(audit(parse(''))).toEqual([]);
  });

  it('says when nothing limits scripts', () => {
    expect(findings("img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")).toEqual([{ level: 'bad', id: 'noScript' }]);
  });

  it('sees inline scripts being allowed, unless a nonce, a hash or strict-dynamic switches that off', () => {
    const rest = "; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
    expect(findings(`script-src 'self' 'unsafe-inline'${rest}`)).toEqual([{ level: 'bad', id: 'unsafeInline', directive: 'script-src' }]);
    expect(findings(`default-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`)).toEqual([
      { level: 'bad', id: 'unsafeInline', directive: 'default-src' }
    ]);
    expect(findings(`script-src 'unsafe-inline' 'nonce-abc'${rest}`)).toEqual([]);
    expect(findings(`script-src 'unsafe-inline' 'sha256-abc='${rest}`)).toEqual([]);
    // the style of a page is not a script: no finding
    expect(findings(`script-src 'self'; style-src 'unsafe-inline'${rest}`)).toEqual([]);
  });

  it('sees scripts from anywhere, unless strict-dynamic makes a browser ignore that', () => {
    const rest = "; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
    expect(findings(`script-src * data:${rest}`)).toEqual([
      { level: 'bad', id: 'anyScript', directive: 'script-src', value: '*' },
      { level: 'bad', id: 'dataScript', directive: 'script-src' }
    ]);
    expect(findings(`script-src https:${rest}`)).toEqual([{ level: 'bad', id: 'anyScript', directive: 'script-src', value: 'https:' }]);
    expect(findings(`script-src 'nonce-abc' 'strict-dynamic' https: 'unsafe-inline'${rest}`)).toEqual([]);
    expect(findings(`script-src 'self' 'unsafe-eval'${rest}`)).toEqual([{ level: 'warn', id: 'unsafeEval', directive: 'script-src' }]);
  });

  it('looks at every directive that decides about scripts', () => {
    expect(ids("script-src 'self'; script-src-elem 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")).toEqual([
      'unsafeInline'
    ]);
  });

  it('misses object-src, base-uri and frame-ancestors', () => {
    expect(findings("script-src 'self'")).toEqual([
      { level: 'warn', id: 'objectSrc' },
      { level: 'warn', id: 'baseUri' },
      { level: 'info', id: 'frameAncestors' }
    ]);
    // default-src 'none' covers objects, not the other two
    expect(ids("default-src 'none'")).toEqual(['baseUri', 'frameAncestors']);
    expect(ids("default-src 'self'; base-uri 'self'; frame-ancestors 'self'")).toEqual(['objectSrc']);
  });

  it('sees mistakes in writing', () => {
    const rest = "; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
    expect(findings(`script-src self${rest}`)).toEqual([{ level: 'bad', id: 'unquoted', directive: 'script-src', value: 'self' }]);
    expect(findings(`script-src 'self' 'whatever'${rest}`)).toEqual([{ level: 'warn', id: 'unknownSource', directive: 'script-src', value: "'whatever'" }]);
    expect(findings(`script-src 'none' https://a.example${rest}`)).toEqual([{ level: 'warn', id: 'noneAndMore', directive: 'script-src' }]);
    expect(findings(`script-src 'self'; scrpt-src 'self'${rest}`)).toEqual([{ level: 'warn', id: 'unknownDirective', directive: 'scrpt-src' }]);
    expect(findings(`script-src 'self'; script-src 'none'${rest}`)).toEqual([{ level: 'warn', id: 'duplicate', directive: 'script-src' }]);
    expect(findings(`script-src 'self'; img-src http://img.example${rest}`)).toEqual([
      { level: 'warn', id: 'insecure', directive: 'img-src', value: 'http://img.example' }
    ]);
  });

  it('notes what is out of date and what only reports', () => {
    const rest = "; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
    expect(findings(`script-src 'self'; block-all-mixed-content${rest}`)).toEqual([{ level: 'info', id: 'deprecated', directive: 'block-all-mixed-content' }]);
    expect(findings(`Content-Security-Policy-Report-Only: script-src 'self'${rest}`)).toEqual([{ level: 'info', id: 'reportOnly' }]);
  });

  it('puts the worst first', () => {
    expect(findings("script-src 'unsafe-inline' 'unsafe-eval'").map((finding) => finding.level)).toEqual(['bad', 'warn', 'warn', 'warn', 'info']);
  });
});

describe('add and the list of directives', () => {
  it('adds a directive with a value to start from', () => {
    const { directives } = parse("default-src 'self'");
    expect(serialize(add(directives, 'img-src'))).toBe("default-src 'self'; img-src 'self' data:");
    expect(serialize(add(directives, 'upgrade-insecure-requests'))).toBe("default-src 'self'; upgrade-insecure-requests");
    expect(serialize(add([], 'object-src'))).toBe("object-src 'none'");
  });

  it('starts every directive from something a browser understands', () => {
    for (const [name, { takes, start }] of Object.entries(KNOWN)) {
      if (takes === 'nothing') expect(start, name).toBe('');
      if (takes === 'sources') for (const value of start.split(' ')) expect(['keyword', 'scheme'], `${name} ${value}`).toContain(classify(value).kind);
    }
  });
});
