import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('.env ↔ JSON turns an environment file into JSON and back', async ({ page }) => {
  await open(page, '/env/');
  const input = page.getByRole('textbox', { name: '.env', exact: true });
  const output = page.getByTestId('env-output');

  await input.fill('# db\nDB_HOST=localhost\nexport NAME="my app" # note\nEMPTY=\n');
  await expect(output).toHaveText('{\n  "DB_HOST": "localhost",\n  "NAME": "my app",\n  "EMPTY": ""\n}');
  await expect(page.getByRole('status')).toHaveText('3 variables.');

  // switching direction carries the result over
  await page.getByRole('radio', { name: 'JSON to .env' }).check();
  await expect(page.getByRole('textbox', { name: 'JSON', exact: true })).toHaveValue(/"DB_HOST": "localhost"/);
  await expect(output).toHaveText('DB_HOST=localhost\nNAME="my app"\nEMPTY=\n');
});

test('.env ↔ JSON reports the lines it can not read, and flattens nested JSON', async ({ page }) => {
  await open(page, '/env/');
  await page.getByRole('textbox', { name: '.env', exact: true }).fill('GOOD=1\nno equals here\nGOOD=2\n');
  await expect(page.getByTestId('env-output')).toHaveText('{\n  "GOOD": "2"\n}');
  await expect(page.getByTestId('env-notes').locator('li')).toHaveText([
    'Line 2: no = on this line ("no equals here"). It was skipped.',
    'Line 3: GOOD was already set; this value replaces the earlier one.'
  ]);

  await page.getByRole('radio', { name: 'JSON to .env' }).check();
  const json = page.getByRole('textbox', { name: 'JSON', exact: true });
  await json.fill('{"db":{"host":"x","port":5432},"apiUrl":"https://a.b/c"}');
  await expect(page.getByTestId('env-output')).toHaveText('DB_HOST=x\nDB_PORT=5432\nAPI_URL=https://a.b/c\n');
  await page.getByRole('checkbox', { name: /Write the names the environment way/ }).uncheck();
  await expect(page.getByTestId('env-output')).toHaveText('db_host=x\ndb_port=5432\napiUrl=https://a.b/c\n');

  await json.fill('[1, 2]');
  await expect(page.getByRole('status')).toHaveText('An environment file needs a JSON object: names with values.');
  await json.fill('{"a": 1,}');
  await expect(page.getByRole('status')).toContainText('Line 1, column 9:');
});

test('.env ↔ JSON speaks Dutch', async ({ page }) => {
  await open(page, '/nl/env/');
  await page.getByRole('textbox', { name: '.env', exact: true }).fill('A=1\n2B=x');
  await expect(page.getByRole('status')).toHaveText('1 variabele.');
  await expect(page.getByTestId('env-notes')).toContainText('Regel 2: "2B" is geen geldige naam.');
});
