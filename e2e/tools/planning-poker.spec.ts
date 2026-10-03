import { expect, test, type Locator } from '@playwright/test';
import { open } from '../helpers';

/** The value next to a name in a list of names and values. */
const value = (list: Locator, name: string) => list.locator('dt', { hasText: new RegExp(`^${name}$`) }).locator('+ dd');

test('Planning poker keeps a picked card face down until it is turned', async ({ page }) => {
  await open(page, '/planning-poker/');
  const big = page.getByTestId('poker-card');
  await expect(page.getByRole('status')).toHaveText('Pick a card.');
  await expect(page.getByRole('button', { name: 'Turn it over' })).toBeDisabled();

  await page.getByRole('button', { name: '8', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Picked, face down.');
  // closed means closed: the number is not on the big card, and the card is not marked among the others
  await expect(big).toHaveText('');
  await expect(big).toHaveClass(/back/);
  await expect(page.getByRole('button', { name: '8', exact: true })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: 'Turn it over' }).click();
  await expect(big).toHaveText('8');
  await expect(page.getByRole('button', { name: '8', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText('Your card is 8.');
  // another card is closed again
  await page.getByRole('button', { name: 'No idea' }).click();
  await expect(big).toHaveText('');
  await page.getByRole('button', { name: 'Turn it over' }).click();
  await expect(page.getByRole('status')).toHaveText('Your card is No idea.');
  await page.getByRole('button', { name: 'Pick another' }).click();
  await expect(page.getByRole('status')).toHaveText('Pick a card.');
});

test('Planning poker has four decks and remembers the one that was used', async ({ page }) => {
  await open(page, '/planning-poker/');
  const cards = page.getByTestId('poker-cards').getByRole('button');
  await expect(cards).toHaveText(['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', '☕']);
  await page.getByRole('button', { name: '5', exact: true }).click();

  await page.getByRole('radio', { name: 'T-shirt sizes' }).check();
  await expect(cards).toHaveText(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕']);
  // the card of the other deck is gone
  await expect(page.getByRole('status')).toHaveText('Pick a card.');

  await page.reload();
  await expect(page.getByRole('radio', { name: 'T-shirt sizes' })).toBeChecked();
  await expect(cards.first()).toHaveText('XS');
});

test('Planning poker tallies a round and says how far apart it is', async ({ page }) => {
  await open(page, '/planning-poker/');
  await page.getByRole('radio', { name: 'tally a round' }).check();
  await expect(page.getByRole('status')).toHaveText('No cards yet.');

  for (const card of ['3', '5', '5', '13']) await page.getByRole('button', { name: new RegExp(`^${card}, shown`) }).click();
  await page.getByRole('button', { name: /^No idea, shown/ }).click();
  await expect(page.getByRole('status')).toHaveText('From 3 to 13: let the lowest and the highest explain, then pick again.');
  const summary = page.getByTestId('poker-summary');
  await expect(value(summary, 'Cards')).toHaveText('1 × 3, 2 × 5, 1 × 13, 1 × ?');
  await expect(value(summary, 'Average')).toHaveText('6.5');
  await expect(page.getByRole('button', { name: '5, shown 2 times' })).toBeVisible();

  await page.getByRole('button', { name: 'Take the last one back' }).click();
  await expect(value(summary, 'Cards')).toHaveText('1 × 3, 2 × 5, 1 × 13');
  await page.getByRole('button', { name: 'New round' }).click();
  await expect(page.getByRole('status')).toHaveText('No cards yet.');

  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^8, shown/ }).click();
  await expect(page.getByRole('status')).toHaveText('Everyone says 8: that is the estimate.');
});

test('Planning poker speaks Dutch', async ({ page }) => {
  await open(page, '/nl/planning-poker/');
  await page.getByRole('button', { name: 'Tijd voor pauze' }).click();
  await page.getByRole('button', { name: 'Draai om' }).click();
  await expect(page.getByRole('status')).toHaveText('Jouw kaart is Tijd voor pauze.');
});
