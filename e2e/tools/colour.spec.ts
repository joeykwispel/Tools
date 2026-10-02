import { expect, test } from '@playwright/test';
import { open } from '../helpers';
import { NAMES } from '../../src/lib/tools/colour/names';

test('Colour converter writes a colour in every notation', async ({ page }) => {
  await open(page, '/colour/');
  await expect(page.getByRole('status')).toHaveText('Read as HEX.');
  await expect(page.getByTestId('colour-hex')).toHaveText('#ff8800');
  await expect(page.getByTestId('colour-rgb')).toHaveText('rgb(255 136 0)');
  await expect(page.getByTestId('colour-hsl')).toHaveText('hsl(32 100% 50%)');
  await expect(page.getByTestId('colour-oklch')).toHaveText(/^oklch\(\d+(\.\d+)?% 0\.\d+ \d+(\.\d+)?\)$/);
  await expect(page.getByTestId('colour-name')).toHaveCount(0);
  // what the browser paints is the colour
  await expect(page.getByTestId('colour-swatch').locator('.fill')).toHaveCSS('background-color', 'rgb(255, 136, 0)');

  const input = page.getByRole('textbox', { name: 'Colour', exact: true });
  await input.fill('hsl(270 50% 40%)');
  await expect(page.getByRole('status')).toHaveText('Read as hsl().');
  await expect(page.getByTestId('colour-hex')).toHaveText('#663399');
  await expect(page.getByTestId('colour-name')).toHaveText('rebeccapurple');

  await page.getByRole('checkbox', { name: /older way, with commas/ }).check();
  await expect(page.getByTestId('colour-rgb')).toHaveText('rgb(102, 51, 153)');
  await input.fill('rgb(0 0 0 / 50%)');
  await expect(page.getByTestId('colour-rgb')).toHaveText('rgba(0, 0, 0, 0.5)');
  await expect(page.getByTestId('colour-hex')).toHaveText('#00000080');
  await expect(page.getByTestId('colour-swatch').locator('.fill')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.5)');

  await input.fill('oklch(70% 0.4 145)');
  await expect(page.getByText('This colour is outside what an sRGB screen can show.')).toBeVisible();
  await input.fill('blurple');
  await expect(page.getByRole('status')).toHaveText('This is not a colour that can be read.');
  await expect(page.getByTestId('colour-hex')).toHaveText('');
});

test('Colour converter takes a colour from the picker, the examples and the shades', async ({ page }) => {
  await open(page, '/colour/');
  const input = page.getByRole('textbox', { name: 'Colour', exact: true });
  await page.getByLabel('Pick a colour').fill('#3366cc');
  await expect(input).toHaveValue('#3366cc');
  await expect(page.getByTestId('colour-rgb')).toHaveText('rgb(51 102 204)');

  await page.getByRole('button', { name: 'rebeccapurple' }).click();
  await expect(input).toHaveValue('rebeccapurple');
  await expect(page.getByRole('status')).toHaveText('Read as a colour name.');

  const shades = page.getByTestId('colour-shades').getByRole('button');
  await expect(shades).toHaveCount(10);
  const darkest = await shades.last().getAttribute('title');
  await shades.last().click();
  await expect(input).toHaveValue(darkest!);
});

test('Colour converter knows the names the browser knows', async ({ page }) => {
  await open(page, '/colour/');
  // the browser's own reading of every name, to hold the list against
  const browser = await page.evaluate((names) => {
    const context = document.createElement('canvas').getContext('2d')!;
    return names.map((name) => {
      context.fillStyle = '#010203';
      context.fillStyle = name;
      return context.fillStyle.slice(1);
    });
  }, Object.keys(NAMES));
  expect(browser).toEqual(Object.values(NAMES));
});

test('Colour converter speaks Dutch', async ({ page }) => {
  await open(page, '/nl/colour/');
  await expect(page.getByRole('status')).toHaveText('Gelezen als HEX.');
  await page.getByRole('textbox', { name: 'Kleur', exact: true }).fill('');
  await expect(page.getByRole('status')).toHaveText('Typ een kleur.');
});
