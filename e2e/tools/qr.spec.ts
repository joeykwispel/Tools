import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('QR code makes a code of a link, larger with more text and more error correction', async ({ page }) => {
  await open(page, '/qr/');
  const code = page.getByTestId('qr-code');
  await expect(code).toBeVisible();
  await expect(code).toHaveAttribute('aria-label', 'QR code for: https://tools.joeyoosenbrug.nl/');

  const input = page.getByRole('textbox', { name: 'Link or text' });
  await input.fill('hi');
  await expect(page.getByRole('status')).toHaveText('Version 1: 21 × 21 squares.');
  await expect(code).toHaveAttribute('viewBox', '0 0 29 29');
  const small = await code.locator('path').getAttribute('d');

  await input.fill('a much longer text that does not fit in the smallest code anymore');
  await expect(page.getByRole('status')).toHaveText(/^Version [3-9]: \d+ × \d+ squares\.$/);
  expect(await code.locator('path').getAttribute('d')).not.toBe(small);
  const medium = await page.getByRole('status').textContent();
  await page.getByRole('radio', { name: /highest/ }).check();
  await expect(page.getByRole('status')).not.toHaveText(medium!);

  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('Type something to make a code of.');
  await expect(code).toHaveCount(0);
  await input.fill('x'.repeat(3000));
  await expect(page.getByRole('status')).toContainText('This is too much for a QR code');
});

test('QR code downloads the code as SVG and PNG', async ({ page }) => {
  await open(page, '/qr/');
  const svg = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SVG' }).click();
  expect((await svg).suggestedFilename()).toBe('qr-code.svg');
  const png = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  expect((await png).suggestedFilename()).toBe('qr-code.png');
});

test('QR code makes a code for a Wi-Fi network, and speaks Dutch', async ({ page }) => {
  await open(page, '/nl/qr/');
  await page.getByRole('radio', { name: 'Een wifi-netwerk' }).check();
  await expect(page.getByRole('status')).toHaveText('Typ iets om er een code van te maken.');
  await page.getByRole('textbox', { name: 'Netwerknaam' }).fill('Thuis');
  await page.getByRole('textbox', { name: 'Wachtwoord' }).fill('geheim123');
  const code = page.getByTestId('qr-code');
  await expect(code).toBeVisible();
  // the picture is named after the network, not after its password
  await expect(code).toHaveAttribute('aria-label', 'QR-code voor: Thuis');
  const withPassword = await code.locator('path').getAttribute('d');
  await page.getByRole('radio', { name: 'geen' }).check();
  await expect(page.getByRole('textbox', { name: 'Wachtwoord' })).toHaveCount(0);
  await expect(code.locator('path')).not.toHaveAttribute('d', withPassword!);
});
