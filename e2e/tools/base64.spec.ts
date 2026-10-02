import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Base64 encodes text, URL-safe too, and decodes it back', async ({ page }) => {
  await open(page, '/base64/');
  const input = page.getByLabel('Text', { exact: true });
  const output = page.getByTestId('base64-output');

  await input.fill('foobar');
  await expect(output).toHaveText('Zm9vYmFy');
  await input.fill('f');
  await expect(output).toHaveText('Zg==');
  await page.getByLabel(/URL-safe/).check();
  await expect(output).toHaveText('Zg');
  await page.getByLabel(/URL-safe/).uncheck();

  await input.fill('Zoë ✓');
  await expect(output).toHaveText('Wm/DqyDinJM=');
  await expect(page.getByRole('status')).toHaveText('8 B in, 12 B out.');

  // switching direction carries the result over
  await page.getByLabel('Decode').check();
  await expect(page.getByLabel('Base64', { exact: true })).toHaveValue('Wm/DqyDinJM=');
  await expect(output).toHaveText('Zoë ✓');
});

test('Base64 explains input that is not Base64, and offers binary results as a download', async ({ page }) => {
  await open(page, '/base64/');
  await page.getByLabel('Decode').check();
  const input = page.getByLabel('Base64', { exact: true });

  await input.fill('not base64!');
  await expect(page.getByRole('status')).toContainText('This is not Base64');
  await input.fill('Zm9vY');
  await expect(page.getByRole('status')).toContainText('not complete Base64');

  // 0xFF 0xFE is not UTF-8
  await input.fill('//4=');
  await expect(page.getByRole('status')).toContainText('The result is not text (2 B of binary data)');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download as a file' }).click();
  expect((await download).suggestedFilename()).toBe('decoded.bin');
});

test('Base64 encodes a file, and refuses one that is too large', async ({ page }) => {
  await open(page, '/base64/');
  await page.getByLabel('Or encode a file').setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('foobar') });
  await expect(page.getByTestId('base64-output')).toHaveText('Zm9vYmFy');
  await expect(page.locator('#base64-file-hint')).toHaveText('hello.txt, 6 B');

  await page.getByLabel('Or encode a file').setInputFiles({ name: 'big.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(2_000_001) });
  await expect(page.locator('#base64-file-hint')).toHaveText('big.bin is 2.0 MB; the limit is 2.0 MB.');
});

test('Base64 speaks Dutch', async ({ page }) => {
  await open(page, '/nl/base64/');
  await page.getByLabel('Tekst', { exact: true }).fill('foo');
  await expect(page.getByTestId('base64-output')).toHaveText('Zm9v');
  await page.getByLabel('Decoderen').check();
  await page.getByLabel('Base64', { exact: true }).fill('!!!');
  await expect(page.getByRole('status')).toContainText('Dit is geen Base64');
});
