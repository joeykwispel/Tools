import type { Category, CategoryId, Tool } from './types';

/** The categories, in the order they are shown. */
export const categories: Category[] = [
  { id: 'encode', title: { en: 'Encode / decode', nl: 'Coderen / decoderen' } },
  { id: 'data', title: { en: 'Data & formats', nl: 'Data & formaten' } },
  { id: 'xml', title: { en: 'XML', nl: 'XML' } },
  { id: 'text', title: { en: 'Text', nl: 'Tekst' } },
  { id: 'security', title: { en: 'Generate & security', nl: 'Genereren & beveiliging' } },
  { id: 'time', title: { en: 'Date & time', nl: 'Datum & tijd' } },
  { id: 'css', title: { en: 'Front-end & CSS', nl: 'Front-end & CSS' } },
  { id: 'web', title: { en: 'Web & HTTP', nl: 'Web & HTTP' } },
  { id: 'reference', title: { en: 'Dev reference', nl: 'Naslag' } },
  { id: 'dutch', title: { en: 'Dutch test data', nl: 'Nederlandse testdata' } },
  { id: 'team', title: { en: 'Team', nl: 'Team' } }
];

/**
 * The tools that are built, by slug. Each is loaded only on its own page.
 * Building a tool means adding src/lib/tools/<slug>/Tool.svelte and one line here; the rest follows from the registry.
 */
const built: Record<string, Tool['load']> = {
  regex: () => import('./regex/Tool.svelte'),
  base64: () => import('./base64/Tool.svelte'),
  url: () => import('./url/Tool.svelte'),
  jwt: () => import('./jwt/Tool.svelte'),
  'html-entities': () => import('./html-entities/Tool.svelte'),
  unicode: () => import('./unicode/Tool.svelte'),
  hex: () => import('./hex/Tool.svelte'),
  escape: () => import('./escape/Tool.svelte'),
  json: () => import('./json/Tool.svelte'),
  yaml: () => import('./yaml/Tool.svelte'),
  'json-to-ts': () => import('./json-to-ts/Tool.svelte'),
  diff: () => import('./diff/Tool.svelte'),
  csv: () => import('./csv/Tool.svelte'),
  jsonpath: () => import('./jsonpath/Tool.svelte'),
  sql: () => import('./sql/Tool.svelte'),
  env: () => import('./env/Tool.svelte'),
  xml: () => import('./xml/Tool.svelte'),
  xpath: () => import('./xpath/Tool.svelte'),
  'xml-json': () => import('./xml-json/Tool.svelte'),
  case: () => import('./case/Tool.svelte'),
  counter: () => import('./counter/Tool.svelte'),
  lines: () => import('./lines/Tool.svelte'),
  markdown: () => import('./markdown/Tool.svelte'),
  slug: () => import('./slug/Tool.svelte'),
  uuid: () => import('./uuid/Tool.svelte'),
  password: () => import('./password/Tool.svelte'),
  hash: () => import('./hash/Tool.svelte'),
  hmac: () => import('./hmac/Tool.svelte'),
  certificate: () => import('./certificate/Tool.svelte'),
  qr: () => import('./qr/Tool.svelte'),
  totp: () => import('./totp/Tool.svelte'),
  sri: () => import('./sri/Tool.svelte'),
  csp: () => import('./csp/Tool.svelte'),
  timestamp: () => import('./timestamp/Tool.svelte'),
  cron: () => import('./cron/Tool.svelte')
};

/** Shorthand for one tool: [slug, icon, English title, English line, Dutch title, Dutch line, keywords]. */
type Planned = [slug: string, icon: string, enTitle: string, enLine: string, nlTitle: string, nlLine: string, keywords: string[]];

const soon = (category: CategoryId, rows: Planned[]): Tool[] =>
  rows.map(([slug, icon, enTitle, enLine, nlTitle, nlLine, keywords]) => ({
    slug,
    category,
    icon,
    title: { en: enTitle, nl: nlTitle },
    description: { en: enLine, nl: nlLine },
    keywords,
    status: built[slug] ? 'live' : 'soon',
    load: built[slug]
  }));

/** Every tool, the single source for the list, and later for search, routes and tests. */
export const tools: Tool[] = [
  ...soon('encode', [
    [
      'base64',
      'b64',
      'Base64',
      'Encode and decode text and files, URL-safe too.',
      'Base64',
      'Tekst en bestanden coderen en decoderen, ook URL-safe.',
      ['atob', 'btoa']
    ],
    [
      'url',
      '%20',
      'URL encode / decode',
      'Escape and unescape URLs and query strings.',
      'URL coderen / decoderen',
      "URL's en querystrings escapen en weer leesbaar maken.",
      ['percent', 'uri', 'query']
    ],
    [
      'jwt',
      'eyJ',
      'JWT decoder',
      'Read the claims, check the expiry and verify the signature.',
      'JWT-decoder',
      'Claims lezen, de verloopdatum checken en de handtekening controleren.',
      ['token', 'bearer', 'jose']
    ],
    [
      'html-entities',
      '&;',
      'HTML entities',
      'Convert characters to entities and back.',
      'HTML-entiteiten',
      'Tekens omzetten naar entiteiten en terug.',
      ['amp', 'nbsp', 'escape']
    ],
    [
      'unicode',
      'U+',
      'Unicode inspector',
      'Code points, bytes and invisible characters in a text.',
      'Unicode-inspector',
      'Codepunten, bytes en onzichtbare tekens in een tekst.',
      ['utf-8', 'emoji', 'zero-width']
    ],
    [
      'hex',
      '0x',
      'Hex / Base32',
      'Text and bytes to hex or Base32, and back.',
      'Hex / Base32',
      'Tekst en bytes naar hex of Base32, en terug.',
      ['hexadecimal', 'bytes']
    ],
    [
      'escape',
      '\\n',
      'String escape',
      'Escape a string for JSON, JavaScript or a regex.',
      'String escapen',
      'Een string escapen voor JSON, JavaScript of een regex.',
      ['unescape', 'quote', 'backslash']
    ]
  ]),
  ...soon('data', [
    [
      'json',
      '{ }',
      'JSON formatter',
      'Format, validate and minify, with a tree view.',
      'JSON-formatter',
      'Opmaken, valideren en verkleinen, met een boomweergave.',
      ['pretty', 'beautify', 'lint']
    ],
    ['yaml', '---', 'YAML ↔ JSON', 'Convert between YAML and JSON.', 'YAML ↔ JSON', 'Omzetten tussen YAML en JSON.', ['yml', 'convert']],
    [
      'json-to-ts',
      'TS',
      'JSON → TypeScript',
      'Types and a Zod schema from a JSON example.',
      'JSON → TypeScript',
      'Types en een Zod-schema uit een JSON-voorbeeld.',
      ['interface', 'zod', 'schema']
    ],
    ['diff', '+-', 'Diff', 'Compare two texts or two JSON documents.', 'Diff', 'Twee teksten of twee JSON-documenten vergelijken.', ['compare', 'patch']],
    [
      'csv',
      ',;',
      'CSV viewer',
      'Open a CSV file as a sortable table.',
      'CSV-viewer',
      'Een CSV-bestand openen als sorteerbare tabel.',
      ['table', 'spreadsheet', 'tsv']
    ],
    [
      'jsonpath',
      '$..',
      'JSONPath tester',
      'Try a JSONPath query against a document.',
      'JSONPath-tester',
      'Een JSONPath-query proberen op een document.',
      ['query', 'jq']
    ],
    ['sql', 'SQL', 'SQL formatter', 'Make a long query readable.', 'SQL-formatter', 'Een lange query leesbaar maken.', ['query', 'pretty', 'beautify']],
    [
      'env',
      '.env',
      '.env ↔ JSON',
      'Convert environment files to JSON and back.',
      '.env ↔ JSON',
      'Environment-bestanden omzetten naar JSON en terug.',
      ['dotenv', 'environment', 'variables']
    ]
  ]),
  ...soon('xml', [
    [
      'xml',
      '</>',
      'XML formatter',
      'Format XML and check it is well-formed.',
      'XML-formatter',
      'XML opmaken en controleren of het welgevormd is.',
      ['pretty', 'validate']
    ],
    [
      'xpath',
      '//*',
      'XPath tester',
      'Evaluate XPath, namespaces included.',
      'XPath-tester',
      'XPath evalueren, ook met namespaces.',
      ['query', 'namespace', 'xsl']
    ],
    ['xml-json', '<{}>', 'XML ↔ JSON', 'Convert between XML and JSON.', 'XML ↔ JSON', 'Omzetten tussen XML en JSON.', ['convert']]
  ]),
  ...soon('text', [
    [
      'regex',
      '.*',
      'Regex tester',
      'Matches, groups, flags and replace.',
      'Regex-tester',
      'Matches, groepen, flags en vervangen.',
      ['regexp', 'pattern', 'match']
    ],
    [
      'case',
      'aA',
      'Case converter',
      'camelCase, snake_case, kebab-case and more.',
      'Case-converter',
      'camelCase, snake_case, kebab-case en meer.',
      ['camel', 'snake', 'kebab', 'uppercase']
    ],
    ['counter', '123', 'Counter', 'Words, characters and reading time.', 'Teller', 'Woorden, tekens en leestijd.', ['word count', 'length']],
    [
      'lines',
      '≡',
      'Lines',
      'Sort, dedupe, trim and number lines.',
      'Regels',
      'Regels sorteren, ontdubbelen, trimmen en nummeren.',
      ['sort', 'unique', 'dedupe']
    ],
    [
      'markdown',
      'md',
      'Markdown preview',
      'Write Markdown and see the result.',
      'Markdown-voorbeeld',
      'Markdown schrijven en het resultaat zien.',
      ['md', 'render']
    ],
    [
      'slug',
      'a-b',
      'Slug + lorem ipsum',
      'Make a URL slug, or filler text.',
      'Slug + lorem ipsum',
      'Een URL-slug maken, of opvultekst.',
      ['slugify', 'placeholder', 'dummy']
    ]
  ]),
  ...soon('security', [
    [
      'uuid',
      'id',
      'UUID / ULID / NanoID',
      'Generate IDs, one or a thousand.',
      'UUID / ULID / NanoID',
      "ID's genereren, één of duizend.",
      ['guid', 'random', 'identifier']
    ],
    [
      'password',
      '***',
      'Password generator',
      'Passwords and passphrases, with their strength.',
      'Wachtwoordgenerator',
      'Wachtwoorden en wachtzinnen, met hun sterkte.',
      ['passphrase', 'random', 'entropy']
    ],
    [
      'hash',
      '#',
      'Hash',
      'SHA checksums of text and files, with compare.',
      'Hash',
      'SHA-checksums van tekst en bestanden, met vergelijken.',
      ['sha256', 'sha1', 'checksum', 'digest']
    ],
    [
      'hmac',
      'mac',
      'HMAC',
      'Sign a message with a secret key.',
      'HMAC',
      'Een bericht ondertekenen met een geheime sleutel.',
      ['signature', 'webhook', 'sha256']
    ],
    [
      'certificate',
      'pem',
      'Certificate decoder',
      'Subject, validity and algorithm of a PEM certificate.',
      'Certificaat-decoder',
      'Onderwerp, geldigheid en algoritme van een PEM-certificaat.',
      ['x509', 'tls', 'ssl', 'cert']
    ],
    ['qr', 'QR', 'QR code', 'For a URL, text or Wi-Fi, as SVG or PNG.', 'QR-code', 'Voor een URL, tekst of wifi, als SVG of PNG.', ['barcode', 'wifi']],
    [
      'totp',
      '2FA',
      'TOTP generator',
      'One-time codes from a secret, for testing 2FA.',
      'TOTP-generator',
      'Eenmalige codes uit een secret, om 2FA te testen.',
      ['otp', 'authenticator', 'mfa']
    ],
    [
      'sri',
      'sri',
      'SRI hash',
      'The integrity attribute for a script or stylesheet.',
      'SRI-hash',
      'Het integrity-attribuut voor een script of stylesheet.',
      ['subresource', 'integrity']
    ],
    [
      'csp',
      'csp',
      'CSP builder',
      'Build and read a Content Security Policy.',
      'CSP-bouwer',
      'Een Content Security Policy opbouwen en lezen.',
      ['content security policy', 'header']
    ]
  ]),
  ...soon('time', [
    [
      'timestamp',
      'unix',
      'Unix timestamp',
      'Seconds or milliseconds to a date, and back.',
      'Unix-timestamp',
      'Seconden of milliseconden naar een datum, en terug.',
      ['epoch', 'date', 'iso 8601']
    ],
    [
      'cron',
      '* *',
      'Cron explainer',
      'What a cron expression means and when it runs next.',
      'Cron-uitleg',
      'Wat een cron-expressie betekent en wanneer hij weer draait.',
      ['crontab', 'schedule']
    ],
    [
      'date-diff',
      'Δd',
      'Date difference',
      'Days and working days between two dates.',
      'Datumverschil',
      'Dagen en werkdagen tussen twee datums.',
      ['days', 'duration', 'werkdagen']
    ],
    [
      'timezone',
      'UTC',
      'Timezone planner',
      'Find a meeting time across time zones.',
      'Tijdzoneplanner',
      'Een vergadertijd vinden over tijdzones heen.',
      ['meeting', 'time zone', 'gmt']
    ]
  ]),
  ...soon('css', [
    ['colour', 'rgb', 'Colour converter', 'HEX, RGB, HSL and OKLCH.', 'Kleurconverter', 'HEX, RGB, HSL en OKLCH.', ['color', 'hex', 'hsl', 'oklch']],
    [
      'contrast',
      'AA',
      'Contrast checker',
      'WCAG 2.2 contrast, with the nearest colour that passes.',
      'Contrastchecker',
      'WCAG 2.2-contrast, met de dichtstbijzijnde kleur die slaagt.',
      ['wcag', 'a11y', 'accessibility']
    ],
    [
      'clamp',
      'rem',
      'clamp() calculator',
      'Fluid sizes, and px to rem.',
      'clamp()-calculator',
      'Vloeiende groottes, en px naar rem.',
      ['fluid', 'px', 'responsive']
    ],
    [
      'gradient',
      'grad',
      'Gradient + shadow',
      'Build a gradient or box shadow and copy the CSS.',
      'Gradient + schaduw',
      'Een gradient of box-shadow maken en de CSS kopiëren.',
      ['box-shadow', 'linear-gradient']
    ],
    [
      'bezier',
      'ease',
      'Cubic-bezier editor',
      'Shape an easing curve and see it move.',
      'Cubic-bezier-editor',
      'Een easing-curve vormen en zien bewegen.',
      ['easing', 'animation', 'transition']
    ],
    [
      'svg',
      'svg',
      'SVG optimiser',
      'Shrink an SVG, or turn it into a data URI.',
      'SVG-optimizer',
      'Een SVG verkleinen, of er een data-URI van maken.',
      ['svgo', 'minify', 'data uri']
    ],
    [
      'image',
      'img',
      'Image resizer',
      'Resize an image, or make a favicon set.',
      'Afbeelding schalen',
      'Een afbeelding schalen, of een faviconset maken.',
      ['favicon', 'resize', 'png']
    ],
    [
      'og-preview',
      'og',
      'Open Graph preview',
      'See how a page looks when it is shared.',
      'Open Graph-voorbeeld',
      'Zien hoe een pagina eruitziet als hij gedeeld wordt.',
      ['meta', 'twitter card', 'social']
    ]
  ]),
  ...soon('web', [
    [
      'url-parser',
      '?=',
      'URL parser',
      'Split a URL into its parts and query parameters.',
      'URL-parser',
      'Een URL opsplitsen in onderdelen en queryparameters.',
      ['query', 'params', 'host']
    ],
    [
      'curl',
      'curl',
      'curl → fetch',
      'Turn a curl command into fetch code.',
      'curl → fetch',
      'Van een curl-commando fetch-code maken.',
      ['request', 'http', 'convert']
    ],
    [
      'http-status',
      '404',
      'HTTP status + MIME',
      'Look up a status code or a media type.',
      'HTTP-status + MIME',
      'Een statuscode of mediatype opzoeken.',
      ['status code', 'content-type']
    ],
    [
      'user-agent',
      'UA',
      'User-agent parser',
      'Browser, engine and device from a user-agent string.',
      'User-agent-parser',
      'Browser, engine en apparaat uit een user-agent-string.',
      ['browser', 'device']
    ]
  ]),
  ...soon('reference', [
    [
      'browser',
      'dpr',
      'This browser',
      'Viewport, pixel ratio, preferences and key events, for bug reports.',
      'Deze browser',
      'Viewport, pixelratio, voorkeuren en toetsaanslagen, voor bugmeldingen.',
      ['viewport', 'keycode', 'screen']
    ],
    [
      'calculators',
      '0b',
      'Calculators',
      'Number bases, chmod, data sizes, CIDR and semver ranges.',
      'Rekenhulpjes',
      'Talstelsels, chmod, datagroottes, CIDR en semver-ranges.',
      ['binary', 'chmod', 'cidr', 'semver', 'bytes']
    ]
  ]),
  ...soon('dutch', [
    [
      'dutch-test-data',
      'NL',
      'Dutch test data',
      'Check and generate valid fake BSNs, IBANs and postcodes.',
      'Nederlandse testdata',
      "Geldige nep-BSN's, IBAN's en postcodes controleren en genereren.",
      ['bsn', 'iban', 'postcode', '11-proef', 'elfproef']
    ]
  ]),
  ...soon('team', [
    [
      'planning-poker',
      '13',
      'Planning poker',
      'A deck of cards for estimating together.',
      'Planningpoker',
      'Een set kaarten om samen te schatten.',
      ['scrum', 'estimate', 'story points']
    ],
    [
      'timebox',
      'min',
      'Timebox timer',
      'A timer for stand-ups and timeboxes.',
      'Timebox-timer',
      'Een timer voor stand-ups en timeboxes.',
      ['standup', 'countdown']
    ],
    [
      'random-picker',
      'rnd',
      'Random picker',
      'Pick who starts, with saved names.',
      'Willekeurige kiezer',
      'Kiezen wie begint, met bewaarde namen.',
      ['shuffle', 'names', 'wheel']
    ]
  ])
];

/** The tools of one category, in registry order. */
export const toolsIn = (id: CategoryId) => tools.filter((t) => t.category === id);

/** A tool that is built and has a page, or undefined. */
export const liveTool = (slug: string) => tools.find((t) => t.slug === slug && t.status === 'live');
