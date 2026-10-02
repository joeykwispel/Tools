import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Diff shows added and removed lines, with the changed words marked', async ({ page }) => {
  await open(page, '/diff/');
  await page.getByRole('textbox', { name: 'Original' }).fill('one\ntwo\nthree\nprice = 2');
  await page.getByRole('textbox', { name: 'Changed' }).fill('one\nthree\nfour\nprice = 3');
  await expect(page.getByRole('status')).toHaveText('2 added, 2 removed.');

  const table = page.getByTestId('diff');
  await expect(table.locator('tr.delete .text')).toHaveText(['two', 'price = 2']);
  await expect(table.locator('tr.insert .text')).toHaveText(['four', 'price = 3']);
  await expect(table.locator('tr.delete mark')).toHaveText(['2']);
  await expect(table.locator('tr.insert mark')).toHaveText(['3']);
  // the signs say what the colours say
  await expect(table.locator('tr.insert .sign').first()).toContainText('+');
  await expect(table.locator('tr.delete .sign').first()).toContainText('−');
});

test('Diff leaves out long unchanged stretches, and can ignore spaces and case', async ({ page }) => {
  await open(page, '/diff/');
  const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
  await page.getByRole('textbox', { name: 'Original' }).fill(lines.join('\n'));
  await page.getByRole('textbox', { name: 'Changed' }).fill(lines.join('\n').replace('line 10', 'LINE  10'));
  const table = page.getByTestId('diff');
  await expect(table.locator('tr.skip')).toHaveText(['6 unchanged lines', '7 unchanged lines']);
  await expect(table.locator('tr.equal')).toHaveCount(6);

  await page.getByRole('checkbox', { name: 'Show unchanged lines too' }).check();
  await expect(table.locator('tr.skip')).toHaveCount(0);
  await expect(table.locator('tr.equal')).toHaveCount(19);

  await page.getByRole('checkbox', { name: 'Ignore upper and lower case' }).check();
  await expect(page.getByRole('status')).toHaveText('1 added, 1 removed.');
  await page.getByRole('checkbox', { name: 'Ignore differences in spaces' }).check();
  await expect(page.getByRole('status')).toHaveText('No differences.');
  await expect(table).toHaveCount(0);
});

test('Diff compares JSON by meaning, and explains invalid JSON', async ({ page }) => {
  await open(page, '/diff/');
  await page.getByRole('textbox', { name: 'Original' }).fill('{"name":"Ada","age":36}');
  await page.getByRole('textbox', { name: 'Changed' }).fill('{\n  "age": 36,\n  "name": "Ada"\n}');
  await expect(page.getByRole('status')).not.toHaveText('No differences.');
  await page.getByRole('radio', { name: /JSON/ }).check();
  await expect(page.getByRole('status')).toHaveText('No differences.');

  await page.getByRole('textbox', { name: 'Changed' }).fill('{"age": 37, "name": "Ada"}');
  await expect(page.getByRole('status')).toHaveText('1 added, 1 removed.');
  await expect(page.getByTestId('diff').locator('tr.insert .text')).toHaveText('  "age": 37,');

  await page.getByRole('textbox', { name: 'Changed' }).fill('{"age": 37,}');
  await expect(page.getByRole('status')).toContainText('The changed text is not valid JSON. Line 1, column 12:');
});

test('Diff speaks Dutch', async ({ page }) => {
  await open(page, '/nl/diff/');
  await page.getByRole('textbox', { name: 'Origineel' }).fill('a');
  await page.getByRole('textbox', { name: 'Gewijzigd' }).fill('b');
  await expect(page.getByRole('status')).toHaveText('1 toegevoegd, 1 verwijderd.');
  await page.getByRole('textbox', { name: 'Gewijzigd' }).fill('a');
  await expect(page.getByRole('status')).toHaveText('Geen verschillen.');
});
