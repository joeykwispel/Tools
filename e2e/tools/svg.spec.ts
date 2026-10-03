import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const SVG =
  '<?xml version="1.0"?>\n<!-- drawn by hand -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8.000 8.000">\n  <g></g>\n  <path fill="#f00" d="M 0.123456 0 H 8 V 8 Z"/>\n</svg>\n';

test('SVG optimiser shrinks the sample, shows both pictures and says how much went', async ({ page }) => {
  await open(page, '/svg/');
  const output = page.getByTestId('svg-output');
  await expect(output).toContainText('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>Sun</title>');
  await expect(output).not.toContainText('inkscape');
  await expect(page.getByRole('status')).toHaveText(/^1\.\d kB → \d+ B: \d\d% smaller\.$/);

  // both pictures are drawn by the browser from a data URI
  for (const id of ['svg-before', 'svg-after']) {
    const image = page.getByTestId(id);
    await expect(image).toHaveAttribute('src', /^data:image\/svg\+xml,%3C/);
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(96);
  }
});

test('SVG optimiser follows the settings', async ({ page }) => {
  await open(page, '/svg/');
  const input = page.getByRole('textbox', { name: 'SVG', exact: true });
  const output = page.getByTestId('svg-output');
  await input.fill(SVG);
  await expect(output).toHaveText('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path fill="#f00" d="M.123 0H8V8Z"/></svg>');

  await page.getByRole('combobox', { name: 'Numbers' }).selectOption('1');
  await expect(output).toContainText('d="M.1 0H8V8Z"');
  await page.getByRole('combobox', { name: 'Numbers' }).selectOption('keep');
  await expect(output).toContainText('viewBox="0 0 8.000 8.000"><path fill="#f00" d="M 0.123456 0 H 8 V 8 Z"/>');

  await page.getByRole('checkbox', { name: 'Comments' }).uncheck();
  await page.getByRole('checkbox', { name: 'Empty groups' }).uncheck();
  await page.getByRole('checkbox', { name: 'Line breaks and indentation' }).uncheck();
  await expect(output).toHaveText(
    '<!-- drawn by hand -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8.000 8.000">\n  <g/>\n  <path fill="#f00" d="M 0.123456 0 H 8 V 8 Z"/>\n</svg>'
  );
  await page.getByRole('checkbox', { name: 'XML line, doctype and metadata' }).uncheck();
  await expect(output).toContainText('<?xml version="1.0"?>\n<!-- drawn by hand -->');
  await input.fill('<svg/>');
  await expect(page.getByRole('status')).toHaveText('6 B → 6 B: no smaller with these settings.');
});

test('SVG optimiser writes a data URI, as text or as Base64', async ({ page }) => {
  await open(page, '/svg/');
  await page.getByRole('textbox', { name: 'SVG', exact: true }).fill('<svg viewBox="0 0 8 8"><path fill="#f00" d="M0 0h8v8z"/></svg>');
  const uri = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23f00' d='M0 0h8v8z'/%3E%3C/svg%3E";
  await expect(page.getByTestId('svg-uri')).toHaveText(uri);
  await expect(page.getByTestId('svg-css')).toHaveText(`background-image: url("${uri}");`);

  await page.getByRole('radio', { name: 'Base64' }).check();
  const base64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path fill="#f00" d="M0 0h8v8z"/></svg>').toString('base64');
  await expect(page.getByTestId('svg-uri')).toHaveText(`data:image/svg+xml;base64,${base64}`);
});

test('SVG optimiser reads a picked file and offers the result to download', async ({ page }) => {
  await open(page, '/svg/');
  await page.getByLabel('Or pick the file').setInputFiles({ name: 'dot.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) });
  await expect(page.getByRole('textbox', { name: 'SVG', exact: true })).toHaveValue(SVG);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
  expect(download.suggestedFilename()).toBe('optimised.svg');
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  expect(Buffer.concat(chunks).toString()).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path fill="#f00" d="M.123 0H8V8Z"/></svg>');

  await page.getByLabel('Or pick the file').setInputFiles({ name: 'huge.svg', mimeType: 'image/svg+xml', buffer: Buffer.alloc(2_000_001, 32) });
  await expect(page.getByText('huge.svg is 2.0 MB; the limit is 2.0 MB.')).toBeVisible();
});

test('SVG optimiser says what is wrong with something it can not read, and speaks Dutch', async ({ page }) => {
  await open(page, '/svg/');
  const input = page.getByRole('textbox', { name: 'SVG', exact: true });
  await input.fill('<svg><g></svg>');
  await expect(page.getByRole('status')).toHaveText('Line 1, column 9: </svg> closes an element, but the one that is open is <g> (line 1). Close that first.');
  await expect(page.getByTestId('svg-output')).toHaveCount(0);
  await input.fill('<html><body/></html>');
  await expect(page.getByRole('status')).toHaveText('This is XML, but the root element is <html>, not <svg>.');
  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('There is nothing here yet.');

  await open(page, '/nl/svg/');
  await expect(page.getByRole('status')).toHaveText(/% kleiner\.$/);
  await page.getByRole('textbox', { name: 'SVG', exact: true }).fill('<html/>');
  await expect(page.getByRole('status')).toHaveText('Dit is XML, maar het root-element is <html>, niet <svg>.');
});
