import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Timebox timer counts down, keeps counting when the time is up, and can pause', async ({ page }) => {
  // the clock is the test's own, so minutes pass in a moment
  await page.clock.install({ time: new Date('2026-01-05T09:00:00') });
  await open(page, '/timebox/');
  // from here the clock only moves when the test moves it
  await page.clock.pauseAt(new Date('2026-01-05T09:01:00'));
  const face = page.getByTestId('timebox-clock');
  await expect(face).toHaveText('5:00');
  await expect(page.getByRole('status')).toHaveText('Ready: 5:00.');

  await page.getByRole('textbox', { name: 'Timebox' }).fill('0:20');
  await expect(face).toHaveText('0:20');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.clock.runFor(8000);
  await expect(face).toHaveText('0:12');
  await expect(page.getByRole('status')).toHaveText('Running.');

  await page.getByRole('button', { name: 'Pause' }).click();
  await page.clock.runFor(60_000);
  await expect(face).toHaveText('0:12');
  await expect(page.getByRole('status')).toHaveText('Paused at 0:12.');

  await page.getByRole('button', { name: 'Go on' }).click();
  await page.clock.runFor(7000);
  await expect(face).toHaveText('0:05');
  await expect(face).toHaveClass(/ending/);
  await page.clock.runFor(8000);
  await expect(face).toHaveText('+0:03');
  await expect(face).toHaveClass(/over/);
  await expect(page.getByRole('status')).toHaveText('Time is up.');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(face).toHaveText('0:20');
  await expect(page.getByRole('status')).toHaveText('Ready: 0:20.');
});

test('Timebox timer takes the usual times and says when a time can not be read', async ({ page }) => {
  await open(page, '/timebox/');
  const face = page.getByTestId('timebox-clock');
  await page.getByRole('button', { name: '15 min' }).click();
  await expect(face).toHaveText('15:00');
  await expect(page.getByRole('button', { name: '15 min' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Timebox' })).toHaveValue('15:00');

  await page.getByRole('textbox', { name: 'Timebox' }).fill('90s');
  await expect(face).toHaveText('1:30');
  await page.getByRole('textbox', { name: 'Timebox' }).fill('soon');
  await expect(page.getByText('This is not a time: try 5, 1:30 or 90s, up to a day.')).toBeVisible();
  // the last time that could be read stays
  await expect(face).toHaveText('1:30');
});

test('Timebox timer gives everyone in a stand-up a turn', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-05T09:00:00') });
  await open(page, '/timebox/');
  // from here the clock only moves when the test moves it
  await page.clock.pauseAt(new Date('2026-01-05T09:01:00'));
  await page.getByRole('textbox', { name: 'Timebox' }).fill('1:00');
  await page.getByRole('spinbutton', { name: 'Turns' }).fill('3');
  await expect(page.getByRole('status')).toHaveText('Ready: 1:00. Turn 1 of 3.');
  await expect(page.getByRole('button', { name: 'Next turn' })).toBeDisabled();

  await page.getByRole('button', { name: 'Start' }).click();
  await page.clock.runFor(40_000);
  await page.getByRole('button', { name: 'Next turn' }).click();
  // the next one starts right away, with a full timebox
  await expect(page.getByTestId('timebox-clock')).toHaveText('1:00');
  await expect(page.getByRole('status')).toHaveText('Running. Turn 2 of 3.');
  await page.clock.runFor(70_000);
  await expect(page.getByRole('status')).toHaveText('Time is up. Turn 2 of 3.');
  await page.getByRole('button', { name: 'Next turn' }).click();
  await page.clock.runFor(30_000);
  await expect(page.getByRole('status')).toHaveText('Running. Turn 3 of 3.');
  await expect(page.getByRole('button', { name: 'Next turn' })).toBeDisabled();
  await expect(page.getByTestId('timebox-total').locator('dd')).toHaveText('2:20');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('status')).toHaveText('Ready: 1:00. Turn 1 of 3.');
});

test('Timebox timer speaks Dutch', async ({ page }) => {
  await open(page, '/nl/timebox/');
  await expect(page.getByRole('status')).toHaveText('Klaar: 5:00.');
  await page.getByRole('textbox', { name: 'Timebox' }).fill('2u');
  await expect(page.getByTestId('timebox-clock')).toHaveText('2:00:00');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});
