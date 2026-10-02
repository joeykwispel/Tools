import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Counter counts characters, words, sentences and reading time as you type', async ({ page }) => {
  await open(page, '/counter/');
  const text = page.getByRole('textbox', { name: 'Text', exact: true });

  await text.fill('Hello world. This is a test!\nA second line?\n\nAnd a new paragraph.');
  await expect(page.getByTestId('counter-characters')).toHaveText('65');
  await expect(page.getByTestId('counter-charactersNoSpaces')).toHaveText('52');
  await expect(page.getByTestId('counter-words')).toHaveText('13');
  await expect(page.getByTestId('counter-sentences')).toHaveText('4');
  await expect(page.getByTestId('counter-paragraphs')).toHaveText('2');
  await expect(page.getByTestId('counter-lines')).toHaveText('4');
  await expect(page.getByTestId('counter-reading')).toHaveText('3 s');

  // an emoji is one character, however many bytes it takes
  await text.fill('👨‍👩‍👧‍👦');
  await expect(page.getByTestId('counter-characters')).toHaveText('1');
  await expect(page.getByTestId('counter-bytes')).toHaveText('25');

  await text.fill('word '.repeat(476));
  await expect(page.getByTestId('counter-words')).toHaveText('476');
  await expect(page.getByTestId('counter-reading')).toHaveText('2 min');
  await expect(page.getByTestId('counter-speaking')).toHaveText('3 min 10 s');
});

test('Counter lists the most used words, and speaks Dutch', async ({ page }) => {
  await open(page, '/counter/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('The cat and the dog. The dog barks.');
  const rows = page.getByTestId('counter-top').locator('tbody tr');
  await expect(rows.first()).toHaveText('the3');
  await expect(rows.nth(1)).toHaveText('dog2');

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByTestId('counter-words')).toHaveText('0');
  await expect(page.getByTestId('counter-top')).toHaveCount(0);

  await open(page, '/nl/counter/');
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill('Eén zin. Nog een zin.');
  await expect(page.getByTestId('counter-sentences')).toHaveText('2');
  await expect(page.getByText('Leestijd', { exact: true })).toBeVisible();
});
