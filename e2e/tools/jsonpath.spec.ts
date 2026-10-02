import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('JSONPath tester shows what a query selects, with the path to each value', async ({ page }) => {
  await open(page, '/jsonpath/');
  // the page opens with the bookstore of the specification and a filter
  await expect(page.getByRole('status')).toHaveText('2 matches.');
  const list = page.getByTestId('jsonpath-list').locator('li');
  await expect(list).toHaveCount(2);
  await expect(list.first()).toContainText("$['store']['book'][0]['title']");
  await expect(list.first()).toContainText('"Sayings of the Century"');
  await expect(page.getByTestId('jsonpath-values')).toHaveText('[\n  "Sayings of the Century",\n  "Moby Dick"\n]');

  const query = page.getByRole('textbox', { name: 'JSONPath', exact: true });
  await query.fill('$..author');
  await expect(page.getByRole('status')).toHaveText('4 matches.');
  await query.fill('$.store.bicycle.color');
  await expect(page.getByRole('status')).toHaveText('1 match.');
  await expect(list).toContainText('"red"');
  await query.fill('$.store.nothing');
  await expect(page.getByRole('status')).toHaveText('Nothing in the document matches.');
  await expect(page.getByTestId('jsonpath-values')).toHaveCount(0);

  await page.getByRole('button', { name: '$..book[-1]' }).click();
  await expect(query).toHaveValue('$..book[-1]');
  await expect(list).toContainText('The Lord of the Rings');
});

test('JSONPath tester explains a query or a document that is wrong', async ({ page }) => {
  await open(page, '/jsonpath/');
  const query = page.getByRole('textbox', { name: 'JSONPath', exact: true });
  await query.fill('store.book');
  await expect(page.getByRole('status')).toHaveText('A JSONPath starts with $, the document itself.');
  await query.fill('$.store.');
  await expect(page.getByRole('status')).toContainText('The query stops too early');
  await query.fill('$.store book');
  await expect(page.getByRole('status')).toHaveText('Unexpected b at position 9.');
  await query.fill("$['store");
  await expect(page.getByRole('status')).toHaveText('The quote at position 3 is never closed.');

  await query.fill('$.a');
  const document = page.getByRole('textbox', { name: 'JSON document' });
  await document.fill('{"a": 1,}');
  await expect(page.locator('#jsonpath-document-status')).toContainText('The document is not valid JSON. Line 1, column 9:');
  await document.fill('{"a": [1, 2]}');
  await expect(page.getByTestId('jsonpath-values')).toHaveText('[\n  [\n    1,\n    2\n  ]\n]');
});

test('JSONPath tester speaks Dutch', async ({ page }) => {
  await open(page, '/nl/jsonpath/');
  await expect(page.getByRole('status')).toHaveText('2 matches.');
  await page.getByRole('textbox', { name: 'JSONPath', exact: true }).fill('x');
  await expect(page.getByRole('status')).toHaveText('Een JSONPath begint met $, het document zelf.');
  await page.getByRole('textbox', { name: 'JSONPath', exact: true }).fill('$.niets');
  await expect(page.getByRole('status')).toHaveText('Niets in het document komt overeen.');
});
