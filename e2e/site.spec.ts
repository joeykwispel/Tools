import { expect, test } from '@playwright/test';
import { watchErrors, watchForeignRequests } from './helpers';

test('home page is there in English and Dutch', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('in your browser');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://tools.joeyoosenbrug.nl/');
  await expect(page.locator('link[rel=alternate][hreflang=nl]')).toHaveAttribute('href', /\/nl\/$/);

  await page.goto('/nl/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('in je browser');
  expect(errors).toEqual([]);
});

test('the home page lists every tool: the built one as a link, the planned ones without', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('main li[data-status]');
  await expect(rows).toHaveCount(55);
  await expect(page.locator('main li[data-status="live"]')).toHaveCount(1);
  await expect(page.getByText('Coming soon: 54 tools.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Encode / decode' })).toBeVisible();
  const jwt = rows.filter({ has: page.getByRole('heading', { level: 3, name: 'JWT decoder', exact: true }) });
  await expect(jwt).toContainText('soon');
  await expect(page.locator('main li[data-status="soon"] a')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Regex tester' })).toHaveAttribute('href', '/regex/');

  await page.goto('/nl/');
  await expect(page.getByRole('heading', { level: 2, name: 'Coderen / decoderen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'JWT-decoder', exact: true })).toBeVisible();
  await expect(page.locator('main li[data-status="soon"]').first()).toContainText('binnenkort');
  await expect(page.getByRole('link', { name: 'Regex-tester' })).toHaveAttribute('href', '/nl/regex/');
});

test('"Available only" hides the tools that are not built yet, and is remembered', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main li[data-status]')).toHaveCount(55);
  const built = await page.locator('main li[data-status="live"]').count();
  const toggle = page.getByRole('button', { name: 'Available only' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // a favourite that is not built yet goes too
  await page.getByRole('button', { name: 'Add JWT decoder to favourites' }).click();
  await expect(page.getByTestId('favorites')).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main li[data-status="soon"]')).toHaveCount(0);
  await expect(page.locator('main li[data-status="live"]')).toHaveCount(built);
  await expect(page.getByText(`Tools available now: ${built}.`)).toBeVisible();
  await expect(page.getByTestId('favorites')).toHaveCount(0);
  // a category without a built tool is left out, heading and all
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(await page.locator('main section:has(li[data-status="live"])').count());

  await page.reload();
  await expect(page.getByRole('button', { name: 'Available only' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main li[data-status="soon"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Available only' }).click();
  await expect(page.locator('main li[data-status]')).toHaveCount(56);
  await expect(page.getByText('Coming soon:')).toBeVisible();
});

test('language switch keeps the page and is remembered', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the switch is the same component on mobile');
  await page.goto('/regex/');
  await page.getByRole('link', { name: 'NL', exact: true }).click();
  await expect(page).toHaveURL(/\/nl\/regex\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regex-tester');
  await page.goto('/');
  await expect(page).toHaveURL(/\/nl\/$/);
});

test('the theme button switches the theme and it survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.jo-nav__theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('an unknown address, or a tool that is not built yet, shows the 404 page with a way back', async ({ page }) => {
  for (const path of ['/no-such-tool/', '/jwt/']) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
  }
  await page.getByRole('link', { name: /cd ~/ }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test('signed out, the site only talks to its own origin, also while a tool is used', async ({ page, baseURL }) => {
  const foreign = watchForeignRequests(page, baseURL!);
  await page.goto('/');
  // the sign-in button is there, so the auth library has loaded and found no session
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Regex tester to favourites' }).first().click();
  await page.goto('/regex/');
  await page.getByLabel('Test text').fill('a secret: hunter2');
  await page.getByLabel('Pattern').fill('hunter\\d');
  await expect(page.getByRole('status')).toHaveText('1 match.');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
  // the policy that enforces it is in the page itself, because GitHub Pages can't send headers
  const csp = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
  expect(csp).toMatch(/connect-src 'self' https:\/\/[a-z]+\.supabase\.co(;|$)/);
});

test('the share image exists', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://tools.joeyoosenbrug.nl/og.png');
  const res = await request.get('/og.png');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
});
