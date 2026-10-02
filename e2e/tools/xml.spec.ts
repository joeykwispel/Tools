import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('XML formatter lays out a document and can put it on one line', async ({ page }) => {
  await open(page, '/xml/');
  const input = page.getByRole('textbox', { name: 'XML', exact: true });
  const output = page.getByTestId('xml-output');

  await input.fill('<?xml version="1.0"?><root a="1"><item><name>Ada</name><tags/></item></root>');
  await expect(output).toHaveText('<?xml version="1.0"?>\n<root a="1">\n  <item>\n    <name>Ada</name>\n    <tags/>\n  </item>\n</root>');
  await expect(page.getByRole('status')).toHaveText('Well-formed XML: 4 elements, 1 attributes, 3 levels deep.');

  await page.getByRole('radio', { name: 'Tabs' }).check();
  await expect(output).toContainText('\n\t<item>\n\t\t<name>Ada</name>');
  await page.getByRole('radio', { name: 'One line' }).check();
  await expect(output).toHaveText('<?xml version="1.0"?><root a="1"><item><name>Ada</name><tags/></item></root>');
});

test('XML formatter says where a document is not well-formed, and why', async ({ page }) => {
  await open(page, '/xml/');
  const input = page.getByRole('textbox', { name: 'XML', exact: true });

  await input.fill('<root>\n  <item>\n</root>');
  await expect(page.getByRole('status')).toHaveText(
    'Line 3, column 1: </root> closes an element, but the one that is open is <item> (line 2). Close that first.'
  );
  await expect(page.getByTestId('xml-output')).toHaveCount(0);
  await input.fill('<a>fish & chips</a>');
  await expect(page.getByRole('status')).toHaveText('Line 1, column 9: a & that does not start an entity. Write it as &amp;.');
  await input.fill('<a b=1/>');
  await expect(page.getByRole('status')).toContainText('the attribute b needs a value in quotes: b="…".');
  await input.fill('<a><b>');
  await expect(page.getByRole('status')).toHaveText('Line 1, column 7: <b>, opened on line 1, is never closed.');
  await input.fill('<a/><b/>');
  await expect(page.getByRole('status')).toContainText('A document has exactly one root.');
  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('There is nothing here yet.');
});

test('XML formatter speaks Dutch', async ({ page }) => {
  await open(page, '/nl/xml/');
  await expect(page.getByRole('status')).toContainText('Welgevormde XML:');
  await page.getByRole('textbox', { name: 'XML', exact: true }).fill('</a>');
  await expect(page.getByRole('status')).toHaveText('Regel 1, kolom 1: </a> sluit een element, maar er staat er geen open.');
});
