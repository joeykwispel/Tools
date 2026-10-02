import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { live } from './live';

/** Both languages of the home page, and every built tool. A tool is the same markup in both languages, so one is enough. */
const pages = ['/', '/nl/', ...live.map((tool) => `/${tool.slug}/`)];

async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const path of pages) {
  test(`${path} has no serious accessibility issues, in both themes`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    // let reveal animations finish so contrast is measured on the final colors
    await page.waitForTimeout(1000);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await serious(page), 'dark').toEqual([]);

    await page.locator('.jo-nav__theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.waitForTimeout(400);
    expect(await serious(page), 'light').toEqual([]);
  });
}
