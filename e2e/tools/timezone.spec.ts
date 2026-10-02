import { expect, test } from '@playwright/test';
import { open } from '../helpers';

// the visitor is in Amsterdam, on Monday 5 October 2026
test.use({ timezoneId: 'Europe/Amsterdam' });
const NOW = new Date('2026-10-05T08:00:00Z');

test('Timezone planner shows the hours of a day on every clock, and when everyone is at work', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/timezone/');
  await expect(page.getByRole('textbox', { name: 'Day', exact: true })).toHaveValue('2026-10-05');
  const zones = page.getByTestId('timezone-zones').getByRole('listitem');
  await expect(zones).toHaveText([/^Europe\/Amsterdam\s*\(first\)/, /^America\/New_York/, /^Asia\/Tokyo/]);
  await expect(page.getByRole('heading', { name: /The hours of Monday,? 5 October 2026/ })).toBeVisible();
  // with Tokyo there is no shared working hour
  await expect(page.getByRole('status')).toHaveText(
    'There is no hour in which everyone is at work. Nobody is asleep from 13:00 to 15:00, on the clock of Amsterdam.'
  );

  const hours = page.getByTestId('timezone-hours');
  await expect(hours.getByRole('columnheader')).toHaveText(['Amsterdam', 'New York', 'Tokyo']);
  const three = hours.getByRole('row').nth(16);
  await expect(three.getByRole('cell').nth(0)).toContainText('15:00');
  await expect(three.getByRole('cell').nth(1)).toHaveText('09:00 at work');
  await expect(three.getByRole('cell').nth(2)).toHaveText('22:00 night');
  // 02:00 in Amsterdam is still Sunday evening in New York
  await expect(hours.getByRole('row').nth(3).getByRole('cell').nth(1)).toHaveText('20:00 −1 the day before weekend');

  await page.getByRole('button', { name: 'Remove Asia/Tokyo' }).click();
  await expect(page.getByRole('status')).toHaveText('Everyone is at work from 15:00 to 17:00, on the clock of Amsterdam.');
  await expect(hours.locator('tr.best')).toHaveCount(2);
});

test('Timezone planner shows a picked hour on every clock', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/timezone/');
  await expect(page.getByText('Pick an hour in the table to see it on every clock.')).toBeVisible();
  await page.getByRole('button', { name: 'Pick 18:00' }).click();
  await expect(page.getByRole('button', { name: 'Pick 18:00' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('timezone-chosen')).toHaveText(
    /^Amsterdam: Mon,? 5 Oct, 18:00 \(UTC\+2\)\nNew York: Mon,? 5 Oct, 12:00 \(UTC-4\)\nTokyo: Tue,? 6 Oct, 01:00 \(UTC\+9\)$/
  );
  await expect(page.getByRole('button', { name: 'Copy as text' })).toBeVisible();

  // another day keeps the hour picked; after the clock went back, Amsterdam is an hour closer to UTC
  await page.getByRole('textbox', { name: 'Day', exact: true }).fill('2026-10-26');
  await expect(page.getByTestId('timezone-chosen')).toContainText('18:00 (UTC+1)');
  await expect(page.getByTestId('timezone-chosen')).toContainText('13:00 (UTC-4)');
});

test('Timezone planner adds a zone and puts another clock first', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/timezone/');
  await page.getByRole('combobox', { name: 'Add a time zone' }).selectOption('Australia/Sydney');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const hours = page.getByTestId('timezone-hours');
  await expect(hours.getByRole('columnheader')).toHaveText(['Amsterdam', 'New York', 'Tokyo', 'Sydney']);
  await expect(page.getByRole('combobox', { name: 'Add a time zone' }).locator('option[value="Australia/Sydney"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Put Asia/Tokyo first' }).click();
  await expect(hours.getByRole('columnheader')).toHaveText(['Tokyo', 'Amsterdam', 'New York', 'Sydney']);
  // four clocks around the world: someone is always asleep
  await expect(page.getByRole('status')).toHaveText('Whatever the hour, it is night for someone. Pick who gets up early or stays up late.');
  // the table now runs from midnight in Tokyo, which is 17:00 the day before in Amsterdam
  await expect(hours.getByRole('row').nth(1).getByRole('cell').nth(1)).toContainText('17:00');
  await expect(hours.getByRole('row').nth(1).getByRole('cell').nth(1)).toContainText('the day before');
});

test('Timezone planner speaks Dutch', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/nl/timezone/');
  await expect(page.getByRole('status')).toHaveText(
    'Er is geen uur waarop iedereen aan het werk is. Niemand slaapt van 13:00 tot 15:00, op de klok van Amsterdam.'
  );
  await page.getByRole('button', { name: 'Kies 09:00' }).click();
  await expect(page.getByTestId('timezone-chosen')).toContainText('Tokyo: ma 5 okt');
  await page.getByRole('textbox', { name: 'Dag', exact: true }).fill('');
  await expect(page.getByRole('status')).toHaveText('Kies een dag.');
});
