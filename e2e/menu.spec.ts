import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { watchErrors } from './helpers';

test('Ctrl K opens the command menu; typing finds a tool and Enter opens it', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
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

test('the menu shows favourites first, and Escape closes it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add JWT decoder to favourites' }).click();
  await page.getByRole('button', { name: 'Command menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Command menu' });
  const favourites = menu.getByRole('group', { name: 'Favourites' });
  await expect(favourites.getByRole('option')).toHaveText([/JWT decoder/]);
  await expect(menu.getByRole('group', { name: 'Tools' }).getByRole('option').first()).toContainText('Regex tester');

  // a planned tool is shown, but it has no page to open
  await expect(favourites.getByRole('option')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await expect(page).toHaveURL(/localhost:\d+\/$/);

  // arrow down to the built tool and open it
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('option', { selected: true })).toContainText('Regex tester');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test('a search without results says so, and the menu speaks Dutch', async ({ page }) => {
  await page.goto('/nl/');
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
    await page.goto('/');
    await page.getByRole('button', { name: 'Add JWT decoder to favourites' }).click();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}
