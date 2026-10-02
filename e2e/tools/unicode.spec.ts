import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Unicode inspector lists the code points and bytes of a text', async ({ page }) => {
  await open(page, '/unicode/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('Aé😀');
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText('U+00E9');
  await expect(rows.nth(1)).toContainText('C3 A9');
  await expect(rows.nth(2)).toContainText('U+1F600');
  await expect(rows.nth(2)).toContainText('F0 9F 98 80');
  await expect(page.getByTestId('unicode-graphemes')).toHaveText('3');
  await expect(page.getByTestId('unicode-utf16')).toHaveText('4');
  await expect(page.getByTestId('unicode-utf8')).toHaveText('7');
  await expect(page.getByRole('status')).toContainText('Nothing hidden');
  await expect(page.getByTestId('unicode-cleaned')).toHaveCount(0);
});

test('Unicode inspector finds hidden characters and offers the text without them', async ({ page }) => {
  await open(page, '/unicode/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('pass\u200Bword\u00A0ok');
  await expect(page.getByRole('status')).toHaveText('2 characters are hidden or unusual. They are marked in the table.');
  await expect(page.getByTestId('unicode-hidden')).toHaveText('2');
  const flagged = page.locator('tbody tr.flag');
  await expect(flagged).toHaveCount(2);
  await expect(flagged.first()).toContainText('invisible: ZERO WIDTH SPACE');
  await expect(flagged.last()).toContainText('unusual space: NO-BREAK SPACE');
  await expect(page.getByTestId('unicode-cleaned')).toHaveText('password ok');

  // a family emoji is one character to a reader, seven code points to a computer
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('👨‍👩‍👧‍👦');
  await expect(page.getByTestId('unicode-graphemes')).toHaveText('1');
  await expect(page.getByTestId('unicode-codepoints')).toHaveText('7');
});

test('Unicode inspector speaks Dutch', async ({ page }) => {
  await open(page, '/nl/unicode/');
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill('a\u200Bb');
  await expect(page.getByRole('status')).toHaveText('1 teken is verborgen of ongebruikelijk. Het is gemarkeerd in de tabel.');
  await expect(page.locator('tbody tr.flag')).toContainText('onzichtbaar: ZERO WIDTH SPACE');
});
