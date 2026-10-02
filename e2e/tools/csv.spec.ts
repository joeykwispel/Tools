import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const firstColumn = (page: import('@playwright/test').Page) => page.getByTestId('csv-table').locator('tbody tr td:first-child');

test('CSV viewer shows CSV as a table and sorts it by a column', async ({ page }) => {
  await open(page, '/csv/');
  await page.getByRole('textbox', { name: 'CSV', exact: true }).fill('name,stars\nSvelte,84500\n"React, the library",236000\nhtmx,9000\n');
  await expect(page.getByRole('status')).toHaveText('3 rows, 2 columns, separated by commas.');
  await expect(page.getByRole('columnheader')).toHaveText([/name/, /stars/]);
  await expect(firstColumn(page)).toHaveText(['Svelte', 'React, the library', 'htmx']);

  // numbers sort as numbers: 9000 before 84500
  const stars = page.getByRole('button', { name: 'Sort by stars' });
  await stars.click();
  await expect(firstColumn(page)).toHaveText(['htmx', 'Svelte', 'React, the library']);
  await expect(page.getByRole('columnheader', { name: /stars/ })).toHaveAttribute('aria-sort', 'ascending');
  await stars.click();
  await expect(firstColumn(page)).toHaveText(['React, the library', 'Svelte', 'htmx']);
  // a third click puts the rows back
  await stars.click();
  await expect(firstColumn(page)).toHaveText(['Svelte', 'React, the library', 'htmx']);
  await expect(page.getByRole('columnheader', { name: /stars/ })).toHaveAttribute('aria-sort', 'none');
});

test('CSV viewer finds the delimiter, filters rows and handles a missing header', async ({ page }) => {
  await open(page, '/csv/');
  const input = page.getByRole('textbox', { name: 'CSV', exact: true });
  await input.fill('naam;prijs\nkoffie;2,50\nthee;1,95\nkoek;0,75');
  await expect(page.getByRole('status')).toHaveText('3 rows, 2 columns, separated by semicolons.');

  await page.getByRole('searchbox', { name: 'Show only rows with' }).fill('KO');
  await expect(firstColumn(page)).toHaveText(['koffie', 'koek']);
  await expect(page.getByRole('status')).toContainText('2 of 3 rows match.');
  await page.getByRole('searchbox', { name: 'Show only rows with' }).fill('');

  await page.getByRole('checkbox', { name: 'The first row holds the column names' }).uncheck();
  await expect(page.getByRole('columnheader')).toHaveText([/Column 1/, /Column 2/]);
  await expect(firstColumn(page)).toHaveText(['naam', 'koffie', 'thee', 'koek']);

  // forcing the wrong delimiter gives one column, and a row with a different number of fields is reported
  await page.getByRole('combobox', { name: 'Fields are separated by' }).selectOption('|');
  await expect(page.getByRole('status')).toContainText('4 rows, 1 columns, separated by pipes.');
  await page.getByRole('combobox', { name: 'Fields are separated by' }).selectOption('auto');
  await page.getByRole('checkbox', { name: 'The first row holds the column names' }).check();
  await input.fill('a,b\n1,2\n3\n');
  await expect(page.getByRole('status')).toContainText('1 rows have a different number of fields than the first row.');
});

test('CSV viewer opens a file, and speaks Dutch', async ({ page }) => {
  await open(page, '/nl/csv/');
  await page.getByLabel('Of open een bestand').setInputFiles({ name: 'data.tsv', mimeType: 'text/plain', buffer: Buffer.from('x\ty\n1\t2\n') });
  await expect(page.getByRole('status')).toHaveText('1 rij, 2 kolommen, gescheiden door tabs.');
  await expect(page.getByRole('button', { name: 'Sorteer op y' })).toBeVisible();
  await page.getByRole('button', { name: 'Wissen' }).click();
  await expect(page.getByRole('status')).toHaveText('Plak CSV of open een bestand om het als tabel te zien.');
});
