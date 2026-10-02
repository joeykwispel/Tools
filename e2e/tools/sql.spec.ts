import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('SQL formatter lays out a query, with a choice of keyword case and indent', async ({ page }) => {
  await open(page, '/sql/');
  const input = page.getByRole('textbox', { name: 'SQL', exact: true });
  const output = page.getByTestId('sql-output');

  await input.fill('select id, name from users where active = true and age > 18 order by name');
  await expect(output).toHaveText('SELECT\n  id,\n  name\nFROM users\nWHERE active = TRUE\n  AND age > 18\nORDER BY name');

  await page.getByRole('radio', { name: 'lower case' }).check();
  await expect(output).toHaveText('select\n  id,\n  name\nfrom users\nwhere active = true\n  and age > 18\norder by name');
  await page.getByRole('radio', { name: '4 spaces' }).check();
  await expect(output).toHaveText('select\n    id,\n    name\nfrom users\nwhere active = true\n    and age > 18\norder by name');
});

test('SQL formatter indents subqueries and leaves strings and comments alone', async ({ page }) => {
  await open(page, '/sql/');
  await page.getByRole('textbox', { name: 'SQL', exact: true }).fill("select * from (select id from t) s where note = 'select from where' -- done");
  await expect(page.getByTestId('sql-output')).toHaveText("SELECT\n  *\nFROM (\n  SELECT\n    id\n  FROM t\n) s\nWHERE note = 'select from where' -- done");

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByTestId('sql-output')).toHaveText('');
  await page.getByRole('button', { name: 'Sample' }).click();
  await expect(page.getByTestId('sql-output')).toContainText('LEFT JOIN orders o ON o.user_id = u.id');
});

test('SQL formatter speaks Dutch', async ({ page }) => {
  await open(page, '/nl/sql/');
  await page.getByRole('textbox', { name: 'SQL', exact: true }).fill('select 1');
  await page.getByRole('radio', { name: 'kleine letters' }).check();
  await expect(page.getByTestId('sql-output')).toHaveText('select\n  1');
});
