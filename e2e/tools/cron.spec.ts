import { expect, test } from '@playwright/test';
import { open } from '../helpers';

// the visitor is in Amsterdam, on Friday 2 October 2026 at 12:07 there (10:07 UTC)
test.use({ timezoneId: 'Europe/Amsterdam' });
const NOW = new Date('2026-10-02T10:07:30Z');

test('Cron explainer says what an expression means, field by field', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/cron/');
  const meaning = page.getByRole('status');
  await expect(meaning).toHaveText('At 09:00, from Monday to Friday.');
  const fields = page.getByTestId('cron-fields');
  await expect(fields.getByRole('row').nth(0)).toContainText('Minute');
  await expect(fields.getByRole('row').nth(1)).toContainText('9');
  await expect(fields.getByRole('row').nth(2)).toContainText('every one (1-31)');
  await expect(fields.getByRole('row').nth(4)).toContainText('1-5 (0 is Sunday)');

  const input = page.getByRole('textbox', { name: 'Cron expression' });
  await input.fill('*/15 9-17 * jan,jul mon');
  await expect(meaning).toHaveText('Every 15 minutes, from 09:00 to 17:59, on Monday, in January and July.');
  await expect(fields.getByRole('row').nth(0)).toContainText('0, 15, 30, 45');
  await expect(fields.getByRole('row').nth(3)).toContainText('1, 7');

  await page.getByRole('button', { name: '@daily' }).click();
  await expect(input).toHaveValue('@daily');
  await expect(meaning).toHaveText('At 00:00, every day.');
  await expect(page.getByText('Short for 0 0 * * *.')).toBeVisible();
  await expect(page.getByRole('button', { name: '@daily' })).toHaveAttribute('aria-pressed', 'true');
});

test('Cron explainer lists the next runs, in UTC or on your own clock', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/cron/');
  const runs = page.getByTestId('cron-runs').getByRole('listitem');
  // 09:00 UTC has gone by this Friday: Monday is next
  await expect(runs).toHaveCount(5);
  await expect(runs.first()).toContainText('Monday');
  await expect(runs.first()).toContainText('5 October 2026');
  await expect(runs.first()).toContainText('09:00:00 UTC');
  await expect(runs.first()).toContainText('in 3 days');

  await page.getByRole('radio', { name: 'you: Europe/Amsterdam' }).check();
  await expect(runs.first()).toContainText('5 October 2026');
  await expect(runs.first()).toContainText('09:00:00 CEST');

  await page.getByRole('textbox', { name: 'Cron expression' }).fill('*/15 * * * *');
  await expect(runs.first()).toContainText('2 October 2026');
  await expect(runs.first()).toContainText('12:15:00 CEST');
  await expect(runs.first()).toContainText('in 8 minutes');
  await expect(runs.nth(4)).toContainText('13:15:00 CEST');

  await page.getByRole('textbox', { name: 'Cron expression' }).fill('0 0 30 2 *');
  await expect(page.getByTestId('cron-runs')).toHaveText('Never: this date does not come in the next eight years.');
});

test('Cron explainer says what is wrong with an expression', async ({ page }) => {
  await open(page, '/cron/');
  const input = page.getByRole('textbox', { name: 'Cron expression' });
  const meaning = page.getByRole('status');
  await input.fill('0 25 * * *');
  await expect(meaning).toHaveText('Hour: 25 is out of range. It goes from 0 to 23.');
  await expect(page.getByTestId('cron-fields')).toHaveCount(0);
  await input.fill('0 0 12 * * ?');
  await expect(meaning).toContainText('This has 6 fields, cron has five.');
  await input.fill('0 0 L * *');
  await expect(meaning).toContainText('Day of the month: L is from other schedulers');
  await input.fill('@reboot');
  await expect(meaning).toContainText('it runs once, when the machine starts');
  await input.fill('');
  await expect(meaning).toHaveText('Type a cron expression.');
});

test('Cron explainer speaks Dutch', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/nl/cron/');
  await expect(page.getByRole('status')).toHaveText('Om 09:00, van maandag tot en met vrijdag.');
  await expect(page.getByTestId('cron-fields').getByRole('row').nth(4)).toContainText('Dag van de week');
  await expect(page.getByTestId('cron-runs').getByRole('listitem').first()).toContainText('5 oktober 2026');
  await expect(page.getByTestId('cron-runs').getByRole('listitem').first()).toContainText('over 3 dagen');
  await page.getByRole('textbox', { name: 'Cron-expressie' }).fill('61 * * * *');
  await expect(page.getByRole('status')).toHaveText('Minuut: 61 valt buiten het bereik. Dat loopt van 0 tot en met 59.');
});
