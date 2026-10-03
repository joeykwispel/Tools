import { describe, expect, it } from 'vitest';
import { card, check, judgeImage, read, type Tag } from './logic';

const FULL = `<!doctype html>
<html lang="en">
  <head>
    <title>How tides work | Example</title>
    <meta name="description" content="A short explanation of tides.">
    <link rel="canonical" href="https://www.example.com/tides">
    <meta property="og:type" content="article">
    <meta property="og:title" content="How tides work">
    <meta property="og:description" content="The moon pulls, the sea follows: tides explained in five minutes.">
    <meta property="og:url" content="https://www.example.com/tides">
    <meta property="og:site_name" content="Example">
    <meta property="og:image" content="https://www.example.com/og/tides.png">
    <meta property="og:image:alt" content="A beach at low tide">
    <meta name="twitter:card" content="summary_large_image">
  </head>
</html>`;

const levels = (tags: Tag[]) => Object.fromEntries(check(tags).map((item) => [item.id, item.level]));

describe('read', () => {
  it('finds the tags in the order they are written', () => {
    expect(read(FULL)).toEqual([
      { key: 'title', value: 'How tides work | Example' },
      { key: 'description', value: 'A short explanation of tides.' },
      { key: 'canonical', value: 'https://www.example.com/tides' },
      { key: 'og:type', value: 'article' },
      { key: 'og:title', value: 'How tides work' },
      { key: 'og:description', value: 'The moon pulls, the sea follows: tides explained in five minutes.' },
      { key: 'og:url', value: 'https://www.example.com/tides' },
      { key: 'og:site_name', value: 'Example' },
      { key: 'og:image', value: 'https://www.example.com/og/tides.png' },
      { key: 'og:image:alt', value: 'A beach at low tide' },
      { key: 'twitter:card', value: 'summary_large_image' }
    ]);
  });

  it('reads tags however they are written', () => {
    expect(read(`<META CONTENT='Single &amp; "quoted"' PROPERTY='OG:Title' />`)).toEqual([{ key: 'og:title', value: 'Single & "quoted"' }]);
    expect(read('<meta property=og:title content=Unquoted>')).toEqual([{ key: 'og:title', value: 'Unquoted' }]);
    expect(read('<meta name="og:title" content="by name">')).toEqual([{ key: 'og:title', value: 'by name' }]);
    expect(read('<meta property="og:title" content="a > b">')).toEqual([{ key: 'og:title', value: 'a > b' }]);
    expect(read('<meta\n  property="og:description"\n  content="two\n   lines">')).toEqual([{ key: 'og:description', value: 'two lines' }]);
    expect(read('<title>\n  Caf&eacute; &#8211; menu\n</title>')).toEqual([{ key: 'title', value: 'Café – menu' }]);
    expect(read('<link href="/a" rel="alternate canonical">')).toEqual([{ key: 'canonical', value: '/a' }]);
  });

  it('leaves out what is not about sharing, and what is not a tag of the page', () => {
    expect(read('<meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="a.css">')).toEqual([]);
    expect(read('<!-- <meta property="og:title" content="old"> --><script>const a = \'<meta property="og:title" content="js">\';</script>')).toEqual([]);
    expect(read('<meta property="og:title">')).toEqual([]);
    expect(read('<title>Page</title><svg><title>Icon</title></svg>')).toEqual([{ key: 'title', value: 'Page' }]);
    expect(read('<metadata property="og:title" content="x">')).toEqual([]);
    expect(read('')).toEqual([]);
  });

  it('keeps every tag when one is there twice', () => {
    expect(read('<meta property="og:image" content="a.png"><meta property="og:image" content="b.png">')).toHaveLength(2);
  });
});

describe('card', () => {
  it('takes Open Graph first', () => {
    expect(card(read(FULL))).toEqual({
      title: 'How tides work',
      description: 'The moon pulls, the sea follows: tides explained in five minutes.',
      image: 'https://www.example.com/og/tides.png',
      imageAlt: 'A beach at low tide',
      url: 'https://www.example.com/tides',
      host: 'example.com',
      siteName: 'Example',
      large: true
    });
  });

  it('falls back on the tags of Twitter and on the plain ones', () => {
    const plain = card(read('<title>Plain</title><meta name="description" content="About"><link rel="canonical" href="https://shop.example.org/a?b=1">'));
    expect(plain).toMatchObject({
      title: 'Plain',
      description: 'About',
      url: 'https://shop.example.org/a?b=1',
      host: 'shop.example.org',
      image: '',
      large: false
    });
    const twitter = card(
      read(
        '<title>Plain</title><meta name="twitter:title" content="For X"><meta name="twitter:image" content="https://a.example/x.png"><meta name="twitter:card" content="summary">'
      )
    );
    expect(twitter).toMatchObject({ title: 'For X', image: 'https://a.example/x.png', large: false, host: '' });
  });

  it('takes the first of a tag that is there twice, and skips an empty one', () => {
    const made = card(
      read(
        '<meta property="og:title" content=""><meta property="og:title" content="Second"><meta property="og:image" content="a.png"><meta property="og:image" content="b.png">'
      )
    );
    expect(made).toMatchObject({ title: 'Second', image: 'a.png' });
  });

  it('has no host for an address that is not whole', () => {
    expect(card([{ key: 'og:url', value: '/tides' }]).host).toBe('');
    expect(card([{ key: 'og:url', value: 'https://' }]).host).toBe('');
  });
});

describe('check', () => {
  it('finds nothing to fix on a page that has it all', () => {
    const found = check(read(FULL));
    expect(found.map((item) => item.level)).toEqual(['good', 'good', 'good', 'good', 'good']);
    expect(found.map((item) => item.id)).toEqual(['titleGood', 'descriptionGood', 'imageGood', 'urlGood', 'cardGood']);
    expect(found[4].vars).toEqual({ value: 'summary_large_image' });
  });

  it('says what is missing on an empty page', () => {
    expect(levels([])).toEqual({
      titleMissing: 'fix',
      descriptionMissing: 'fix',
      imageMissing: 'fix',
      urlMissing: 'tip',
      cardMissing: 'tip',
      typeMissing: 'tip'
    });
  });

  it('says what a card falls back on', () => {
    const found = check(read('<title>Plain</title><meta name="twitter:description" content="About">'));
    expect(found[0]).toEqual({ level: 'tip', id: 'titleFallback', vars: { source: '<title>' } });
    expect(found[1]).toEqual({ level: 'tip', id: 'descriptionFallback', vars: { source: 'twitter:description' } });
  });

  it('counts characters, not bytes, for what is too long', () => {
    expect(check([{ key: 'og:title', value: 'é'.repeat(70) }])[0]).toMatchObject({ id: 'titleGood', vars: { length: '70' } });
    expect(check([{ key: 'og:title', value: '😀'.repeat(71) }])[0]).toEqual({ level: 'tip', id: 'titleLong', vars: { length: '71', max: '70' } });
    expect(check([{ key: 'og:description', value: 'a'.repeat(201) }])[1]).toMatchObject({ id: 'descriptionLong', vars: { length: '201', max: '200' } });
  });

  it('wants whole addresses, and a description of the picture', () => {
    expect(levels([{ key: 'og:image', value: '/og.png' }])).toMatchObject({ imageRelative: 'fix', altMissing: 'tip' });
    expect(levels([{ key: 'og:image', value: 'http://example.com/og.png' }])).toMatchObject({ imageHttp: 'tip' });
    expect(levels([{ key: 'og:url', value: 'example.com/a' }])).toMatchObject({ urlRelative: 'fix' });
    expect(
      levels([
        { key: 'og:image', value: 'https://example.com/og.png' },
        { key: 'twitter:image:alt', value: 'A picture' }
      ])
    ).not.toHaveProperty('altMissing');
  });

  it('knows the kinds of card X has', () => {
    expect(levels([{ key: 'twitter:card', value: 'Summary' }])).toMatchObject({ cardGood: 'good' });
    expect(check([{ key: 'twitter:card', value: 'large' }]).find((item) => item.id === 'cardUnknown')).toEqual({
      level: 'fix',
      id: 'cardUnknown',
      vars: { value: 'large' }
    });
  });
});

describe('judgeImage', () => {
  it('says what the sites do with a picture of a size', () => {
    expect(judgeImage(1200, 630)).toBe('good');
    expect(judgeImage(2400, 1260)).toBe('good');
    expect(judgeImage(1200, 628)).toBe('low');
    expect(judgeImage(600, 315)).toBe('low');
    expect(judgeImage(1200, 1200)).toBe('ratio');
    expect(judgeImage(1600, 500)).toBe('ratio');
    expect(judgeImage(199, 630)).toBe('tooSmall');
    expect(judgeImage(400, 100)).toBe('tooSmall');
  });
});
