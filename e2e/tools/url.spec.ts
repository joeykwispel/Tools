import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('URL encode escapes a value or a whole URL, and decodes it back', async ({ page }) => {
  await open(page, '/url/');
  const input = page.getByLabel('Text', { exact: true });
  const output = page.getByTestId('url-output');

  await input.fill('a b&c=zoë');
  await expect(output).toHaveText('a%20b%26c%3Dzo%C3%AB');
  await page.getByLabel(/Write a space as \+/).check();
  await expect(output).toHaveText('a+b%26c%3Dzo%C3%AB');
  await page.getByLabel(/Write a space as \+/).uncheck();

  await input.fill('https://example.com/a b?q=zoë');
  await page.getByLabel(/A whole URL/).check();
  await expect(output).toHaveText('https://example.com/a%20b?q=zo%C3%AB');

  // switching direction carries the result over
  await page.getByRole('radio', { name: 'Decode' }).check();
  await expect(page.getByLabel('Encoded text')).toHaveValue('https://example.com/a%20b?q=zo%C3%AB');
  await expect(output).toHaveText('https://example.com/a b?q=zoë');
});

test('URL decode keeps going past a broken escape and says how many there were', async ({ page }) => {
  await open(page, '/url/');
  await page.getByRole('radio', { name: 'Decode' }).check();
  const input = page.getByLabel('Encoded text');

  await input.fill('100%25 sure%21');
  await expect(page.getByTestId('url-output')).toHaveText('100% sure!');
  await expect(page.getByRole('status')).toHaveText('');

  await input.fill('100% sure%21');
  await expect(page.getByTestId('url-output')).toHaveText('100% sure!');
  await expect(page.getByRole('status')).toHaveText('1 % sequence is not a valid escape and was left as it is.');

  await input.fill('a+b');
  await expect(page.getByTestId('url-output')).toHaveText('a+b');
  await page.getByLabel(/Read \+ as a space/).check();
  await expect(page.getByTestId('url-output')).toHaveText('a b');
});

test('URL encode speaks Dutch', async ({ page }) => {
  await open(page, '/nl/url/');
  await page.getByLabel('Tekst', { exact: true }).fill('a b');
  await expect(page.getByTestId('url-output')).toHaveText('a%20b');
  await page.getByRole('radio', { name: 'Decoderen' }).check();
  await page.getByLabel('Gecodeerde tekst').fill('%zz');
  await expect(page.getByRole('status')).toContainText('geen geldige escape');
});
