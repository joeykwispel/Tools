import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('JSON formatter formats, minifies and sorts, and keeps numbers as they were written', async ({ page }) => {
  await open(page, '/json/');
  const input = page.getByRole('textbox', { name: 'JSON', exact: true });
  const output = page.getByTestId('json-output');

  await input.fill('{"b":1.0,"a":[true,null],"big":12345678901234567890}');
  await expect(page.getByRole('status')).toHaveText('Valid JSON.');
  await expect(output).toHaveText('{\n  "b": 1.0,\n  "a": [\n    true,\n    null\n  ],\n  "big": 12345678901234567890\n}');

  await page.getByRole('radio', { name: 'One line' }).check();
  await expect(output).toHaveText('{"b":1.0,"a":[true,null],"big":12345678901234567890}');
  await page.getByRole('checkbox', { name: 'Sort the keys' }).check();
  await expect(output).toHaveText('{"a":[true,null],"b":1.0,"big":12345678901234567890}');
  await page.getByRole('radio', { name: 'Tabs' }).check();
  await expect(output).toHaveText('{\n\t"a": [\n\t\ttrue,\n\t\tnull\n\t],\n\t"b": 1.0,\n\t"big": 12345678901234567890\n}');
});

test('JSON formatter says what is wrong and where', async ({ page }) => {
  await open(page, '/json/');
  const input = page.getByRole('textbox', { name: 'JSON', exact: true });

  await input.fill('{\n  "a": 1,\n}');
  await expect(page.getByRole('status')).toHaveText('Line 3, column 1: a comma before the closing bracket. JSON does not allow a trailing comma.');
  await expect(page.getByTestId('json-output')).toHaveCount(0);
  await input.fill("{'a': 1}");
  await expect(page.getByRole('status')).toContainText('Line 1, column 2: JSON strings use double quotes');
  await input.fill('{name: 1}');
  await expect(page.getByRole('status')).toContainText('a key has to be in double quotes: "n…"');
  await input.fill('[1 2]');
  await expect(page.getByRole('status')).toHaveText('Line 1, column 4: unexpected 2.');
  await input.fill('{"a": 1');
  await expect(page.getByRole('status')).toContainText('the document stops here');
  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('There is nothing here yet.');

  await input.fill('{"a": 1, "a": 2}');
  await expect(page.getByRole('status')).toContainText('a key used twice in one object: "a"');
  await expect(page.getByTestId('json-output')).toBeVisible();
});

test('JSON formatter shows the document as a tree that folds', async ({ page }) => {
  await open(page, '/json/');
  await page.getByRole('textbox', { name: 'JSON', exact: true }).fill('{"user":{"name":"Ada","langs":["en","nl"]},"n":3}');
  const tree = page.getByTestId('json-tree');
  await expect(tree.locator('summary').first()).toContainText('2 keys');
  await expect(tree).toContainText('"name": "Ada"');
  await expect(tree).toContainText('"n": 3');
  // two levels are open; the array under "user" starts closed
  const langs = tree.locator('details', { has: page.locator('summary', { hasText: '"langs"' }) }).last();
  await expect(langs.locator('summary')).toContainText('2 items');
  await expect(langs.getByText('"en"')).toBeHidden();
  await langs.locator('summary').click();
  await expect(langs.getByText('"en"')).toBeVisible();
});

test('JSON formatter speaks Dutch', async ({ page }) => {
  await open(page, '/nl/json/');
  const input = page.getByRole('textbox', { name: 'JSON', exact: true });
  await expect(page.getByRole('status')).toHaveText('Geldige JSON.');
  await input.fill('[1,]');
  await expect(page.getByRole('status')).toContainText('Regel 1, kolom 4: een komma vóór het sluitende haakje');
});
