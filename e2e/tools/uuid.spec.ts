import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const lines = async (page: import('@playwright/test').Page) => ((await page.getByTestId('uuid-output').textContent()) ?? '').split('\n');

test('UUID / ULID / NanoID generates identifiers of each kind', async ({ page }) => {
  await open(page, '/uuid/');
  // five random UUIDs to start with
  await expect(page.getByTestId('uuid-output')).toHaveText(/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\n?){5}$/);
  const first = await lines(page);
  expect(new Set(first).size).toBe(5);

  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByTestId('uuid-output')).not.toHaveText(first.join('\n'));

  await page.getByRole('checkbox', { name: 'Upper case' }).check();
  await page.getByRole('spinbutton', { name: 'How many' }).fill('3');
  await expect(page.getByTestId('uuid-output')).toHaveText(/^([0-9A-F-]{36}\n?){3}$/);

  await page.getByRole('radio', { name: /UUID v7/ }).check();
  await expect(page.getByTestId('uuid-output')).toHaveText(/^([0-9A-F]{8}-[0-9A-F]{4}-7[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\n?){3}$/);
  await page.getByRole('radio', { name: 'ULID' }).check();
  await expect(page.getByTestId('uuid-output')).toHaveText(/^([0-9A-HJKMNP-TV-Z]{26}\n?){3}$/);
  await page.getByRole('radio', { name: 'NanoID' }).check();
  await expect(page.getByTestId('uuid-output')).toHaveText(/^([A-Za-z0-9_-]{21}\n?){3}$/);
  await page.getByRole('spinbutton', { name: 'Length' }).fill('8');
  await expect(page.getByTestId('uuid-output')).toHaveText(/^([A-Za-z0-9_-]{8}\n?){3}$/);
});

test('UUID / ULID / NanoID tells what a pasted identifier is and when it was made', async ({ page }) => {
  await open(page, '/uuid/');
  const input = page.getByRole('textbox', { name: 'A UUID or ULID' });
  await expect(page.getByRole('status')).toHaveText('Paste an identifier to see what kind it is and when it was made.');

  await input.fill('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  await expect(page.getByRole('status')).toHaveText('A UUID, version 4: random.');
  await input.fill('017F22E2-79B0-7CC3-98C4-DC0C0C07398F');
  await expect(page.getByRole('status')).toHaveText('A UUID, version 7: made from the time in milliseconds, sortable. Made on 2022-02-22 19:22:22.000 UTC.');
  await input.fill('01ARYZ6S41TSV4RRFFQ69G5FAV');
  await expect(page.getByRole('status')).toHaveText('A ULID. Made on 2016-07-30 22:36:16.385 UTC.');
  await input.fill('00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('status')).toContainText('The nil UUID');
  await input.fill('not an id');
  await expect(page.getByRole('status')).toHaveText('This is not a UUID or a ULID.');

  // a v7 UUID made here holds the time of now
  await page.getByRole('radio', { name: /UUID v7/ }).check();
  await expect(page.getByTestId('uuid-output')).toHaveText(/-7[0-9a-f]{3}-/);
  await input.fill((await lines(page))[0]);
  await expect(page.getByRole('status')).toContainText(`Made on ${new Date().toISOString().slice(0, 10)}`);
});

test('UUID / ULID / NanoID speaks Dutch', async ({ page }) => {
  await open(page, '/nl/uuid/');
  await expect(page.getByRole('button', { name: 'Genereer' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Een UUID of ULID' }).fill('f47ac10b-58cc-4372-a567-0e02b2c3d479');
  await expect(page.getByRole('status')).toHaveText('Een UUID, versie 4: willekeurig.');
});
