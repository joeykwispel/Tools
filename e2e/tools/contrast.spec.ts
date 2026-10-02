import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Contrast checker measures a pair against WCAG 2.2', async ({ page }) => {
  await open(page, '/contrast/');
  const ratio = page.getByTestId('contrast-ratio');
  const checks = page.getByTestId('contrast-checks').getByRole('listitem');
  const text = page.getByRole('textbox', { name: 'Text colour', exact: true });
  // it starts with a blue that passes AA on white
  await expect(ratio).toHaveText(/^5\.\d+ to 1$/);
  await expect(page.getByTestId('contrast-already')).toHaveText('Already passes.');
  // #7a7a7a on white is just short of AA for text
  await text.fill('#7a7a7a');
  await expect(ratio).toHaveText('4.29 to 1');
  await expect(checks).toHaveText([/AA, text.*fails/, /AA, large text.*passes/, /AAA, text.*fails/, /AAA, large text.*fails/, /icons and edges.*passes/]);
  await expect(page.getByTestId('contrast-preview')).toHaveCSS('color', 'rgb(122, 122, 122)');

  await text.fill('#767676');
  await expect(ratio).toHaveText('4.54 to 1');
  await expect(checks.first()).toContainText('passes');
  await expect(page.getByTestId('contrast-already')).toHaveText('Already passes.');

  await text.fill('black');
  await expect(ratio).toHaveText('21 to 1');
  await page.getByRole('button', { name: 'Swap' }).click();
  await expect(text).toHaveValue('#ffffff');
  await expect(page.getByRole('textbox', { name: 'Background colour', exact: true })).toHaveValue('black');
  await expect(ratio).toHaveText('21 to 1');

  await text.fill('nope');
  await expect(ratio).toHaveText('–');
  await expect(page.getByText('This is not a colour that can be read.')).toBeVisible();
});

test('Contrast checker suggests the nearest colours that pass, and uses one', async ({ page }) => {
  await open(page, '/contrast/');
  await page.getByRole('textbox', { name: 'Text colour', exact: true }).fill('#7a7a7a');
  const suggestText = page.getByTestId('contrast-suggest-text');
  await expect(suggestText).toContainText(/#[0-9a-f]{6} \(4\.\d+ to 1\)/);
  await expect(page.getByTestId('contrast-suggest-background')).toContainText(/#[0-9a-f]{6} \(4\.\d+ to 1\)/);

  await page.getByRole('radio', { name: 'AAA text (7:1)' }).check();
  await expect(suggestText).toContainText(/\((7|8)(\.\d+)? to 1\)/);

  await page.getByRole('button', { name: /^Use #[0-9a-f]{6} as the text colour$/ }).click();
  await expect(page.getByTestId('contrast-ratio')).toHaveText(/^(7|8)(\.\d+)? to 1$/);
  await expect(page.getByTestId('contrast-checks').getByRole('listitem').nth(2)).toContainText('passes');
  await expect(page.getByTestId('contrast-already')).toBeVisible();
});

test('Contrast checker speaks Dutch', async ({ page }) => {
  await open(page, '/nl/contrast/');
  await page.getByRole('textbox', { name: 'Tekstkleur', exact: true }).fill('#7a7a7a');
  await expect(page.getByTestId('contrast-ratio')).toHaveText('4,29 op 1');
  await expect(page.getByTestId('contrast-checks').getByRole('listitem').first()).toContainText('vraagt 4,5:1');
  await expect(page.getByTestId('contrast-checks').getByRole('listitem').first()).toContainText('zakt');
});
