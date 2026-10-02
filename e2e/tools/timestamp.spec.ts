import { expect, test } from '@playwright/test';
import { open } from '../helpers';

// the visitor is in Amsterdam, a week after the moment of the sample (1 700 000 000: 14 November 2023, 22:13:20 UTC)
test.use({ timezoneId: 'Europe/Amsterdam' });
const NOW = new Date('2023-11-21T22:13:20Z');

test('Unix timestamp writes a timestamp as a date in every form', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/timestamp/');
  await expect(page.getByRole('status')).toHaveText('Read as seconds.');
  await expect(page.getByRole('combobox', { name: 'Time zone' })).toHaveValue('Europe/Amsterdam');
  await expect(page.getByTestId('timestamp-seconds')).toHaveText('1700000000');
  await expect(page.getByTestId('timestamp-milliseconds')).toHaveText('1700000000000');
  await expect(page.getByTestId('timestamp-iso-utc')).toHaveText('2023-11-14T22:13:20Z');
  await expect(page.getByTestId('timestamp-iso-zone')).toHaveText('2023-11-14T23:13:20+01:00');
  await expect(page.getByTestId('timestamp-http')).toHaveText('Tue, 14 Nov 2023 22:13:20 GMT');
  await expect(page.getByTestId('timestamp-week')).toHaveText('2023-W46-2');
  await expect(page.getByTestId('timestamp-words')).toContainText('Tuesday');
  await expect(page.getByTestId('timestamp-words')).toContainText('14 November 2023');
  await expect(page.getByTestId('timestamp-words')).toContainText('23:13:20');
  await expect(page.getByTestId('timestamp-relative')).toHaveText('7 days ago');
  await expect(page.getByTestId('timestamp-now')).toHaveText('Now it is 1700604800.');
  await expect(page.getByRole('heading', { name: 'ISO 8601, Europe/Amsterdam' })).toBeVisible();

  const input = page.getByRole('textbox', { name: 'Timestamp or date' });
  await input.fill('1700000000123');
  await expect(page.getByRole('status')).toHaveText('Read as milliseconds.');
  await expect(page.getByTestId('timestamp-iso-utc')).toHaveText('2023-11-14T22:13:20.123Z');
  await page.getByRole('radio', { name: 'seconds', exact: true }).check();
  await expect(page.getByRole('status')).toHaveText('Read as seconds.');
  // the same digits as seconds: some 53 870 years later
  await expect(page.getByTestId('timestamp-iso-utc')).toHaveText('+055840-11-08T22:15:23Z');

  await page.getByRole('button', { name: 'Now', exact: true }).click();
  await expect(input).toHaveValue('1700604800');
  await expect(page.getByTestId('timestamp-relative')).toHaveText('now');
});

test('Unix timestamp reads a date, in its own zone or the one chosen', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/timestamp/');
  const input = page.getByRole('textbox', { name: 'Timestamp or date' });
  const seconds = page.getByTestId('timestamp-seconds');

  await input.fill('2023-11-14T23:13:20');
  await expect(page.getByRole('status')).toHaveText('Read as a date in Europe/Amsterdam.');
  await expect(seconds).toHaveText('1700000000');

  await page.getByRole('combobox', { name: 'Time zone' }).selectOption('Asia/Tokyo');
  await expect(page.getByRole('status')).toHaveText('Read as a date in Asia/Tokyo.');
  await expect(seconds).toHaveText('1699971200');
  await expect(page.getByTestId('timestamp-iso-zone')).toHaveText('2023-11-14T23:13:20+09:00');

  await input.fill('2023-11-14T22:13:20Z');
  await expect(page.getByRole('status')).toHaveText('Read as a date with its own time zone.');
  await expect(seconds).toHaveText('1700000000');
  await expect(page.getByTestId('timestamp-iso-zone')).toHaveText('2023-11-15T07:13:20+09:00');

  await input.fill('Tue, 14 Nov 2023 22:13:20 GMT');
  await expect(seconds).toHaveText('1700000000');

  await page.getByRole('combobox', { name: 'Time zone' }).selectOption('UTC');
  await expect(page.getByTestId('timestamp-iso-zone')).toHaveCount(0);

  await input.fill('2023-02-29');
  await expect(page.getByRole('status')).toHaveText('This is not a timestamp or a date that can be read.');
  await expect(seconds).toHaveCount(0);
  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('Type a timestamp or a date.');
});

test('Unix timestamp speaks Dutch', async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await open(page, '/nl/timestamp/');
  await expect(page.getByRole('status')).toHaveText('Gelezen als seconden.');
  await expect(page.getByTestId('timestamp-words')).toContainText('14 november 2023');
  await expect(page.getByTestId('timestamp-relative')).toHaveText('7 dagen geleden');
  await expect(page.getByRole('combobox', { name: 'Tijdzone' }).locator('option').first()).toHaveText('Europe/Amsterdam (de jouwe)');
});
