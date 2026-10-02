import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const CONTENT = "alert('Hello, world.');";
/** The same hash by Node's own implementation, to compare with. */
const hash = (algorithm: string, content: string) => createHash(algorithm).update(content).digest('base64');

test('SRI hash gives the integrity value and the tag for pasted content', async ({ page }) => {
  await open(page, '/sri/');
  const value = page.getByTestId('sri-integrity');
  const tag = page.getByTestId('sri-tag');
  await expect(value).toHaveText(`sha384-${hash('sha384', CONTENT)}`);
  await expect(page.getByRole('status')).toHaveText('Hashed the text (23 B as UTF-8).');
  await expect(tag).toHaveText(
    `<script src="https://cdn.example.com/hello.js" integrity="sha384-${hash('sha384', CONTENT)}" crossorigin="anonymous"></script>`
  );

  await page.getByRole('textbox', { name: 'Content of the file' }).fill('body { margin: 0 }');
  await page.getByRole('radio', { name: 'sha512' }).check();
  await page.getByRole('radio', { name: 'stylesheet' }).check();
  await page.getByRole('textbox', { name: 'Address of the file' }).fill('https://cdn.example.com/a.css?v=1&x=2');
  const sha512 = hash('sha512', 'body { margin: 0 }');
  await expect(value).toHaveText(`sha512-${sha512}`);
  await expect(tag).toHaveText(`<link rel="stylesheet" href="https://cdn.example.com/a.css?v=1&amp;x=2" integrity="sha512-${sha512}" crossorigin="anonymous">`);
  await page.getByRole('radio', { name: 'module script' }).check();
  await expect(tag).toContainText('<script type="module" src=');
});

test('SRI hash hashes a picked file and picks the tag that fits it', async ({ page }) => {
  await open(page, '/sri/');
  // with a Windows line ending in it: the bytes of the file count, not the text
  const css = 'a { color: red }\r\n';
  await page.getByLabel('Or pick the file').setInputFiles({ name: 'site.css', mimeType: 'text/css', buffer: Buffer.from(css) });
  await expect(page.getByRole('status')).toHaveText('Hashed site.css (18 B).');
  await expect(page.getByTestId('sri-integrity')).toHaveText(`sha384-${hash('sha384', css)}`);
  await expect(page.getByRole('radio', { name: 'stylesheet' })).toBeChecked();
  await expect(page.getByTestId('sri-tag')).toContainText('<link rel="stylesheet"');

  // typing in the text again takes over from the file
  await page.getByRole('textbox', { name: 'Content of the file' }).fill('x');
  await expect(page.getByRole('status')).toHaveText('Hashed the text (1 B as UTF-8).');
});

test('SRI hash checks an integrity value against the content, and speaks Dutch', async ({ page }) => {
  await open(page, '/sri/');
  const given = page.getByRole('textbox', { name: 'Check an integrity value' });
  const verdict = page.getByTestId('sri-verdict');
  await expect(verdict).toHaveText('');

  await given.fill(`<script src="a.js" integrity="sha256-${hash('sha256', CONTENT)}" crossorigin="anonymous"></script>`);
  await expect(verdict).toHaveText('It matches by sha256: a browser loads this content.');
  await given.fill(`sha384-${hash('sha384', 'something else')}`);
  await expect(verdict).toHaveText('It does not match by sha384: a browser refuses this content.');
  await given.fill('sha384-AAAA');
  await expect(verdict).toContainText('too short or too long for sha384');
  await given.fill('md5-AAAA');
  await expect(verdict).toContainText('loads the file without checking');

  await open(page, '/nl/sri/');
  await page.getByRole('textbox', { name: 'Controleer een integrity-waarde' }).fill(`sha384-${hash('sha384', CONTENT)}`);
  await expect(verdict).toHaveText('Het klopt volgens sha384: een browser laadt deze inhoud.');
  await expect(page.getByRole('status')).toHaveText('De tekst gehasht (23 B als UTF-8).');
});
