import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Lines trims, removes empty and double lines, sorts and numbers', async ({ page }) => {
  await open(page, '/lines/');
  const input = page.getByRole('textbox', { name: 'Lines', exact: true });
  const output = page.getByTestId('lines-output');

  await input.fill(' pear \napple\n\nPear\napple\nitem 10\nitem 2');
  // the page starts with: trim, remove empty, remove doubles, A to Z
  await expect(output).toHaveText('apple\nitem 2\nitem 10\npear\nPear');
  await expect(page.getByRole('status')).toHaveText('7 lines in, 5 out.');

  await page.getByRole('checkbox', { name: 'Upper and lower case are the same' }).check();
  await expect(output).toHaveText('apple\nitem 2\nitem 10\npear');
  await page.getByRole('radio', { name: 'Z to A' }).check();
  await expect(output).toHaveText('pear\nitem 10\nitem 2\napple');
  await page.getByRole('checkbox', { name: 'Number the lines' }).check();
  await expect(output).toHaveText('1. pear\n2. item 10\n3. item 2\n4. apple');
});

test('Lines leaves the text alone when every option is off, and can reverse or sort by length', async ({ page }) => {
  await open(page, '/lines/');
  await page.getByRole('textbox', { name: 'Lines', exact: true }).fill('ccc\n a\nbb\n a');
  for (const name of ['Trim spaces at both ends', 'Remove empty lines', 'Remove double lines']) await page.getByRole('checkbox', { name }).uncheck();
  await page.getByRole('radio', { name: 'as it is' }).check();
  await expect(page.getByTestId('lines-output')).toHaveText('ccc\n a\nbb\n a');
  await page.getByRole('radio', { name: 'reversed' }).check();
  await expect(page.getByTestId('lines-output')).toHaveText(' a\nbb\n a\nccc');
  await page.getByRole('radio', { name: 'shortest first' }).check();
  await expect(page.getByTestId('lines-output')).toHaveText(' a\nbb\n a\nccc');
});

test('Lines speaks Dutch', async ({ page }) => {
  await open(page, '/nl/lines/');
  await page.getByRole('textbox', { name: 'Regels', exact: true }).fill('b\na\nb');
  await expect(page.getByTestId('lines-output')).toHaveText('a\nb');
  await expect(page.getByRole('status')).toHaveText('3 regels erin, 2 eruit.');
});
