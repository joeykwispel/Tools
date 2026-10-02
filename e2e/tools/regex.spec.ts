import { expect, test } from '@playwright/test';
import { watchErrors } from '../helpers';

test('the regex tester opens from the home page with a working sample', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Regex tester' }).click();
  await expect(page).toHaveURL(/\/regex\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regex tester');
  await expect(page).toHaveTitle('Regex tester | Tools');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://tools.joeyoosenbrug.nl/regex/');

  // the sample: three dates, with named groups
  await expect(page.getByRole('status')).toHaveText('3 matches.');
  await expect(page.getByTestId('highlight').locator('mark')).toHaveText(['2026-10-02', '2026-10-09', '2027-01-15']);
  const first = page.locator('.list li').first();
  await expect(first).toContainText('Match 1');
  await expect(first).toContainText('at 12');
  await expect(first.locator('dt')).toHaveText(['Group year', 'Group month', 'Group day']);
  await expect(first.locator('dd')).toHaveText(['2026', '10', '02']);
  await expect(page.getByTestId('replaced')).toContainText('Released on 02/10/2026, patched on 09/10/2026.');

  await page.getByRole('link', { name: /cd \.\./ }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  expect(errors).toEqual([]);
});

test('matches follow the pattern, the flags and the text as you type', async ({ page }) => {
  await page.goto('/regex/');
  await page.getByLabel('Pattern').fill('cat');
  await page.getByLabel('Test text').fill('Cat, cat and concat');
  await expect(page.getByRole('status')).toHaveText('2 matches.');
  await page.getByLabel(/ignore case/).check();
  await expect(page.getByRole('status')).toHaveText('3 matches.');
  await page.getByLabel(/global/).uncheck();
  await expect(page.getByRole('status')).toHaveText('1 match.');
  await expect(page.getByTestId('highlight').locator('mark')).toHaveText(['Cat']);

  await page.getByLabel('Replace with').fill('dog');
  await expect(page.getByTestId('replaced')).toHaveText('dog, cat and concat');

  await page.getByLabel('Pattern').fill('zebra');
  await expect(page.getByRole('status')).toHaveText('No matches.');
  await expect(page.getByTestId('highlight')).toHaveCount(0);

  await page.getByRole('button', { name: 'Sample' }).click();
  await expect(page.getByRole('status')).toHaveText('3 matches.');
});

test('an invalid pattern is explained, an empty one asks for a pattern', async ({ page }) => {
  await page.goto('/regex/');
  await page.getByLabel('Pattern').fill('(unclosed');
  await expect(page.getByRole('status')).toContainText('Invalid pattern:');
  await expect(page.getByTestId('replaced')).toHaveCount(0);
  await page.getByLabel('Pattern').fill('');
  await expect(page.getByRole('status')).toHaveText('Type a pattern to see what it matches.');
});

test('a pattern that backtracks forever is stopped, and the page keeps working', async ({ page }) => {
  await page.goto('/regex/');
  await page.getByLabel('Test text').fill(`${'a'.repeat(40)}!`);
  await page.getByLabel('Pattern').fill('^(a+)+$');
  await expect(page.getByRole('status')).toContainText('takes too long', { timeout: 10_000 });
  await page.getByLabel('Pattern').fill('a+');
  await expect(page.getByRole('status')).toHaveText('1 match.');
});

test('the regex tester speaks Dutch', async ({ page }) => {
  await page.goto('/nl/regex/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regex-tester');
  await expect(page.getByLabel('Patroon')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('3 matches.');
  await page.getByLabel('Patroon').fill('zebra');
  await expect(page.getByRole('status')).toHaveText('Geen matches.');
  await expect(page.getByRole('link', { name: /alle tools/ })).toHaveAttribute('href', '/nl/');
});
