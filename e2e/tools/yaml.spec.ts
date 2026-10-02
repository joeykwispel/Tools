import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('YAML ↔ JSON converts YAML to JSON and back', async ({ page }) => {
  await open(page, '/yaml/');
  const input = page.getByRole('textbox', { name: 'YAML', exact: true });
  const output = page.getByTestId('yaml-output');

  await input.fill('name: tools\ntags:\n  - a\n  - b\nok: true\n');
  await expect(output).toHaveText('{\n  "name": "tools",\n  "tags": [\n    "a",\n    "b"\n  ],\n  "ok": true\n}');
  await page.getByRole('radio', { name: '4 spaces' }).check();
  await expect(output).toContainText('\n    "name": "tools"');
  await page.getByRole('radio', { name: '2 spaces' }).check();

  // switching direction carries the result over
  await page.getByRole('radio', { name: 'JSON to YAML' }).check();
  await expect(page.getByRole('textbox', { name: 'JSON', exact: true })).toHaveValue(/"name": "tools"/);
  await expect(output).toHaveText('name: tools\ntags:\n  - a\n  - b\nok: true\n');
});

test('YAML ↔ JSON says where the input is wrong, and joins several documents', async ({ page }) => {
  await open(page, '/yaml/');
  const input = page.getByRole('textbox', { name: 'YAML', exact: true });

  await input.fill('a: 1\nb: [1, 2\nc: 3');
  await expect(page.getByRole('status')).toContainText(/^Line \d+, column \d+: /);
  await expect(page.getByTestId('yaml-output')).toHaveText('');

  await input.fill('a: 1\n---\nb: 2\n');
  await expect(page.getByRole('status')).toHaveText('The input holds 2 documents; they are the items of one array.');
  await expect(page.getByTestId('yaml-output')).toContainText('"b": 2');

  await page.getByRole('radio', { name: 'JSON to YAML' }).check();
  await page.getByRole('textbox', { name: 'JSON', exact: true }).fill('{"a": 1,}');
  await expect(page.getByRole('status')).toHaveText('Line 1, column 9: a comma before the closing bracket. JSON does not allow a trailing comma.');
});

test('YAML ↔ JSON speaks Dutch', async ({ page }) => {
  await open(page, '/nl/yaml/');
  await page.getByRole('textbox', { name: 'YAML', exact: true }).fill('a: [1');
  await expect(page.getByRole('status')).toContainText(/^Regel \d+, kolom \d+: /);
  await page.getByRole('radio', { name: 'JSON naar YAML' }).check();
  await page.getByRole('textbox', { name: 'JSON', exact: true }).fill('{"a": true}');
  await expect(page.getByTestId('yaml-output')).toHaveText('a: true\n');
});
