import { expect, test, type Page } from '@playwright/test';

/** Collects CSP violations and uncaught errors, so a test fails if either happens. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

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

test('the home page lists every planned tool, in both languages, without links to pages that do not exist', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('main li[data-status]');
  await expect(rows).toHaveCount(55);
  await expect(page.locator('main li[data-status="soon"]')).toHaveCount(55);
  await expect(page.getByRole('heading', { level: 2, name: 'Encode / decode' })).toBeVisible();
  const jwt = rows.filter({ has: page.getByRole('heading', { level: 3, name: 'JWT decoder', exact: true }) });
  await expect(jwt).toContainText('soon');
  await expect(page.locator('main a')).toHaveCount(0);

  await page.goto('/nl/');
  await expect(page.getByRole('heading', { level: 2, name: 'Coderen / decoderen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'JWT-decoder', exact: true })).toBeVisible();
  await expect(page.locator('main li[data-status]').first()).toContainText('binnenkort');
});

test('language switch keeps the page and is remembered', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the switch is the same component on mobile');
  await page.goto('/');
  await page.getByRole('link', { name: 'NL', exact: true }).click();
  await expect(page).toHaveURL(/\/nl\/$/);
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

test('an unknown address shows the 404 page with a way back', async ({ page }) => {
  const res = await page.goto('/no-such-tool/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
  await page.getByRole('link', { name: /cd ~/ }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test('the page only talks to its own origin', async ({ page, baseURL }) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(baseURL!) && !url.startsWith('data:') && !url.startsWith('blob:')) foreign.push(url);
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
  // the policy that enforces it is in the page itself, because GitHub Pages can't send headers
  const csp = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self'");
});

test('the share image exists', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe('https://tools.joeyoosenbrug.nl/og.png');
  const res = await request.get('/og.png');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
});
