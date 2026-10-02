import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('HTML entities escapes text at three levels and decodes it back', async ({ page }) => {
  await open(page, '/html-entities/');
  const input = page.getByLabel('Text', { exact: true });
  const output = page.getByTestId('entities-output');

  await input.fill('<b>café & €5</b>');
  await expect(output).toHaveText('&lt;b&gt;café &amp; €5&lt;/b&gt;');
  await page.getByRole('radio', { name: /by name/ }).check();
  await expect(output).toHaveText('&lt;b&gt;caf&eacute; &amp; &euro;5&lt;/b&gt;');
  await page.getByRole('radio', { name: /by number/ }).check();
  await expect(output).toHaveText('&lt;b&gt;caf&#233; &amp; &#8364;5&lt;/b&gt;');

  // switching direction carries the result over
  await page.getByRole('radio', { name: 'Decode' }).check();
  await expect(page.getByLabel('HTML with entities')).toHaveValue('&lt;b&gt;caf&#233; &amp; &#8364;5&lt;/b&gt;');
  await expect(output).toHaveText('<b>café & €5</b>');
});

test('HTML entities leaves unknown entities and says how many there were', async ({ page }) => {
  await open(page, '/html-entities/');
  await page.getByRole('radio', { name: 'Decode' }).check();
  const input = page.getByLabel('HTML with entities');
  await input.fill('&hearts; &#x1F600; &nope; &alsonot;');
  await expect(page.getByTestId('entities-output')).toHaveText('♥ 😀 &nope; &alsonot;');
  await expect(page.getByRole('status')).toHaveText('2 entities are not known and were left as they are.');
  await input.fill('&copy; 2026');
  await expect(page.getByTestId('entities-output')).toHaveText('© 2026');
  await expect(page.getByRole('status')).toHaveText('');
});

test('HTML entities speaks Dutch', async ({ page }) => {
  await open(page, '/nl/html-entities/');
  await page.getByLabel('Tekst', { exact: true }).fill('a < b');
  await expect(page.getByTestId('entities-output')).toHaveText('a &lt; b');
  await page.getByRole('radio', { name: 'Decoderen' }).check();
  await page.getByLabel('HTML met entiteiten').fill('&nope;');
  await expect(page.getByRole('status')).toHaveText('1 entiteit is niet bekend en is blijven staan.');
});
