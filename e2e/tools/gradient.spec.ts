import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Gradient + shadow builds a gradient and shows it', async ({ page }) => {
  await open(page, '/gradient/');
  const css = page.getByTestId('gradient-css');
  await expect(css).toHaveText('background: linear-gradient(135deg, #7dd3c0 0%, #b49cff 100%);');
  await expect(page.getByTestId('gradient-surface')).toHaveCSS('background-image', /linear-gradient/);

  await page.getByRole('slider', { name: 'Angle' }).fill('90');
  await page.getByRole('checkbox', { name: 'Mix the colours in OKLCH' }).check();
  await expect(css).toHaveText('background: linear-gradient(in oklch 90deg, #7dd3c0 0%, #b49cff 100%);');

  await page.getByRole('button', { name: 'Add a colour' }).click();
  await page.getByRole('textbox', { name: 'Colour 3', exact: true }).fill('tomato');
  await expect(css).toHaveText('background: linear-gradient(in oklch 90deg, #7dd3c0 0%, #b49cff 50%, tomato 100%);');
  await page.getByRole('spinbutton', { name: 'Position of colour 2 (%)' }).fill('30');
  await expect(css).toContainText('#b49cff 30%');

  await page.getByRole('radio', { name: 'radial' }).check();
  await page.getByRole('radio', { name: 'ellipse' }).check();
  await expect(css).toHaveText('background: radial-gradient(ellipse in oklch, #7dd3c0 0%, #b49cff 30%, tomato 100%);');
  await page.getByRole('radio', { name: 'conic' }).check();
  await expect(css).toContainText('conic-gradient(from 90deg in oklch,');

  await page.getByRole('button', { name: 'Remove colour 1' }).click();
  await expect(css).toContainText('#b49cff 30%, tomato 100%');
  await page.getByRole('textbox', { name: 'Colour 1', exact: true }).fill('not a colour');
  await expect(page.getByRole('status')).toHaveText('Colour 1 can not be read.');
  await expect(css).toHaveText('');
});

test('Gradient + shadow builds a box shadow from a start and layers', async ({ page }) => {
  await open(page, '/gradient/');
  await page.getByRole('radio', { name: 'box shadow' }).check();
  const css = page.getByTestId('gradient-css');
  await expect(css).toHaveText('box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.12), 0 12px 32px -8px rgb(15 23 42 / 0.28);');
  await expect(page.getByTestId('shadow-card')).toHaveCSS('box-shadow', /rgba\(15, 23, 42, 0\.28\)/);

  await page.getByRole('button', { name: 'Sharp' }).click();
  await expect(css).toHaveText('box-shadow: 6px 6px 0 0 #0f172a;');
  await page.getByRole('spinbutton', { name: 'Blur (px)' }).fill('4');
  await page.getByRole('checkbox', { name: 'Inside' }).check();
  await expect(css).toHaveText('box-shadow: inset 6px 6px 4px 0 #0f172a;');

  await page.getByRole('button', { name: 'Add a layer' }).click();
  await expect(css).toHaveText('box-shadow: inset 6px 6px 4px 0 #0f172a, 0 4px 12px 0 rgb(15 23 42 / 0.2);');
  await page.getByRole('button', { name: 'Remove layer 1' }).click();
  await expect(css).toHaveText('box-shadow: 0 4px 12px 0 rgb(15 23 42 / 0.2);');
});

test('Gradient + shadow speaks Dutch', async ({ page }) => {
  await open(page, '/nl/gradient/');
  await page.getByRole('textbox', { name: 'Kleur 2', exact: true }).fill('?');
  await expect(page.getByRole('status')).toHaveText('Kleur 2 is niet te lezen.');
});
