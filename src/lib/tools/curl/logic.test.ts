import { describe, expect, it } from 'vitest';
import { literal, parse, quote, toFetch, tokenize, type NoteId } from './logic';

const words = (command: string) => {
  const split = tokenize(command);
  return split.ok ? split.tokens : null;
};

const read = (command: string) => {
  const parsed = parse(command);
  if (!parsed.ok) throw new Error(`not read: ${parsed.error}`);
  return parsed;
};
const request = (command: string) => read(command).request;
const notes = (command: string): NoteId[] => read(command).notes.map((note) => note.id);

describe('tokenize', () => {
  it('splits on whitespace and keeps what is quoted together', () => {
    expect(words(`curl  -H 'Accept: text/html' "https://example.com/a b"`)).toEqual(['curl', '-H', 'Accept: text/html', 'https://example.com/a b']);
    expect(words(`a'b'"c"d`)).toEqual(['abcd']);
    expect(words(`'' ""`)).toEqual(['', '']);
    expect(words('   ')).toEqual([]);
  });

  it('reads backslashes like bash', () => {
    expect(words('a\\ b c\\"d')).toEqual(['a b', 'c"d']);
    expect(words(`'a\\nb'`)).toEqual(['a\\nb']);
    expect(words(`"say \\"hi\\" for \\$5 \\n"`)).toEqual(['say "hi" for $5 \\n']);
    expect(words('curl \\\n  -X POST \\\r\n  example.com')).toEqual(['curl', '-X', 'POST', 'example.com']);
  });

  it("reads $'…' with its escapes", () => {
    expect(words(`$'line\\nbreak\\ttab \\'quoted\\' \\x41\\u00e9\\101'`)).toEqual(["line\nbreak\ttab 'quoted' AéA"]);
  });

  it('reads a command copied for the Windows command prompt', () => {
    const command = 'curl ^"https://example.com/api?a=1^&b=2^" ^\r\n  -H ^"accept: application/json^" ^\r\n  --data-raw ^"^{^\\^"a^\\^":1^}^"';
    expect(words(command)).toEqual(['curl', 'https://example.com/api?a=1&b=2', '-H', 'accept: application/json', '--data-raw', '{"a":1}']);
  });

  it('is not ok when a quote is never closed', () => {
    expect(words(`curl 'https://example.com`)).toBeNull();
    expect(words(`curl "https://example.com`)).toBeNull();
    expect(words(`curl $'abc`)).toBeNull();
  });
});

describe('parse', () => {
  it('reads a plain GET', () => {
    expect(read('curl https://example.com/api')).toEqual({
      ok: true,
      request: { url: 'https://example.com/api', method: 'GET', headers: [], body: null, timeout: null },
      notes: []
    });
    expect(request('$ curl.exe -sSL --compressed https://example.com')).toMatchObject({ method: 'GET', url: 'https://example.com' });
    expect(request('/usr/bin/curl --url https://example.com')).toMatchObject({ url: 'https://example.com' });
  });

  it('reads the method, the headers and the body', () => {
    expect(request(`curl -X PUT https://example.com -H 'Content-Type: application/json' -H "X-Id:  7 " -d '{"a":1}'`)).toEqual({
      url: 'https://example.com',
      method: 'PUT',
      headers: [
        ['Content-Type', 'application/json'],
        ['X-Id', '7']
      ],
      body: { kind: 'text', text: '{"a":1}' },
      timeout: null
    });
  });

  it('posts when there is data, as a form unless said otherwise', () => {
    expect(request('curl example.com/login -d user=ada -d pass=1+1')).toMatchObject({
      method: 'POST',
      headers: [['Content-Type', 'application/x-www-form-urlencoded']],
      body: { kind: 'text', text: 'user=ada&pass=1+1' }
    });
    expect(request(`curl https://example.com --data-urlencode 'q=tea & cake' --data-urlencode '=a b' --data-raw @notafile`).body).toEqual({
      kind: 'text',
      text: 'q=tea+%26+cake&a+b&@notafile'
    });
  });

  it('knows --json', () => {
    expect(request(`curl --json '{"a":1}' https://example.com`)).toMatchObject({
      method: 'POST',
      headers: [
        ['Content-Type', 'application/json'],
        ['Accept', 'application/json']
      ],
      body: { kind: 'text', text: '{"a":1}' }
    });
    expect(request(`curl --json '{}' -H 'accept: text/plain' https://example.com`).headers).toEqual([
      ['accept', 'text/plain'],
      ['Content-Type', 'application/json']
    ]);
  });

  it('puts data in the address with -G', () => {
    expect(request('curl -G https://example.com/search -d q=tea -d page=2')).toMatchObject({
      url: 'https://example.com/search?q=tea&page=2',
      method: 'GET',
      body: null,
      headers: []
    });
    expect(request('curl -G "https://example.com/search?a=1" -d q=tea').url).toBe('https://example.com/search?a=1&q=tea');
  });

  it('reads options written against each other', () => {
    expect(request(`curl -XPOST -H'Accept: */*' -sSLd a=1 https://example.com`)).toMatchObject({
      method: 'POST',
      headers: [
        ['Accept', '*/*'],
        ['Content-Type', 'application/x-www-form-urlencoded']
      ],
      body: { kind: 'text', text: 'a=1' }
    });
    expect(request('curl -I https://example.com').method).toBe('HEAD');
  });

  it('turns shorthands into the headers they are', () => {
    expect(request('curl -u ada:secret -A "Bot/1.0" -b "id=7" -r 0-99 https://example.com').headers).toEqual([
      ['Authorization', `Basic ${btoa('ada:secret')}`],
      ['User-Agent', 'Bot/1.0'],
      ['Cookie', 'id=7'],
      ['Range', 'bytes=0-99']
    ]);
    expect(request('curl --oauth2-bearer abc -e https://from.example https://example.com').headers).toEqual([
      ['Authorization', 'Bearer abc'],
      ['Referer', 'https://from.example']
    ]);
    expect(request('curl -m 2.5 https://example.com').timeout).toBe(2500);
  });

  it('reads a multipart form', () => {
    expect(request(`curl https://example.com/upload -F name=Ada -F 'avatar=@me.png;type=image/png' --form-string note=@home`)).toMatchObject({
      method: 'POST',
      headers: [],
      body: {
        kind: 'form',
        fields: [
          { name: 'name', value: 'Ada', file: false },
          { name: 'avatar', value: 'me.png', file: true },
          { name: 'note', value: '@home', file: false }
        ]
      }
    });
  });

  it('leaves out a header that is taken away, and keeps an empty one', () => {
    expect(request(`curl -H 'Accept:' -H 'X-Empty;' https://example.com`).headers).toEqual([['X-Empty', '']]);
  });

  it('notes what fetch can not do the same', () => {
    expect(notes('curl example.com')).toEqual(['scheme']);
    expect(notes('curl -k https://example.com')).toEqual(['insecure']);
    expect(notes('curl -b id=7 https://example.com')).toEqual(['cookie']);
    expect(notes('curl -d @payload.json https://example.com')).toEqual(['file']);
    expect(request('curl -d @payload.json https://example.com').body).toEqual({ kind: 'file', name: 'payload.json' });
    expect(notes('curl -F doc=@a.pdf https://example.com')).toEqual(['file']);
    expect(notes('curl -X GET -d a=1 https://example.com')).toEqual(['bodyWithGet']);
    expect(notes('curl https://a.example https://b.example')).toEqual(['urls']);
    expect(read('curl --proxy http://p:8080 --retry 3 -x http://q --cacert ca.pem --frobnicate https://example.com').notes).toEqual([
      { id: 'ignored', vars: { options: '--proxy, --retry, -x, --cacert, --frobnicate' } }
    ]);
    expect(notes('curl -o out.html -w "%{http_code}" -v https://example.com')).toEqual([]);
  });

  it('says what is wrong with a command it can not read', () => {
    expect(parse('  ')).toEqual({ ok: false, error: 'empty', vars: {} });
    expect(parse('wget https://example.com')).toEqual({ ok: false, error: 'notCurl', vars: { word: 'wget' } });
    expect(parse(`curl 'https://example.com`)).toEqual({ ok: false, error: 'quote', vars: {} });
    expect(parse('curl -X POST')).toEqual({ ok: false, error: 'noUrl', vars: {} });
    expect(parse('curl https://example.com -H')).toEqual({ ok: false, error: 'missing', vars: { option: '-H' } });
    expect(parse('curl https://example.com --data')).toEqual({ ok: false, error: 'missing', vars: { option: '--data' } });
  });
});

describe('quote and literal', () => {
  it('writes a string as JavaScript does', () => {
    expect(quote("it's")).toBe("'it\\'s'");
    expect(quote('a\\b\n\tc\u2028')).toBe("'a\\\\b\\n\\tc\\u2028'");
    expect(quote('"double" stays')).toBe(`'"double" stays'`);
    expect(new Function(`return ${quote("\0 \x1f ' \\ \r\n é 😀")}`)()).toBe("\0 \x1f ' \\ \r\n é 😀");
  });

  it('writes JSON as an object literal', () => {
    expect(literal({ name: 'Ada', 'first-name': null, n: [1, 2.5, true], empty: {}, none: [] })).toBe(
      "{\n  name: 'Ada',\n  'first-name': null,\n  n: [\n    1,\n    2.5,\n    true\n  ],\n  empty: {},\n  none: []\n}"
    );
  });
});

describe('toFetch', () => {
  it('writes a GET without options', () => {
    expect(toFetch(request('curl https://example.com/api'))).toBe(
      "const response = await fetch('https://example.com/api');\nconst data = await response.json();"
    );
    expect(toFetch(request('curl https://example.com/api'), 'text')).toContain('await response.text();');
    expect(toFetch(request('curl https://example.com/api'), 'none')).toBe("const response = await fetch('https://example.com/api');");
    expect(toFetch(request('curl -I https://example.com'))).toBe("const response = await fetch('https://example.com', {\n  method: 'HEAD'\n});");
  });

  it('writes a JSON body with JSON.stringify', () => {
    const code = toFetch(
      request(
        `curl https://example.com/orders -H 'Authorization: Bearer abc' -H 'Content-Type: application/json' -d '{"customer":"ada","lines":[{"sku":"A-1"}]}'`
      )
    );
    expect(code).toBe(
      [
        "const response = await fetch('https://example.com/orders', {",
        "  method: 'POST',",
        '  headers: {',
        "    Authorization: 'Bearer abc',",
        "    'Content-Type': 'application/json'",
        '  },',
        '  body: JSON.stringify({',
        "    customer: 'ada',",
        '    lines: [',
        '      {',
        "        sku: 'A-1'",
        '      }',
        '    ]',
        '  })',
        '});',
        'const data = await response.json();'
      ].join('\n')
    );
  });

  it('writes another body as the text it is', () => {
    expect(toFetch(request('curl example.com -d a=1 -d "b=it\'s"'), 'none')).toBe(
      "const response = await fetch('http://example.com', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/x-www-form-urlencoded'\n  },\n  body: 'a=1&b=it\\'s'\n});"
    );
    // JSON that is not valid is sent as it is, not repaired
    expect(toFetch(request(`curl https://example.com --json '{oops'`), 'none')).toContain("body: '{oops'");
  });

  it('writes a form, a file, a referrer and a timeout', () => {
    expect(toFetch(request(`curl https://example.com/upload -F name=Ada -F avatar=@me.png`), 'none')).toBe(
      "const form = new FormData();\nform.append('name', 'Ada');\nform.append('avatar', file); // me.png: a File or Blob\n\nconst response = await fetch('https://example.com/upload', {\n  method: 'POST',\n  body: form\n});"
    );
    expect(toFetch(request('curl https://example.com -d @payload.json'), 'none')).toContain(
      "const contents = ''; // what is in payload.json\n\nconst response"
    );
    expect(toFetch(request('curl https://example.com -e https://from.example -m 10'), 'none')).toBe(
      "const response = await fetch('https://example.com', {\n  referrer: 'https://from.example',\n  signal: AbortSignal.timeout(10000)\n});"
    );
  });

  it('writes headers as pairs when one is there twice', () => {
    expect(toFetch(request(`curl https://example.com -H 'Accept: a' -H 'accept: b'`), 'none')).toBe(
      "const response = await fetch('https://example.com', {\n  headers: [\n    ['Accept', 'a'],\n    ['accept', 'b']\n  ]\n});"
    );
  });
});
