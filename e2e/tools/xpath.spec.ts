import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('XPath tester shows the nodes a query selects, with where they are', async ({ page }) => {
  await open(page, '/xpath/');
  // the page opens with an order in a default namespace and a query with a predicate
  await expect(page.getByRole('status')).toHaveText('1 node.');
  const list = page.getByTestId('xpath-list').locator('li');
  await expect(list).toHaveCount(1);
  await expect(list).toContainText('/order/lines/line[2]/description');
  await expect(list).toContainText('Mug');

  const query = page.getByRole('textbox', { name: 'XPath', exact: true });
  await query.fill('//d:line');
  await expect(page.getByRole('status')).toHaveText('2 nodes.');
  await expect(list.first()).toContainText('/order/lines/line[1]');
  await expect(list.first()).toContainText('sku="A-1"');
  await query.fill('//d:line/@sku');
  await expect(list).toContainText(['/order/lines/line[1]/@sku', '/order/lines/line[2]/@sku']);
  await expect(list.first()).toContainText('attribute');
  await expect(list.first()).toContainText('sku="A-1"');
  await query.fill('//pay:method/text()');
  await expect(list).toContainText('/order/pay:method/text()');
  await expect(list).toContainText('ideal');
});

test('XPath tester gives numbers, strings and booleans as values', async ({ page }) => {
  await open(page, '/xpath/');
  const query = page.getByRole('textbox', { name: 'XPath', exact: true });
  await query.fill('count(//d:line)');
  await expect(page.getByRole('status')).toHaveText('The result is a number.');
  await expect(page.getByTestId('xpath-value')).toHaveText('2');
  await page.getByRole('button', { name: 'sum(//d:price)' }).click();
  await expect(page.getByTestId('xpath-value')).toHaveText('14.45');
  await query.fill('string(//d:customer/d:name)');
  await expect(page.getByTestId('xpath-value')).toHaveText('Ada Lovelace');
  await query.fill('//d:order/@id = 1042');
  await expect(page.getByRole('status')).toHaveText('The result is a boolean.');
  await expect(page.getByTestId('xpath-value')).toHaveText('true');
});

test('XPath tester explains a default namespace, a wrong query and a broken document', async ({ page }) => {
  await open(page, '/xpath/');
  const table = page.getByTestId('xpath-namespaces-table');
  await expect(table.getByRole('row')).toContainText(['Prefix', 'payurn:example:payments', 'durn:example:orders']);
  await expect(table).toContainText('made up for xmlns="…"');

  const query = page.getByRole('textbox', { name: 'XPath', exact: true });
  await query.fill('//line');
  await expect(page.getByRole('status')).toContainText('This document has a default namespace, so its elements need a prefix: try d:name instead of name.');
  await query.fill('//d:nothing');
  await expect(page.getByRole('status')).toHaveText('Nothing in the document matches.');
  await query.fill('//d:line[');
  await expect(page.getByRole('status')).toHaveText('This is not a valid XPath 1.0 expression.');
  await query.fill('//x:line');
  await expect(page.getByRole('status')).toContainText('The query uses a prefix the document does not declare.');
  await query.fill('');
  await expect(page.getByRole('status')).toHaveText('Type an XPath to see what it selects.');

  await query.fill('//a');
  const document = page.getByRole('textbox', { name: 'XML document' });
  await document.fill('<a><b></a>');
  await expect(page.locator('#xpath-document-status')).toContainText('Line 1, column 7: </a> closes an element, but the one that is open is <b>');
  await document.fill('<a><a/></a>');
  await expect(page.getByRole('status')).toHaveText('2 nodes.');
  await expect(page.getByTestId('xpath-list').locator('li')).toContainText(['/a', '/a/a']);
  await expect(page.getByTestId('xpath-namespaces-table')).toHaveCount(0);
});

test('XPath tester speaks Dutch', async ({ page }) => {
  await open(page, '/nl/xpath/');
  await expect(page.getByRole('status')).toHaveText('1 node.');
  await page.getByRole('textbox', { name: 'XPath', exact: true }).fill('count(//d:line)');
  await expect(page.getByRole('status')).toHaveText('Het resultaat is een getal.');
  await page.getByRole('textbox', { name: 'XPath', exact: true }).fill('//line');
  await expect(page.getByRole('status')).toContainText('Dit document heeft een default namespace');
});
