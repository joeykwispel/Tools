import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('HTTP status + MIME lists every code and type, and finds a code', async ({ page }) => {
  await open(page, '/http-status/');
  await expect(page.getByRole('status')).toHaveText('Status codes: 61. Media types: 73.');
  const codes = page.getByTestId('http-status-codes');
  await expect(codes.locator('.group')).toHaveText([
    '1xx: informational',
    '2xx: it worked',
    '3xx: look somewhere else',
    '4xx: the request is the problem',
    '5xx: the server is the problem'
  ]);

  const search = page.getByRole('searchbox', { name: 'Search' });
  await search.fill('404');
  await expect(page.getByRole('status')).toHaveText('Status codes: 1. Media types: 0.');
  await expect(codes.locator('.status')).toHaveText('404 Not Found There is nothing at this address.');
  await expect(page.getByText('No media type matches.')).toBeVisible();

  await search.fill('3xx');
  await expect(codes.locator('.code')).toHaveText(['300', '301', '302', '303', '304', '307', '308']);
  await search.fill('gateway');
  await expect(codes.locator('.code')).toHaveText(['502', '504']);
  await search.fill('zzz');
  await expect(page.getByText('No status code matches.')).toBeVisible();
});

test('HTTP status + MIME finds a media type by extension or name, and copies it', async ({ page, context, browserName }) => {
  await open(page, '/http-status/');
  const search = page.getByRole('searchbox', { name: 'Search' });
  const types = page.getByTestId('http-status-mimes').locator('tbody tr');

  await search.fill('.svg');
  await expect(types).toHaveCount(1);
  await expect(types).toContainText('image/svg+xml');
  await expect(types).toContainText('.svg');
  await expect(types).toContainText('SVG drawing');

  await search.fill('font');
  await expect(types.locator('.type')).toHaveText(['font/woff2', 'font/woff', 'font/ttf', 'font/otf']);
  await search.fill('json');
  await expect(types.first()).toContainText('application/json');

  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await types.first().getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('application/json');
});

test('HTTP status + MIME speaks Dutch', async ({ page }) => {
  await open(page, '/nl/http-status/');
  const search = page.getByRole('searchbox', { name: 'Zoeken' });
  await search.fill('omleiding');
  await expect(page.getByRole('status')).toHaveText('Statuscodes: 4. Mediatypes: 0.');
  await expect(page.getByTestId('http-status-codes').locator('.code')).toHaveText(['301', '302', '307', '308']);
  await search.fill('lettertype');
  await expect(page.getByTestId('http-status-mimes').locator('tbody tr')).toHaveCount(4);
});
