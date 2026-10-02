import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Password generator makes a password of the chosen length and characters, and says how strong it is', async ({ page }) => {
  await open(page, '/password/');
  const output = page.getByTestId('password-output');
  // 20 characters from all four sets to start with
  await expect(output).toHaveText(/^\S{20}$/);
  await expect(page.getByRole('status')).toContainText('Very strong: 129 bits.');
  const first = await output.textContent();

  await page.getByRole('button', { name: 'Another one' }).click();
  await expect(output).not.toHaveText(first!);

  await page.getByRole('slider', { name: /Length/ }).fill('8');
  for (const name of ['upper case (A–Z)', 'symbols (!@#…)', 'lower case (a–z)']) await page.getByRole('checkbox', { name }).uncheck();
  await expect(output).toHaveText(/^[0-9]{8}$/);
  await expect(page.getByRole('status')).toContainText('Weak: 27 bits.');
  await expect(page.getByRole('status')).toContainText('less than a second');

  await page.getByRole('checkbox', { name: /look alike/ }).check();
  await expect(output).toHaveText(/^[2-9]{8}$/);

  await page.getByRole('checkbox', { name: 'digits (0–9)' }).uncheck();
  await expect(output).toHaveText('');
  await expect(page.getByRole('status')).toHaveText('Choose at least one kind of character.');
});

test('Password generator makes a passphrase of words', async ({ page }) => {
  await open(page, '/password/');
  await page.getByRole('radio', { name: /Passphrase/ }).check();
  const output = page.getByTestId('password-output');
  // six words joined by dashes (one word of the list, yo-yo, has a dash of its own)
  await expect(output).toHaveText(/^([a-z]{2,5}-){5,6}[a-z]{2,5}$/);
  await expect(page.getByRole('status')).toContainText('Fair: 62 bits.');

  await page.getByRole('slider', { name: /Words/ }).fill('8');
  await page.getByRole('radio', { name: 'a space' }).check();
  await page.getByRole('checkbox', { name: 'Start every word with a capital' }).check();
  await expect(output).toHaveText(/^([A-Z][a-z-]{2,4} ){7}[A-Z][a-z-]{2,4}$/);
  await expect(page.getByRole('status')).toContainText('Strong: 83 bits.');
  await page.getByRole('checkbox', { name: 'Add a digit' }).check();
  await expect(output).toHaveText(/[0-9]/);
});

test('Password generator speaks Dutch', async ({ page }) => {
  await open(page, '/nl/password/');
  await expect(page.getByTestId('password-output')).toHaveText(/^\S{20}$/);
  await expect(page.getByRole('status')).toContainText('Zeer sterk: 129 bits.');
  await expect(page.getByRole('button', { name: 'Een andere' })).toBeVisible();
});
