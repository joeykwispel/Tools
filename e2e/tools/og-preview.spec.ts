import { crc32, deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import { open } from '../helpers';

/** A PNG of one colour. */
function png(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 3 + 1) * height, 0x80);
  for (let y = 0; y < height; y++) rows[y * (width * 3 + 1)] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

test('Open Graph preview shows the cards of the sample and what there is to check', async ({ page }) => {
  await open(page, '/og-preview/');
  await expect(page.getByRole('status')).toHaveText('10 tags that matter when the page is shared.');

  const facebook = page.getByTestId('og-facebook');
  await expect(facebook).toContainText('shoreline.example');
  await expect(facebook).toContainText('How tides work');
  await expect(facebook).toContainText('The moon pulls, the sea follows.');
  await expect(facebook).toContainText('The picture at https://www.shoreline.example/og/tides.png');
  // a large card on X: the title lies over the picture
  await expect(page.getByTestId('og-x').locator('.overlay')).toHaveText('How tides work');
  await expect(page.getByTestId('og-chat')).toContainText('The Shoreline');

  const checks = page.getByTestId('og-checks').getByRole('listitem');
  await expect(checks).toHaveText([
    'ok og:title, 14 characters.',
    'ok og:description, 101 characters.',
    'ok og:image is a whole address.',
    'tip The picture has no description: add og:image:alt for who can not see it.',
    'ok og:url is a whole address.',
    'ok twitter:card is summary_large_image.'
  ]);
  await expect(page.getByTestId('og-tags-table').getByRole('row')).toHaveCount(11);
});

test('Open Graph preview falls back like the sites do, and says what is missing', async ({ page }) => {
  await open(page, '/og-preview/');
  const input = page.getByRole('textbox', { name: 'HTML of the page' });
  await input.fill('<title>Plain page | Site</title><meta name="description" content="About this page."><meta property="og:image" content="/og.png">');
  await expect(page.getByRole('status')).toHaveText('3 tags that matter when the page is shared.');

  const facebook = page.getByTestId('og-facebook');
  await expect(facebook).toContainText('Plain page | Site');
  await expect(facebook).toContainText('the domain of the page');
  // without twitter:card X shows a small card, with the picture next to the text
  await expect(page.getByTestId('og-x').locator('.card.side')).toContainText('About this page.');

  const checks = page.getByTestId('og-checks');
  await expect(checks).toContainText('tip No og:title: the sites fall back on <title>.');
  await expect(checks).toContainText('tip No og:description: the sites fall back on <meta name="description">.');
  await expect(checks).toContainText('fix og:image is "/og.png": that has to be a whole address, starting with https://.');
  await expect(checks).toContainText('tip No twitter:card: X shows a small card.');

  await input.fill('<p>Hello</p>');
  await expect(page.getByRole('status')).toHaveText('No Open Graph or Twitter tags, no title and no description in this.');
  await expect(facebook).toContainText('No title');
  await expect(page.getByTestId('og-x')).toContainText('No picture');
  await expect(checks).toContainText('fix There is no picture: add og:image.');
  await expect(page.getByTestId('og-tags-table')).toHaveCount(0);
  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('Paste the HTML of a page.');
});

test('Open Graph preview shows a picked picture in the cards and judges its size', async ({ page }) => {
  await open(page, '/og-preview/');
  const pictureInput = page.getByLabel('The picture', { exact: true });
  const verdict = page.locator('#og-picture-verdict');

  await pictureInput.setInputFiles({ name: 'tides.png', mimeType: 'image/png', buffer: png(1200, 630) });
  await expect(verdict).toHaveText('tides.png: 1200 × 630 px. Large enough and in the right shape.');
  const shown = page.getByTestId('og-facebook').getByRole('img');
  await expect(shown).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(shown).toHaveJSProperty('naturalWidth', 1200);
  await expect(page.getByTestId('og-x').getByRole('img')).toBeVisible();
  await expect(page.getByTestId('og-chat').getByRole('img')).toBeVisible();

  await pictureInput.setInputFiles({ name: 'square.png', mimeType: 'image/png', buffer: png(400, 400) });
  await expect(verdict).toContainText('square.png: 400 × 400 px. Not 1.91 to 1');
  await pictureInput.setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: png(100, 60) });
  await expect(verdict).toContainText('Smaller than 200 × 200');
  await pictureInput.setInputFiles({ name: 'notes.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(verdict).toHaveText('notes.png is not an image this browser can read.');
  await expect(page.getByTestId('og-facebook').getByRole('img')).toHaveCount(0);
});

test('Open Graph preview speaks Dutch', async ({ page }) => {
  await open(page, '/nl/og-preview/');
  await expect(page.getByRole('status')).toHaveText('10 tags die ertoe doen als de pagina gedeeld wordt.');
  await expect(page.getByTestId('og-checks')).toContainText('og:title, 14 tekens.');
  await expect(page.getByTestId('og-facebook')).toContainText('De afbeelding op https://www.shoreline.example/og/tides.png');
});
