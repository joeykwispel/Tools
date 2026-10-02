import { expect, test } from '@playwright/test';
import { mockSupabase, USER, watchErrors } from './helpers';

test('signed out, a favourite is pinned at the top and survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('favorites')).toHaveCount(0);
  const star = page.locator('[data-category="text"]').getByRole('button', { name: 'Add Regex tester to favourites' });
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await star.click();

  const pinned = page.getByTestId('favorites');
  await expect(pinned.getByRole('link', { name: 'Regex tester' })).toBeVisible();
  await expect(page.locator('[data-category="text"]').getByRole('button', { name: 'Remove Regex tester from favourites' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await page.reload();
  await expect(page.getByTestId('favorites').getByRole('link', { name: 'Regex tester' })).toBeVisible();

  // the star on the tool's own page shows and changes the same favourite
  await page.goto('/regex/');
  await page.getByRole('button', { name: 'Remove Regex tester from favourites' }).click();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('favorites')).toHaveCount(0);
});

test('sign in with Google: this device and the account are merged, and changes are sent', async ({ page }) => {
  const errors = watchErrors(page);
  const { upserts } = await mockSupabase(page, [
    { slug: 'json', starred: true, changed_at: '2026-09-01T10:00:00Z' },
    // removed on another device, long after it was starred
    { slug: 'jwt', starred: false, changed_at: '2999-01-01T00:00:00Z' }
  ]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Regex tester to favourites' }).click();
  await page.getByRole('button', { name: 'Add JWT decoder to favourites' }).click();
  await expect(page.getByTestId('favorites').locator('li')).toHaveCount(2);

  await page.getByRole('button', { name: 'Sign in' }).click();
  const panel = page.locator('#auth-panel');
  await expect(panel.getByText(/keep your favourite tools on every device/)).toBeVisible();
  await panel.getByRole('button', { name: 'Continue with Google' }).click();

  // back from the (mocked) consent screen, with the ?code gone from the address
  await expect(page.getByRole('button', { name: 'Account: Ada Lovelace' })).toBeVisible();
  await expect(page).toHaveURL(/localhost:\d+\/$/);

  // the initial sits in the middle of its button
  const button = (await page.getByRole('button', { name: 'Account: Ada Lovelace' }).boundingBox())!;
  const initial = (await page.locator('.auth .initial').boundingBox())!;
  expect(initial.x + initial.width / 2).toBeCloseTo(button.x + button.width / 2, 1);
  expect(initial.y + initial.height / 2).toBeCloseTo(button.y + button.height / 2, 1);

  // regex from this device, json from the account; jwt was removed elsewhere after it was starred here
  const pinned = page.getByTestId('favorites');
  await expect(pinned.locator('h3')).toHaveText(['JSON formatter', 'Regex tester']);
  await expect.poll(() => upserts.length).toBe(1);
  expect(upserts[0].map((r) => [r.slug, r.starred, r.user_id])).toEqual([['regex', true, USER.id]]);

  await page.getByRole('button', { name: 'Account: Ada Lovelace' }).click();
  await expect(panel.getByText('Signed in as Ada Lovelace')).toBeVisible();
  await expect(panel.getByText('Favourites synced across your devices.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Account: Ada Lovelace' })).toBeFocused();

  // a change made while signed in goes to the account
  await pinned.getByRole('button', { name: 'Remove JSON formatter from favourites' }).click();
  await expect.poll(() => upserts.length).toBe(2);
  expect(upserts[1].map((r) => [r.slug, r.starred])).toEqual([['json', false]]);

  // still signed in after a reload, and signing out keeps the favourites on the device
  await page.reload();
  await page.getByRole('button', { name: 'Account: Ada Lovelace' }).click();
  await panel.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByTestId('favorites').locator('h3')).toHaveText(['Regex tester']);
  expect(errors).toEqual([]);
});

test('a cancelled Google consent shows a message and everything keeps working', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/?error=access_denied&error_description=User+cancelled');
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Sign-in was cancelled.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Add Regex tester to favourites' }).click();
  await expect(page.getByTestId('favorites').getByRole('link', { name: 'Regex tester' })).toBeVisible();
});

test('the sign-in panel speaks Dutch', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/nl/');
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await expect(page.locator('#auth-panel').getByRole('button', { name: 'Doorgaan met Google' })).toBeVisible();
  await expect(page.locator('#auth-panel')).toContainText('Alles werkt ook zonder account.');
  await page.locator('#auth-panel').getByRole('button', { name: 'Doorgaan met Google' }).click();
  await expect(page.getByRole('button', { name: 'Account: Ada Lovelace' })).toBeVisible();
  await expect(page).toHaveURL(/\/nl\/$/);
});
