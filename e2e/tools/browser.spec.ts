import { expect, test } from '@playwright/test';
import { open } from '../helpers';

/** The value next to a name in a list of names and values. */
const value = (list: import('@playwright/test').Locator, name: string) => list.locator('dt', { hasText: new RegExp(`^${name}$`) }).locator('+ dd');

test('This browser shows the window and follows it when it changes', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await open(page, '/browser/');
  const screen = page.getByTestId('browser-screen');
  await expect(value(screen, 'Viewport')).toHaveText('800 × 600 px');
  const ratio = await page.evaluate(() => devicePixelRatio);
  await expect(value(screen, 'Pixel ratio')).toHaveText(String(Number(ratio.toFixed(2))));
  await expect(value(screen, 'Viewport in device pixels')).toHaveText(`${Math.round(800 * ratio)} × ${Math.round(600 * ratio)} px`);

  await page.setViewportSize({ width: 640, height: 480 });
  await expect(value(screen, 'Viewport')).toHaveText('640 × 480 px');
});

test('This browser shows the preferences and follows them', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await open(page, '/browser/');
  const preferences = page.getByTestId('browser-preferences');
  await expect(value(preferences, 'Colour scheme')).toHaveText('dark');
  await expect(value(preferences, 'Reduced motion')).toHaveText('no');
  await expect(value(preferences, 'Time zone')).toHaveText(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));

  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await expect(value(preferences, 'Colour scheme')).toHaveText('light');
  await expect(value(preferences, 'Reduced motion')).toHaveText('yes');

  const own = await page.evaluate(() => navigator.userAgent);
  await expect(value(page.getByTestId('browser-browser'), 'User agent')).toHaveText(own);
  // all of it as text, to paste into a bug report
  const report = page.getByTestId('browser-report');
  await expect(report).toContainText('Colour scheme: light\nReduced motion: yes');
  await expect(report).toContainText(`User agent: ${own}`);
});

test('This browser shows what a key press says', async ({ page }) => {
  await open(page, '/browser/');
  const field = page.getByRole('textbox', { name: 'Key events' });
  const result = page.getByTestId('browser-key-result');
  await expect(result).toHaveCount(0);

  await field.press('a');
  await expect(result.locator('dd')).toHaveText(['a', 'KeyA', '65', 'standard', 'nothing', 'no', "event.code === 'KeyA'"]);
  // nothing is typed into the field
  await expect(field).toHaveValue('');

  await field.press('Shift+A');
  await expect(value(result, 'event.key')).toHaveText('A');
  await expect(value(result, 'Held with it')).toHaveText('Shift');
  await field.press('Space');
  await expect(value(result, 'event.key')).toHaveText('Space (" ")');
  await expect(value(result, 'event.code')).toHaveText('Space');
  await field.press('ShiftRight');
  await expect(value(result, 'Location')).toHaveText('right');
  await field.press('Enter');
  await expect(value(result, 'event.keyCode')).toHaveText('13');

  // Tab is shown too, and still moves on
  await field.press('Tab');
  await expect(value(result, 'event.key')).toHaveText('Tab');
  await expect(field).not.toBeFocused();
});

test('This browser speaks Dutch', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page, '/nl/browser/');
  await expect(value(page.getByTestId('browser-preferences'), 'Kleurenschema')).toHaveText('donker');
  await page.getByRole('textbox', { name: 'Toetsaanslagen' }).press('Numpad1');
  await expect(value(page.getByTestId('browser-key-result'), 'Plaats')).toHaveText('numeriek blok');
});
