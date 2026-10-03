import { describe, expect, it } from 'vitest';
import { EXAMPLES, parse } from './logic';

const UA = Object.fromEntries(EXAMPLES);

describe('parse', () => {
  it('reads Chrome on Windows', () => {
    expect(parse(UA['Chrome, Windows'])).toEqual({
      browser: { name: 'Chrome', version: '140.0.0.0' },
      engine: { name: 'Blink', version: '140.0.0.0' },
      os: { name: 'Windows', version: '10 or 11' },
      device: { kind: 'desktop', model: '' },
      app: '',
      bot: null,
      notes: ['windows']
    });
  });

  it('reads Safari on an iPhone and on a Mac', () => {
    expect(parse(UA['Safari, iPhone'])).toEqual({
      browser: { name: 'Safari', version: '18.5' },
      engine: { name: 'WebKit', version: '605.1.15' },
      os: { name: 'iOS', version: '18.5' },
      device: { kind: 'mobile', model: 'iPhone' },
      app: '',
      bot: null,
      notes: []
    });
    expect(parse('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15')).toMatchObject({
      browser: { name: 'Safari', version: '18.5' },
      os: { name: 'macOS', version: '10.15.7' },
      device: { kind: 'desktop', model: 'Mac' },
      notes: ['mac', 'ipad']
    });
  });

  it('reads an iPad that says so', () => {
    expect(
      parse('Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1')
    ).toMatchObject({
      os: { name: 'iPadOS', version: '17.4' },
      device: { kind: 'tablet', model: 'iPad' }
    });
  });

  it('knows that every browser on iOS is WebKit', () => {
    const chrome = parse(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1'
    );
    expect(chrome).toMatchObject({ browser: { name: 'Chrome', version: '140.0.7339.101' }, engine: { name: 'WebKit', version: '605.1.15' }, notes: ['ios'] });
    const firefox = parse(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15'
    );
    expect(firefox).toMatchObject({ browser: { name: 'Firefox', version: '143.0' }, engine: { name: 'WebKit' } });
  });

  it('reads Chrome on Android, reduced and not', () => {
    expect(parse(UA['Chrome, Android'])).toMatchObject({
      browser: { name: 'Chrome' },
      engine: { name: 'Blink' },
      os: { name: 'Android', version: '10' },
      device: { kind: 'mobile', model: '' },
      notes: ['android']
    });
    expect(
      parse('Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36')
    ).toMatchObject({
      os: { name: 'Android', version: '13' },
      device: { kind: 'mobile', model: 'Pixel 7' },
      notes: []
    });
    expect(parse('Mozilla/5.0 (Linux; Android 12; SM-X906C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36').device).toEqual({
      kind: 'tablet',
      model: 'SM-X906C'
    });
    expect(
      parse('Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36')
    ).toMatchObject({
      browser: { name: 'Android WebView', version: '116.0.0.0' },
      device: { model: 'Pixel 7' }
    });
  });

  it('reads Firefox', () => {
    expect(parse(UA['Firefox, Linux'])).toMatchObject({
      browser: { name: 'Firefox', version: '143.0' },
      engine: { name: 'Gecko', version: '143.0' },
      os: { name: 'Linux', version: 'Ubuntu' },
      device: { kind: 'desktop' }
    });
    expect(parse('Mozilla/5.0 (Android 14; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0')).toMatchObject({
      browser: { name: 'Firefox' },
      engine: { name: 'Gecko', version: '143.0' },
      os: { name: 'Android', version: '14' },
      device: { kind: 'mobile', model: '' }
    });
  });

  it('finds the browser behind the names it also carries', () => {
    expect(parse(UA['Edge, macOS'])).toMatchObject({
      browser: { name: 'Edge', version: '140.0.0.0' },
      engine: { name: 'Blink' },
      os: { name: 'macOS' },
      notes: ['mac']
    });
    expect(parse(UA['Samsung Internet'])).toMatchObject({
      browser: { name: 'Samsung Internet', version: '27.0' },
      device: { kind: 'mobile', model: 'SM-S918B' }
    });
    expect(
      parse('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0').browser
    ).toEqual({ name: 'Opera', version: '124.0.0.0' });
    expect(parse('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36')).toMatchObject({
      browser: { name: 'Headless Chrome' },
      engine: { name: 'Blink', version: '140.0.0.0' }
    });
  });

  it('reads browsers of the past', () => {
    expect(parse('Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko')).toMatchObject({
      browser: { name: 'Internet Explorer', version: '11.0' },
      engine: { name: 'Trident', version: '7.0' },
      os: { name: 'Windows', version: '7' }
    });
    expect(parse('Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)')).toMatchObject({
      browser: { name: 'Internet Explorer', version: '8.0' },
      os: { version: 'XP' }
    });
    expect(
      parse('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763')
    ).toMatchObject({
      browser: { name: 'Edge', version: '18.17763' },
      engine: { name: 'EdgeHTML', version: '18.17763' }
    });
    expect(parse('Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.18')).toMatchObject({
      browser: { name: 'Opera', version: '12.18' },
      engine: { name: 'Presto', version: '2.12.388' }
    });
  });

  it('names the app a page is opened in', () => {
    expect(parse(UA['Instagram, iPhone'])).toMatchObject({
      browser: null,
      app: 'Instagram',
      engine: { name: 'WebKit' },
      os: { name: 'iOS', version: '18.5' },
      device: { model: 'iPhone' }
    });
    expect(
      parse(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36 [FBAN/FB4A;FBAV/470.0.0.0;]'
      ).app
    ).toBe('Facebook');
  });

  it('knows crawlers and tools', () => {
    expect(parse(UA['Googlebot'])).toMatchObject({
      bot: { name: 'Googlebot', version: '2.1', kind: 'crawler' },
      browser: { name: 'Chrome' },
      device: { kind: 'mobile', model: 'Nexus 5X' },
      notes: ['bot']
    });
    expect(parse('curl/8.9.1')).toEqual({
      browser: null,
      engine: null,
      os: null,
      device: { kind: 'unknown', model: '' },
      app: '',
      bot: { name: 'curl', version: '8.9.1', kind: 'tool' },
      notes: ['bot']
    });
    expect(parse('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)').bot).toEqual({
      name: 'ClaudeBot',
      version: '1.0',
      kind: 'crawler'
    });
    expect(parse('python-requests/2.32.3').bot).toEqual({ name: 'Python Requests', version: '2.32.3', kind: 'tool' });
    expect(parse('SomeNewCrawler/3.1 (+https://example.com/bot)').bot).toEqual({ name: '', version: '', kind: 'crawler' });
    expect(parse('Mozilla/5.0 (compatible; Slackbot-LinkExpanding 1.0; +https://api.slack.com/robots)').bot).toMatchObject({
      name: 'Slackbot',
      version: '1.0'
    });
  });

  it('reads consoles, televisions and ChromeOS', () => {
    expect(parse('Mozilla/5.0 (PlayStation 5/SmartTV) AppleWebKit/605.1.15 (KHTML, like Gecko)').device).toEqual({ kind: 'console', model: 'PlayStation 5' });
    expect(parse('Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.31 TV Safari/537.36')).toMatchObject({
      os: { name: 'Tizen', version: '7.0' },
      device: { kind: 'tv' }
    });
    expect(parse('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')).toMatchObject({
      os: { name: 'ChromeOS', version: '14541.0.0' },
      device: { kind: 'desktop' }
    });
  });

  it('says nothing about what is not there', () => {
    const none = { browser: null, engine: null, os: null, device: { kind: 'unknown', model: '' }, app: '', bot: null, notes: [] };
    expect(parse('')).toEqual(none);
    expect(parse('hello world')).toEqual(none);
  });
});

describe('the examples', () => {
  it('are all read as something', () => {
    for (const [name, ua] of EXAMPLES) {
      const read = parse(ua);
      expect(read.browser ?? read.bot ?? read.app, name).toBeTruthy();
    }
  });
});
