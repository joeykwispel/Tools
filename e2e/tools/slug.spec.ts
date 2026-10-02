import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Slug makes a URL slug of a title, with a choice of separator, case and length', async ({ page }) => {
  await open(page, '/slug/');
  const title = page.getByRole('textbox', { name: 'Title or text' });
  const slug = page.getByTestId('slug-output');

  await title.fill('Crème brûlée & Co: the Best of 2026!');
  await expect(slug).toHaveText('creme-brulee-co-the-best-of-2026');
  await page.getByRole('radio', { name: 'an underscore' }).check();
  await expect(slug).toHaveText('creme_brulee_co_the_best_of_2026');
  await page.getByRole('checkbox', { name: 'Lower case' }).uncheck();
  await expect(slug).toHaveText('Creme_brulee_Co_the_Best_of_2026');
  await page.getByRole('spinbutton', { name: /Maximum length/ }).fill('16');
  await expect(slug).toHaveText('Creme_brulee_Co');
});

test('Lorem ipsum gives filler text of the asked size, and another one on request', async ({ page }) => {
  await open(page, '/slug/');
  const output = page.getByTestId('lorem-output');
  const amount = page.getByRole('spinbutton', { name: 'How many' });

  // three paragraphs to start with
  await expect(output).toContainText('Lorem ipsum dolor sit amet');
  expect((await output.textContent())!.split('\n\n')).toHaveLength(3);

  await page.getByRole('radio', { name: 'words' }).check();
  await amount.fill('5');
  await expect(output).toHaveText('Lorem ipsum dolor sit amet');
  await amount.fill('12');
  const first = await output.textContent();
  expect(first!.split(' ')).toHaveLength(12);
  await page.getByRole('button', { name: 'Another one' }).click();
  await expect(output).not.toHaveText(first!);
  expect((await output.textContent())!.split(' ')).toHaveLength(12);

  await page.getByRole('checkbox', { name: /Start with/ }).uncheck();
  await expect(output).not.toContainText('Lorem ipsum dolor sit amet');
  await page.getByRole('radio', { name: 'sentences' }).check();
  await amount.fill('2');
  expect((await output.textContent())!.match(/\./g)).toHaveLength(2);
});

test('Slug + lorem ipsum speaks Dutch', async ({ page }) => {
  await open(page, '/nl/slug/');
  await page.getByRole('textbox', { name: 'Titel of tekst' }).fill('Één goede titel');
  await expect(page.getByTestId('slug-output')).toHaveText('een-goede-titel');
  await expect(page.getByRole('radio', { name: 'alinea’s' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Een andere' })).toBeVisible();
});
