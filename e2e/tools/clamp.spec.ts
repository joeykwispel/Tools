import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('clamp() calculator writes a fluid size and shows it per screen width', async ({ page }) => {
  await open(page, '/clamp/');
  await expect(page.getByTestId('clamp-result')).toHaveText('clamp(1rem, 0.8333rem + 0.8333vw, 1.5rem)');
  await expect(page.getByTestId('clamp-declaration')).toHaveText('font-size: clamp(1rem, 0.8333rem + 0.8333vw, 1.5rem);');
  const rows = page.getByTestId('clamp-sizes').getByRole('row');
  await expect(rows.nth(1)).toHaveText('320 px16 px');
  await expect(rows.nth(3)).toHaveText('768 px19.7333 px');
  await expect(rows.nth(7)).toHaveText('1920 px24 px');

  await page.getByRole('spinbutton', { name: 'Size on a wide screen (px)' }).fill('32');
  await expect(page.getByTestId('clamp-result')).toHaveText('clamp(1rem, 0.6667rem + 1.6667vw, 2rem)');
  await page.getByRole('radio', { name: 'px', exact: true }).check();
  await expect(page.getByTestId('clamp-result')).toHaveText('clamp(16px, 10.6667px + 1.6667vw, 32px)');

  await page.getByRole('slider', { name: 'Try a width' }).fill('800');
  await expect(page.getByTestId('clamp-try')).toHaveText('800 px wide: 24 px');
  await expect(page.locator('.sample')).toHaveCSS('font-size', '24px');

  // fluid enough to break zooming
  await page.getByRole('spinbutton', { name: 'Size on a wide screen (px)' }).fill('48');
  await expect(page.getByTestId('clamp-zoom')).toContainText('more than 2.5 times the smallest');
  await page.getByRole('spinbutton', { name: 'Narrow screen width (px)' }).fill('1400');
  await expect(page.getByRole('status')).toHaveText('The narrow screen has to be narrower than the wide one.');
  await expect(page.getByTestId('clamp-result')).toHaveText('');
});

test('clamp() calculator converts px and rem both ways, with the root size', async ({ page }) => {
  await open(page, '/clamp/');
  const px = page.getByRole('spinbutton', { name: 'px', exact: true });
  const rem = page.getByRole('spinbutton', { name: 'rem', exact: true });
  await expect(rem).toHaveValue('1.5');
  await px.fill('20');
  await expect(rem).toHaveValue('1.25');
  await rem.fill('2');
  await expect(px).toHaveValue('32');
  await page.getByRole('spinbutton', { name: 'Root font size (px)' }).fill('10');
  await expect(rem).toHaveValue('3.2');
  await expect(page.getByTestId('clamp-result')).toHaveText('clamp(1.6rem, 1.3333rem + 0.8333vw, 2.4rem)');
});

test('clamp() calculator speaks Dutch', async ({ page }) => {
  await open(page, '/nl/clamp/');
  await expect(page.getByTestId('clamp-sizes').getByRole('row').nth(3)).toHaveText('768 px19,7333 px');
  await page.getByRole('spinbutton', { name: 'Basislettergrootte (px)' }).fill('0');
  await expect(page.getByRole('status')).toHaveText('De basislettergrootte moet meer dan 0 zijn.');
});
