import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { open, watchErrors } from './helpers';
import { live, soon } from './live';

test('Ctrl K opens the command menu; typing finds a tool and Enter opens it', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/');
  await page.keyboard.press('Control+k');
  const menu = page.getByRole('dialog', { name: 'Command menu' });
  await expect(menu).toBeVisible();
  const input = menu.getByRole('combobox');
  await expect(input).toBeFocused();

  await input.fill('regex');
  await expect(menu.getByRole('option').first()).toContainText('Regex tester');
  await expect(menu.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/regex\/$/);
  await expect(menu).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regex tester');
  expect(errors).toEqual([]);
});

test('the menu shows favourites first, then the other built tools; arrows move and Escape closes it', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Add Regex tester to favourites' }).click();
  await page.getByRole('button', { name: 'Command menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Command menu' });
  const favourites = menu.getByRole('group', { name: 'Favourites' });
  await expect(favourites.getByRole('option')).toHaveText([/Regex tester/]);
  await expect(favourites.getByRole('option')).toHaveAttribute('aria-selected', 'true');

  // every other built tool follows, without the favourite a second time
  const others = menu.getByRole('group', { name: 'Tools' }).getByRole('option');
  await expect(others).toHaveCount(live.length - 1);
  await expect(menu.getByRole('option')).toHaveCount(live.length);

  if (live.length > 1) {
    await page.keyboard.press('ArrowDown');
    await expect(others.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
  }
  await expect(favourites.getByRole('option')).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test('a planned tool is found by search, but has no page to open', async ({ page }) => {
  test.skip(!soon.length, 'every tool is built');
  await open(page, '/');
  await page.keyboard.press('Control+k');
  const menu = page.getByRole('dialog', { name: 'Command menu' });
  await menu.getByRole('combobox').fill(soon[0].title.en);
  const first = menu.getByRole('option').first();
  await expect(first).toContainText(soon[0].title.en);
  await expect(first).toContainText('soon');
  await expect(first).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test('a search without results says so, and the menu speaks Dutch', async ({ page }) => {
  await open(page, '/nl/');
  await page.keyboard.press('Control+k');
  const menu = page.getByRole('dialog', { name: 'Commandomenu' });
  await menu.getByRole('combobox').fill('wachtwoord');
  await expect(menu.getByRole('option').first()).toContainText('Wachtwoordgenerator');
  await menu.getByRole('combobox').fill('qwertyuiop');
  await expect(menu).toContainText('Geen tool gevonden voor “qwertyuiop”.');
  await expect(menu.getByRole('option')).toHaveCount(0);

  // Ctrl K again closes it
  await page.keyboard.press('Control+k');
  await expect(menu).toBeHidden();
});

for (const theme of ['dark', 'light'] as const) {
  test(`the open command menu has no serious accessibility issues (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/');
    await page.getByRole('button', { name: 'Add Regex tester to favourites' }).click();
    await page.keyboard.press('Control+k');
    const menu = page.getByRole('dialog', { name: 'Command menu' });
    await expect(menu).toBeVisible();
    // with a query the list also holds planned tools, which look different
    await menu.getByRole('combobox').fill('e');
    await expect(menu.getByRole('option').first()).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}
