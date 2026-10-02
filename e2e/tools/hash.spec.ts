import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

test('Hash gives the checksums of a text by every algorithm, in hex or Base64', async ({ page }) => {
  await open(page, '/hash/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('abc');
  await expect(page.getByTestId('hash-MD5')).toHaveText('900150983cd24fb0d6963f7d28e17f72');
  await expect(page.getByTestId('hash-SHA-1')).toHaveText('a9993e364706816aba3e25717850c26c9cd0d89d');
  await expect(page.getByTestId('hash-SHA-256')).toHaveText(SHA256_ABC);
  await expect(page.getByRole('status')).toHaveText('The checksums of the text (3 B as UTF-8).');

  await page.getByRole('radio', { name: 'HEX', exact: true }).check();
  await expect(page.getByTestId('hash-SHA-256')).toHaveText(SHA256_ABC.toUpperCase());
  await page.getByRole('radio', { name: 'Base64' }).check();
  await expect(page.getByTestId('hash-SHA-256')).toHaveText('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
  await expect(page.getByRole('button', { name: 'Copy SHA-256' })).toBeVisible();
});

test('Hash compares with a checksum you were given', async ({ page }) => {
  await open(page, '/hash/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('abc');
  const expected = page.getByRole('textbox', { name: 'Compare with' });
  const verdict = page.getByTestId('hash-verdict');

  await expected.fill(`${SHA256_ABC.toUpperCase()}  download.zip`);
  await expect(verdict).toHaveText('It matches: the same SHA-256 checksum.');
  await expect(page.locator('tr.hit')).toContainText('SHA-256');

  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('abd');
  await expect(verdict).toContainText('It does not match. It has the length of SHA-256');
  await expected.fill('hello');
  await expect(verdict).toContainText('This is not a checksum of MD5');
  await expected.fill('');
  await expect(verdict).toHaveText('');
});

test('Hash hashes a file, and refuses one that is too large', async ({ page }) => {
  await open(page, '/hash/');
  await page.getByLabel('Or hash a file').setInputFiles({ name: 'abc.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') });
  await expect(page.getByRole('status')).toHaveText('The checksums of abc.txt (3 B).');
  await expect(page.getByTestId('hash-SHA-256')).toHaveText(SHA256_ABC);

  // typing in the text again takes over from the file
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('');
  await expect(page.getByTestId('hash-MD5')).toHaveText('d41d8cd98f00b204e9800998ecf8427e');
  await expect(page.getByRole('status')).toHaveText('The checksums of the text (0 B as UTF-8).');
});

test('Hash speaks Dutch', async ({ page }) => {
  await open(page, '/nl/hash/');
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill('abc');
  await page.getByRole('textbox', { name: 'Vergelijk met' }).fill(SHA256_ABC);
  await expect(page.getByTestId('hash-verdict')).toHaveText('Hij klopt: dezelfde SHA-256-checksum.');
});
