import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const TEAM = ['Ada', 'Grace', 'Linus', 'Margaret'];

test('Random picker picks nobody twice until everyone has been', async ({ page }) => {
  await open(page, '/random-picker/');
  await expect(page.getByTestId('picker-count')).toHaveText('Type some names, one per line.');
  await expect(page.getByRole('button', { name: 'Pick someone' })).toBeDisabled();

  await page.getByRole('textbox', { name: 'Names' }).fill(` ${TEAM.join('\n\n')} `);
  await expect(page.getByTestId('picker-count')).toHaveText('4 names.');
  const chosen = page.getByTestId('picker-chosen');
  await expect(chosen).toHaveText('Nobody picked yet.');

  const round: string[] = [];
  for (let i = 0; i < TEAM.length; i++) {
    await page.getByRole('button', { name: 'Pick someone' }).click();
    await expect(page.getByTestId('picker-waiting')).toHaveText(
      i < TEAM.length - 1 ? `Still to go: ${TEAM.length - 1 - i}.` : 'Everyone has been. The next pick starts a new round.'
    );
    round.push((await chosen.textContent())!.trim());
  }
  expect([...round].sort()).toEqual(TEAM);

  // the next pick starts a new round
  await page.getByRole('button', { name: 'Pick someone' }).click();
  await expect(page.getByTestId('picker-waiting')).toHaveText('Still to go: 3.');
  await page.getByRole('button', { name: 'Start the round over' }).click();
  await expect(page.getByTestId('picker-waiting')).toHaveCount(0);
});

test('Random picker shuffles everyone into an order and into groups', async ({ page }) => {
  await open(page, '/random-picker/');
  await page.getByRole('button', { name: 'Sample' }).click();
  await expect(page.getByTestId('picker-count')).toHaveText('6 names.');

  await page.getByRole('button', { name: 'Shuffle' }).click();
  const order = await page.getByTestId('picker-order').getByRole('listitem').allTextContents();
  expect([...order].sort()).toEqual(['Ada', 'Barbara', 'Dennis', 'Grace', 'Linus', 'Margaret']);

  await page.getByRole('spinbutton', { name: 'How many groups' }).fill('4');
  await page.getByRole('button', { name: 'Make groups' }).click();
  const made = page.getByTestId('picker-groups');
  await expect(made.getByRole('heading')).toHaveText(['Group 1', 'Group 2', 'Group 3', 'Group 4']);
  const sizes = await made.getByRole('list').evaluateAll((lists) => lists.map((list) => list.children.length));
  expect(sizes).toEqual([2, 2, 1, 1]);
  expect((await made.getByRole('listitem').allTextContents()).sort()).toEqual([...order].sort());
});

test('Random picker keeps the names on the device, and speaks Dutch', async ({ page }) => {
  await open(page, '/random-picker/');
  await page.getByRole('textbox', { name: 'Names' }).fill('Ada\nGrace');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Names' })).toHaveValue('Ada\nGrace');

  await open(page, '/nl/random-picker/');
  await expect(page.getByRole('textbox', { name: 'Namen' })).toHaveValue('Ada\nGrace');
  await expect(page.getByTestId('picker-count')).toHaveText('2 namen.');
  await page.getByRole('button', { name: 'Kies iemand' }).click();
  await expect(page.getByTestId('picker-chosen')).toHaveText(/^(Ada|Grace)$/);
  await expect(page.getByTestId('picker-waiting')).toHaveText('Nog te gaan: 1.');
});
