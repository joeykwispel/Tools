import { expect, test } from '@playwright/test';
import { open } from '../helpers';

// the visitor is in Amsterdam, late on Friday 2 October 2026: in UTC it is still that Friday too, an hour later it is not
test.use({ timezoneId: 'Europe/Amsterdam' });
const NOW = new Date('2026-10-02T21:30:00Z');

test('Date difference counts days, weeks and working days between two dates', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/date-diff/');
  const first = page.getByLabel('First date');
  const second = page.getByLabel('Second date');
  // starts from today to a month later, on the visitor's own calendar
  await expect(first).toHaveValue('2026-10-02');
  await expect(second).toHaveValue('2026-11-02');
  await expect(page.getByRole('status')).toHaveText(/^From Friday,? 2 October 2026 up to Monday,? 2 November 2026\.$/);
  await expect(page.getByTestId('date-days')).toHaveText('31 days');
  await expect(page.getByTestId('date-weeks')).toHaveText('4 weeks and 3 days');
  await expect(page.getByTestId('date-calendar')).toHaveText('1 month');
  await expect(page.getByTestId('date-working')).toHaveText('21');
  await expect(page.getByTestId('date-weekend')).toHaveText('10');

  await second.fill('2026-10-09');
  await expect(page.getByTestId('date-days')).toHaveText('7 days');
  await expect(page.getByTestId('date-weeks')).toHaveText('1 week');
  await expect(page.getByTestId('date-working')).toHaveText('5');
  await page.getByRole('checkbox', { name: 'Count the last day too' }).check();
  await expect(page.getByRole('status')).toHaveText(/^From Friday,? 2 October 2026 up to and including Friday,? 9 October 2026\.$/);
  await expect(page.getByTestId('date-days')).toHaveText('8 days');
  await expect(page.getByTestId('date-weeks')).toHaveText('1 week and 1 day');
  await expect(page.getByTestId('date-working')).toHaveText('6');

  // the other way round
  await second.fill('2026-09-25');
  await expect(page.getByRole('status')).toContainText(/The second date is the earlier one: counted from there\. From Friday,? 25 September 2026/);
  await expect(page.getByTestId('date-days')).toHaveText('8 days');

  await second.fill('');
  await expect(page.getByRole('status')).toHaveText('Pick two dates.');
  await expect(page.getByTestId('date-days')).toHaveCount(0);
});

test('Date difference takes Dutch public holidays off the working days', async ({ page }) => {
  await open(page, '/date-diff/');
  await page.getByLabel('First date').fill('2026-01-01');
  await page.getByLabel('Second date').fill('2027-01-01');
  await expect(page.getByTestId('date-calendar')).toHaveText('1 year');
  await expect(page.getByTestId('date-working')).toHaveText('261');
  await expect(page.getByTestId('date-holidays')).toHaveCount(0);

  await page.getByRole('checkbox', { name: 'Take Dutch public holidays off the working days' }).check();
  await expect(page.getByTestId('date-working')).toHaveText('255');
  await expect(page.getByTestId('date-holidays')).toHaveText('6');
  const holidays = page.getByTestId('date-holiday-list').getByRole('listitem');
  await expect(holidays).toHaveCount(6);
  await expect(holidays.nth(2)).toContainText('King’s Day');
  await expect(holidays.nth(2)).toContainText('27 Apr 2026');
});

test('Date difference adds days and working days to a date', async ({ page }) => {
  await open(page, '/date-diff/');
  await page.getByLabel('First date').fill('2026-12-24');
  const added = page.getByTestId('date-added');
  await expect(added).toHaveText(/^2027-01-23 · Saturday,? 23 January 2027$/);

  await page.getByRole('spinbutton', { name: 'How many' }).fill('1');
  await page.getByRole('combobox', { name: 'Of what' }).selectOption('workingDays');
  await expect(added).toHaveText(/^2026-12-25 · Friday,? 25 December 2026$/);
  await page.getByRole('checkbox', { name: 'Take Dutch public holidays off the working days' }).check();
  await expect(added).toHaveText(/^2026-12-28 · Monday,? 28 December 2026$/);

  await page.getByRole('spinbutton', { name: 'How many' }).fill('-2');
  await page.getByRole('combobox', { name: 'Of what' }).selectOption('months');
  await expect(added).toHaveText(/^2026-10-24 · Saturday,? 24 October 2026$/);
  await page.getByRole('spinbutton', { name: 'How many' }).fill('');
  await expect(added).toHaveText('Type a whole number.');
});

test('Date difference speaks Dutch', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/nl/date-diff/');
  await expect(page.getByRole('status')).toHaveText(/^Van vrijdag,? 2 oktober 2026 tot maandag,? 2 november 2026\.$/);
  await expect(page.getByTestId('date-weeks')).toHaveText('4 weken en 3 dagen');
  await expect(page.getByTestId('date-calendar')).toHaveText('1 maand');
  await expect(page.getByTestId('date-added')).toHaveText(/^2026-11-01 · zondag,? 1 november 2026$/);
});
