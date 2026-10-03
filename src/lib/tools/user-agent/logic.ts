/**
 * What a user-agent string says: the browser, the engine under it, the system and the kind of device. Read with a
 * list of patterns in the order that matters: nearly every browser also claims to be Mozilla, Chrome and Safari, so
 * the most specific name is looked for first.
 */

export interface Named {
  name: string;
  /** Empty when the string does not say */
  version: string;
}

export type DeviceKind = 'desktop' | 'mobile' | 'tablet' | 'tv' | 'console' | 'unknown';

export type NoteId =
  /** Windows NT 10.0 is what both Windows 10 and 11 say */
  | 'windows'
  /** macOS is frozen at 10.15.7 in the string */
  | 'mac'
  /** Chrome on Android says "Android 10; K" whatever the phone is */
  | 'android'
  /** every browser on iOS runs on WebKit */
  | 'ios'
  /** an iPad asks for the desktop site by saying it is a Mac */
  | 'ipad'
  /** software that says what it is, not a person behind a browser */
  | 'bot';

export interface Result {
  browser: Named | null;
  engine: Named | null;
  os: Named | null;
  device: { kind: DeviceKind; model: string };
  /** The app the page is opened in, when it is not a browser of its own: Instagram, Facebook */
  app: string;
  /** A crawler or a program that fetches pages */
  bot: (Named & { kind: 'crawler' | 'tool' }) | null;
  notes: NoteId[];
}

/** The first of the patterns that matches, with what it captured as the version. */
function first<T extends unknown[]>(ua: string, patterns: readonly (readonly [string, RegExp, ...T])[]): { name: string; version: string; rest: T } | null {
  for (const [name, pattern, ...rest] of patterns) {
    const found = pattern.exec(ua);
    if (found) return { name, version: (found[1] ?? '').replaceAll('_', '.'), rest: rest as T };
  }
  return null;
}

const BROWSERS: [string, RegExp][] = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/([\d.]+)/],
  ['Opera', /\b(?:OPR|OPT|OPiOS)\/([\d.]+)/],
  ['Opera', /\bOpera\/.*\bVersion\/([\d.]+)/],
  ['Opera', /\bOpera[/ ]([\d.]+)/],
  ['Samsung Internet', /\bSamsungBrowser\/([\d.]+)/],
  ['Vivaldi', /\bVivaldi\/([\d.]+)/],
  ['Yandex Browser', /\bYaBrowser\/([\d.]+)/],
  ['DuckDuckGo', /\b(?:DuckDuckGo|Ddg)\/([\d.]+)/],
  ['UC Browser', /\bUCBrowser\/([\d.]+)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Electron', /\bElectron\/([\d.]+)/],
  ['Headless Chrome', /\bHeadlessChrome\/([\d.]+)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/([\d.]+)/],
  ['Safari', /\bVersion\/([\d.]+).*\bSafari\//],
  ['Internet Explorer', /\bMSIE ([\d.]+)/],
  ['Internet Explorer', /\bTrident\/.*\brv:([\d.]+)/]
];

const BOTS: [string, RegExp, 'crawler' | 'tool'][] = [
  ['Googlebot', /Googlebot(?:-\w+)?\/([\d.]+)/, 'crawler'],
  ['Googlebot', /Googlebot|Google-InspectionTool|AdsBot-Google|Mediapartners-Google/, 'crawler'],
  ['Bingbot', /bingbot\/([\d.]+)/i, 'crawler'],
  ['DuckDuckBot', /DuckDuckBot\/([\d.]+)/, 'crawler'],
  ['YandexBot', /YandexBot\/([\d.]+)/, 'crawler'],
  ['Baiduspider', /Baiduspider\/?([\d.]*)/, 'crawler'],
  ['Applebot', /Applebot\/([\d.]+)/, 'crawler'],
  ['GPTBot', /GPTBot\/([\d.]+)/, 'crawler'],
  ['ChatGPT-User', /ChatGPT-User\/([\d.]+)/, 'crawler'],
  ['ClaudeBot', /ClaudeBot\/([\d.]+)/, 'crawler'],
  ['PerplexityBot', /PerplexityBot\/([\d.]+)/, 'crawler'],
  ['Facebook', /facebookexternalhit\/([\d.]+)/, 'crawler'],
  ['Twitterbot', /Twitterbot\/([\d.]+)/, 'crawler'],
  ['LinkedInBot', /LinkedInBot\/([\d.]+)/, 'crawler'],
  ['Slackbot', /Slackbot(?:-LinkExpanding)? ([\d.]+)/, 'crawler'],
  ['Discordbot', /Discordbot\/([\d.]+)/, 'crawler'],
  ['WhatsApp', /^WhatsApp\/([\d.]+)/, 'crawler'],
  ['TelegramBot', /TelegramBot/, 'crawler'],
  ['AhrefsBot', /AhrefsBot\/([\d.]+)/, 'crawler'],
  ['SemrushBot', /SemrushBot\/([\d.]+)/, 'crawler'],
  ['curl', /^curl\/([\d.]+)/, 'tool'],
  ['Wget', /^Wget\/([\d.]+)/, 'tool'],
  ['Python Requests', /python-requests\/([\d.]+)/, 'tool'],
  ['Go HTTP client', /Go-http-client\/([\d.]+)/, 'tool'],
  ['Postman', /PostmanRuntime\/([\d.]+)/, 'tool'],
  ['axios', /axios\/([\d.]+)/, 'tool'],
  ['OkHttp', /okhttp\/([\d.]+)/, 'tool'],
  ['Node.js', /^node(?:-fetch)?(?:\/([\d.]+))?$|\bundici\b/, 'tool'],
  ['Java', /^Java\/([\d._]+)/, 'tool'],
  // says so itself, without a name that is known here
  ['', /bot\b|crawler|spider|crawling/i, 'crawler']
];

const APPS: [string, RegExp][] = [
  ['Facebook', /\bFBA[NV]\//],
  ['Instagram', /\bInstagram\b/],
  ['TikTok', /musical_ly|BytedanceWebview|\bTikTok\b/],
  ['WeChat', /\bMicroMessenger\//],
  ['LINE', /\bLine\//],
  ['LinkedIn', /\bLinkedInApp\b/],
  ['Snapchat', /\bSnapchat\//],
  ['Pinterest', /\bPinterest\//],
  ['Google app', /\bGSA\//]
];

const WINDOWS: Record<string, string> = { '10.0': '10 or 11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.2': 'XP', '5.1': 'XP' };

function system(ua: string): Named | null {
  let found: RegExpExecArray | null;
  if (/\bXbox\b/i.test(ua)) return { name: 'Xbox', version: '' };
  if ((found = /Windows Phone(?: OS)? ([\d.]+)/.exec(ua))) return { name: 'Windows Phone', version: found[1] };
  if ((found = /Windows NT ([\d.]+)/.exec(ua))) return { name: 'Windows', version: WINDOWS[found[1]] ?? `NT ${found[1]}` };
  if (/Windows/.test(ua)) return { name: 'Windows', version: '' };
  if ((found = /\b(?:iPhone OS|CPU OS) (\d+(?:_\d+)*)/.exec(ua))) return { name: /iPad/.test(ua) ? 'iPadOS' : 'iOS', version: found[1].replaceAll('_', '.') };
  if (/\b(?:iPhone|iPad|iPod)\b/.test(ua)) return { name: 'iOS', version: '' };
  if ((found = /Android ([\d.]+)/.exec(ua))) return { name: 'Android', version: found[1] };
  if (/Android/.test(ua)) return { name: 'Android', version: '' };
  if ((found = /CrOS \S+ ([\d.]+)/.exec(ua))) return { name: 'ChromeOS', version: found[1] };
  if ((found = /Mac OS X (\d+(?:[_.]\d+)*)/.exec(ua))) return { name: 'macOS', version: found[1].replaceAll('_', '.') };
  if (/Macintosh/.test(ua)) return { name: 'macOS', version: '' };
  if ((found = /Tizen ([\d.]+)/.exec(ua))) return { name: 'Tizen', version: found[1] };
  if (/Web0S|webOS/.test(ua)) return { name: 'webOS', version: '' };
  if ((found = /PlayStation (?:Portable|Vita|\d)/.exec(ua))) return { name: found[0], version: '' };
  if (/Nintendo/.test(ua)) return { name: 'Nintendo', version: '' };
  if (/Ubuntu/.test(ua)) return { name: 'Linux', version: 'Ubuntu' };
  if (/Linux|X11/.test(ua)) return { name: 'Linux', version: '' };
  return null;
}

function engineOf(ua: string, ios: boolean): Named | null {
  const version = (pattern: RegExp) => pattern.exec(ua)?.[1] ?? '';
  // on an iPhone or iPad every browser is Safari's engine with another face
  if (ios && /AppleWebKit/.test(ua)) return { name: 'WebKit', version: version(/AppleWebKit\/([\d.]+)/) };
  if (/\bEdge\/\d/.test(ua)) return { name: 'EdgeHTML', version: version(/\bEdge\/([\d.]+)/) };
  if (/Trident\//.test(ua)) return { name: 'Trident', version: version(/Trident\/([\d.]+)/) };
  if (/Presto\//.test(ua)) return { name: 'Presto', version: version(/Presto\/([\d.]+)/) };
  if (/Gecko\/\d/.test(ua)) return { name: 'Gecko', version: version(/\brv:([\d.]+)/) };
  // Blink is Chrome's engine and carries Chrome's version
  if (/AppleWebKit/.test(ua) && /\b(?:Chrome|HeadlessChrome|Chromium)\/\d/.test(ua))
    return { name: 'Blink', version: version(/\b(?:Chrome|HeadlessChrome|Chromium)\/([\d.]+)/) };
  if (/AppleWebKit/.test(ua)) return { name: 'WebKit', version: version(/AppleWebKit\/([\d.]+)/) };
  return null;
}

function deviceOf(ua: string, os: Named | null): Result['device'] {
  if (/\bXbox\b|PlayStation|Nintendo/i.test(ua)) return { kind: 'console', model: /Xbox|PlayStation \w+|Nintendo \w+/i.exec(ua)?.[0] ?? '' };
  if (/Smart-?TV|\bTV\b|Web0S|AppleTV|GoogleTV|BRAVIA|HbbTV|CrKey/i.test(ua)) return { kind: 'tv', model: '' };
  if (/iPad/.test(ua)) return { kind: 'tablet', model: 'iPad' };
  if (/iPhone|iPod/.test(ua)) return { kind: 'mobile', model: /iPod/.test(ua) ? 'iPod touch' : 'iPhone' };
  if (os?.name === 'Android') {
    // "Android 14; Pixel 8 Build/…": the piece after the version is the model, unless it is a language or Chrome's placeholder K
    const piece = /Android [\d.]+; ([^;)]+?)(?: Build\/[^;)]*)?[;)]/.exec(ua)?.[1].trim() ?? '';
    const model = /^(K|wv|Mobile|Tablet|[a-z]{2}[-_][A-Za-z]{2}|rv:.*)$/.test(piece) ? '' : piece;
    return { kind: /Mobile/.test(ua) ? 'mobile' : 'tablet', model };
  }
  if (/Windows Phone|\bMobile\b/.test(ua)) return { kind: 'mobile', model: '' };
  if (/Tablet/.test(ua)) return { kind: 'tablet', model: '' };
  if (os && ['Windows', 'macOS', 'Linux', 'ChromeOS'].includes(os.name)) return { kind: 'desktop', model: os.name === 'macOS' ? 'Mac' : '' };
  return { kind: 'unknown', model: '' };
}

/** Reads a user-agent string. What it does not say stays empty; it is never guessed. */
export function parse(text: string): Result {
  const ua = text.trim();
  const os = system(ua);
  const ios = os?.name === 'iOS' || os?.name === 'iPadOS';
  const found = first(ua, BROWSERS);
  let browser: Named | null = found && { name: found.name, version: found.version };
  // a page shown inside an Android app, not a browser of its own
  if (browser?.name === 'Chrome' && /; wv\)/.test(ua)) browser = { ...browser, name: 'Android WebView' };
  const crawler = first(ua, BOTS);
  const bot = crawler && { name: crawler.name, version: crawler.version, kind: crawler.rest[0] };
  const app = first(ua, APPS)?.name ?? '';

  const notes: NoteId[] = [];
  if (bot) notes.push('bot');
  if (os?.name === 'Windows' && os.version === '10 or 11') notes.push('windows');
  if (os?.name === 'macOS' && os.version === '10.15.7') notes.push('mac');
  if (/Android 10; K\)/.test(ua)) notes.push('android');
  if (ios && browser && browser.name !== 'Safari') notes.push('ios');
  if (os?.name === 'macOS' && browser?.name === 'Safari') notes.push('ipad');
  return { browser, engine: engineOf(ua, ios), os, device: deviceOf(ua, os), app, bot, notes };
}

/** Strings to try, one of each kind. */
export const EXAMPLES: [name: string, ua: string][] = [
  ['Chrome, Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'],
  ['Safari, iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'],
  ['Chrome, Android', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'],
  ['Firefox, Linux', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0'],
  ['Edge, macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'],
  [
    'Samsung Internet',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36'
  ],
  [
    'Instagram, iPhone',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 385.0.0.25.70 (iPhone16,2; iOS 18_5; en_US; en; scale=3.00; 1290x2796)'
  ],
  [
    'Googlebot',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  ],
  ['curl', 'curl/8.9.1']
];
