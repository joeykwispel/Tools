import { expect, test, type Locator } from '@playwright/test';
import { open } from '../helpers';

/** The value next to a name in a list of names and values. */
const value = (list: Locator, name: string) => list.locator('dt', { hasText: new RegExp(`^${name}$`) }).locator('+ dd');

test('Calculators writes a number in every base', async ({ page }) => {
  await open(page, '/calculators/');
  await expect(page.getByTestId('bases-2')).toHaveText('1111 1111');
  await expect(page.getByTestId('bases-8')).toHaveText('377');
  await expect(page.getByTestId('bases-10')).toHaveText('255');
  await expect(page.getByTestId('bases-16')).toHaveText('ff');
  await expect(value(page.getByTestId('bases-facts'), 'Bits needed')).toHaveText('8');
  await expect(value(page.getByTestId('bases-facts'), 'As a character')).toHaveText('ÿ');

  const input = page.getByRole('textbox', { name: 'Number' });
  await input.fill('1010');
  await expect(page.getByTestId('bases-10')).toHaveText('1010');
  await page.getByRole('combobox', { name: 'Written in' }).selectOption('2');
  await expect(page.getByTestId('bases-10')).toHaveText('10');
  await input.fill('102');
  await expect(page.getByRole('status')).toHaveText('This is not a whole number in that base.');
  await expect(page.getByTestId('bases-10')).toHaveCount(0);
});

test('Calculators works out chmod from the number, the letters and the boxes', async ({ page }) => {
  await open(page, '/calculators/');
  await page.getByRole('radio', { name: 'chmod' }).check();
  const input = page.getByRole('textbox', { name: 'Permissions' });
  await expect(page.getByTestId('chmod-symbolic')).toHaveText('rwxr-xr-x');
  await expect(page.getByRole('checkbox', { name: 'Group: write' })).not.toBeChecked();

  await input.fill('rw-r-----');
  await expect(page.getByTestId('chmod-octal')).toHaveText('640');
  await expect(page.getByTestId('chmod-command')).toHaveText('chmod 640 file');
  await expect(page.getByRole('checkbox', { name: 'Owner: write' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Others: read' })).not.toBeChecked();

  // a box sets the bit, and the number in the field follows
  await page.getByRole('checkbox', { name: 'Others: read' }).check();
  await page.getByRole('checkbox', { name: /^setuid/ }).check();
  await expect(input).toHaveValue('4644');
  await expect(page.getByTestId('chmod-symbolic')).toHaveText('rwSr--r--');

  await input.fill('999');
  await expect(page.getByRole('status')).toContainText('This is not a mode');
  // what was last read stays
  await expect(page.getByTestId('chmod-octal')).toHaveText('4644');
});

test('Calculators converts data sizes', async ({ page }) => {
  await open(page, '/calculators/');
  await page.getByRole('radio', { name: 'data sizes' }).check();
  await expect(value(page.getByTestId('sizes-binary'), 'GiB')).toHaveText('465.661');
  await expect(value(page.getByTestId('sizes-decimal'), 'MB')).toHaveText('500000');

  await page.getByRole('spinbutton', { name: 'Amount' }).fill('100');
  await page.getByRole('combobox', { name: 'Unit' }).selectOption('Mbit');
  await expect(value(page.getByTestId('sizes-decimal'), 'MB')).toHaveText('12.5');
  await expect(value(page.getByTestId('sizes-bits'), 'Gbit')).toHaveText('0.1');
  await page.getByRole('spinbutton', { name: 'Amount' }).fill('');
  await expect(page.getByRole('status')).toHaveText('Type a number.');
  await expect(page.getByTestId('sizes-decimal')).toHaveCount(0);
});

test('Calculators works out a network from CIDR', async ({ page }) => {
  await open(page, '/calculators/');
  await page.getByRole('radio', { name: 'CIDR' }).check();
  const result = page.getByTestId('cidr-result');
  await expect(result.locator('dd')).toHaveText([
    '192.168.1.0/24',
    '255.255.255.0',
    '11111111.11111111.11111111.00000000',
    '0.0.0.255',
    '192.168.1.255',
    '192.168.1.1',
    '192.168.1.254',
    '254',
    '256',
    'private: not reachable from the internet'
  ]);

  const input = page.getByRole('textbox', { name: 'Address and prefix' });
  await input.fill('8.8.8.8/29');
  await expect(value(result, 'Network')).toHaveText('8.8.8.8/29');
  await expect(value(result, 'Last host')).toHaveText('8.8.8.14');
  await expect(value(result, 'Kind')).toHaveText('public');
  await input.fill('8.8.8.8/40');
  await expect(page.getByRole('status')).toHaveText('The prefix has to be a number from 0 to 32.');
  await input.fill('8.8.8');
  await expect(page.getByRole('status')).toContainText('This is not an IPv4 address');
});

test('Calculators explains a semver range and tries versions against it', async ({ page }) => {
  await open(page, '/calculators/');
  await page.getByRole('radio', { name: 'semver' }).check();
  await expect(page.getByTestId('semver-means')).toHaveText('>=1.2.3 <2.0.0-0 || >=2.0.0-beta.1 <2.1.0-0');
  const results = page.getByTestId('semver-results');
  await expect(results.locator('dt')).toHaveText(['1.2.3', '1.9.0', '1.3.0-alpha', '2.0.0-beta.2', '2.0.5', '2.1.0', '3.0.0']);
  await expect(results.locator('dd')).toHaveText(['in', 'in', 'out', 'in', 'in', 'out', 'out']);

  await page.getByRole('textbox', { name: 'Range' }).fill('~1.2');
  await expect(page.getByTestId('semver-means')).toHaveText('>=1.2.0 <1.3.0-0');
  await page.getByRole('textbox', { name: 'Versions to try' }).fill('1.2.9\nlatest\n1.3.0');
  await expect(results.locator('dd')).toHaveText(['in', 'not a version', 'out']);

  await page.getByRole('textbox', { name: 'Range' }).fill('newest');
  await expect(page.getByRole('status')).toHaveText('This is not a range that can be read.');
  await expect(page.getByTestId('semver-means')).toHaveCount(0);
});

test('Calculators speaks Dutch', async ({ page }) => {
  await open(page, '/nl/calculators/');
  await page.getByRole('radio', { name: 'CIDR' }).check();
  await expect(value(page.getByTestId('cidr-result'), 'Soort')).toHaveText('privé: niet bereikbaar vanaf internet');
  await page.getByRole('radio', { name: 'chmod' }).check();
  await expect(page.getByRole('checkbox', { name: 'Eigenaar: uitvoeren' })).toBeChecked();
  await page.getByRole('radio', { name: 'semver' }).check();
  await expect(page.getByTestId('semver-results').locator('dd').first()).toHaveText('erin');
});
