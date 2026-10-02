import { expect, test } from '@playwright/test';
import { watchErrors, watchForeignRequests } from './helpers';
import { live } from './live';

/** What every built tool has to do, whatever it is. Each tool's own behaviour is tested in e2e/tools/<slug>.spec.ts. */
for (const tool of live) {
  test(`${tool.slug}: opens in English and Dutch, without errors and without talking to another origin`, async ({ page, baseURL }) => {
    const errors = watchErrors(page);
    const foreign = watchForeignRequests(page, baseURL!);

    await page.goto(`/${tool.slug}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tool.title.en);
    await expect(page).toHaveTitle(`${tool.title.en} | Tools`);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://tools.joeyoosenbrug.nl/${tool.slug}/`);
    await expect(page.getByRole('button', { name: `Add ${tool.title.en} to favourites` })).toBeVisible();
    await expect(page.getByRole('link', { name: /all tools/ })).toHaveAttribute('href', '/');

    await page.goto(`/nl/${tool.slug}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tool.title.nl);
    await expect(page.getByRole('link', { name: /alle tools/ })).toHaveAttribute('href', '/nl/');

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
    expect(foreign).toEqual([]);
  });
}

test('the home page links to every built tool', async ({ page }) => {
  await page.goto('/');
  for (const tool of live) await expect(page.getByRole('link', { name: tool.title.en, exact: true })).toHaveAttribute('href', `/${tool.slug}/`);
});
