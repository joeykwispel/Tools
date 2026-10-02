import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('XML ↔ JSON turns XML into JSON and back', async ({ page }) => {
  await open(page, '/xml-json/');
  const input = page.getByRole('textbox', { name: 'XML', exact: true });
  const output = page.getByTestId('xml-json-output');

  await input.fill('<order id="7"><line>a</line><line>b</line><paid>true</paid><note/></order>');
  await expect(output).toHaveText(
    '{\n  "order": {\n    "@id": "7",\n    "line": [\n      "a",\n      "b"\n    ],\n    "paid": "true",\n    "note": null\n  }\n}'
  );
  await page.getByRole('checkbox', { name: /Write numbers and true\/false as those types/ }).check();
  await expect(output).toContainText('"@id": 7,');
  await expect(output).toContainText('"paid": true,');
  await page.getByRole('checkbox', { name: /Write numbers and true\/false as those types/ }).uncheck();

  // switching direction carries the result over
  await page.getByRole('radio', { name: 'JSON to XML' }).check();
  await expect(page.getByRole('textbox', { name: 'JSON', exact: true })).toHaveValue(/"@id": "7"/);
  await expect(output).toHaveText(
    '<?xml version="1.0" encoding="UTF-8"?>\n<order id="7">\n  <line>a</line>\n  <line>b</line>\n  <paid>true</paid>\n  <note/>\n</order>'
  );
  await page.getByRole('checkbox', { name: /Start with/ }).uncheck();
  await page.getByRole('radio', { name: '4 spaces' }).check();
  await expect(output).toHaveText('<order id="7">\n    <line>a</line>\n    <line>b</line>\n    <paid>true</paid>\n    <note/>\n</order>');
});

test('XML ↔ JSON wraps JSON without a single root, and explains input that is wrong', async ({ page }) => {
  await open(page, '/xml-json/');
  await page.getByRole('radio', { name: 'JSON to XML' }).check();
  const json = page.getByRole('textbox', { name: 'JSON', exact: true });
  await json.fill('{"a": 1, "b": [true, null]}');
  await expect(page.getByTestId('xml-json-output')).toContainText('<root>\n  <a>1</a>\n  <b>true</b>\n  <b/>\n</root>');
  await expect(page.getByRole('status')).toContainText('it is wrapped in <root>');
  await json.fill('{"a": 1,}');
  await expect(page.getByRole('status')).toContainText('Line 1, column 9: a comma before the closing bracket');
  await expect(page.getByTestId('xml-json-output')).toHaveText('');

  await page.getByRole('radio', { name: 'XML to JSON' }).check();
  await page.getByRole('textbox', { name: 'XML', exact: true }).fill('<a><b></a>');
  await expect(page.getByRole('status')).toContainText('Line 1, column 7: </a> closes an element, but the one that is open is <b>');
});

test('XML ↔ JSON speaks Dutch', async ({ page }) => {
  await open(page, '/nl/xml-json/');
  await page.getByRole('textbox', { name: 'XML', exact: true }).fill('<a x="1">t</a>');
  await expect(page.getByTestId('xml-json-output')).toHaveText('{\n  "a": {\n    "@x": "1",\n    "#text": "t"\n  }\n}');
  await page.getByRole('radio', { name: 'JSON naar XML' }).check();
  await page.getByRole('textbox', { name: 'JSON', exact: true }).fill('[1]');
  await expect(page.getByRole('status')).toContainText('daarom in <root> gezet');
});
