import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Case converter shows a name in every case at once', async ({ page }) => {
  await open(page, '/case/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('user profile ID');
  await expect(page.getByTestId('case-camel')).toHaveText('userProfileId');
  await expect(page.getByTestId('case-pascal')).toHaveText('UserProfileId');
  await expect(page.getByTestId('case-snake')).toHaveText('user_profile_id');
  await expect(page.getByTestId('case-constant')).toHaveText('USER_PROFILE_ID');
  await expect(page.getByTestId('case-kebab')).toHaveText('user-profile-id');
  await expect(page.getByTestId('case-title')).toHaveText('User Profile Id');
  await expect(page.getByTestId('case-sentence')).toHaveText('User profile id');

  // it does not matter how the name was written
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('XMLHttpRequest\ndate-of-birth');
  await expect(page.getByTestId('case-snake')).toHaveText('xml_http_request\ndate_of_birth');
  await expect(page.getByTestId('case-camel')).toHaveText('xmlHttpRequest\ndateOfBirth');
  await expect(page.getByRole('button', { name: 'Copy snake_case' })).toBeVisible();
});

test('Case converter asks for input when there is none, and speaks Dutch', async ({ page }) => {
  await open(page, '/case/');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByRole('status')).toHaveText('Type a name or a sentence to see it in every case.');
  await expect(page.getByTestId('case-camel')).toHaveCount(0);

  await open(page, '/nl/case/');
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill('voor naam');
  await expect(page.getByTestId('case-camel')).toHaveText('voorNaam');
  await expect(page.getByRole('button', { name: 'Kopieer camelCase' })).toBeVisible();
});
