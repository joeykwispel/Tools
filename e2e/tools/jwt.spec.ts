import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const base64url = (value: unknown) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

test('JWT decoder shows the claims of a token and checks its signature', async ({ page }) => {
  await open(page, '/jwt/');
  // the page opens with the well-known example token and its secret
  await expect(page.getByTestId('jwt-header')).toContainText('"alg": "HS256"');
  await expect(page.getByTestId('jwt-payload')).toContainText('"name": "John Doe"');
  const row = page.getByRole('row', { name: /^iat/ });
  await expect(row).toContainText('1516239022');
  await expect(row).toContainText('Issued at: 2018-01-18 01:30:22 UTC');
  await expect(page.getByTestId('jwt-expiry')).toHaveText('This token has no expiry (exp).');
  await expect(page.getByTestId('jwt-algorithm')).toHaveText('HS256: not broken by a quantum computer.');
  await expect(page.getByTestId('jwt-verdict')).toHaveText('The signature is valid.');

  await page.getByLabel('Secret').fill('wrong');
  await expect(page.getByTestId('jwt-verdict')).toContainText('The signature does not match');
  await page.getByLabel('Secret').fill('');
  await expect(page.getByTestId('jwt-verdict')).toHaveText('Enter the key to check the signature.');
});

test('JWT decoder counts down to the expiry, and says when a token has expired', async ({ page }) => {
  await open(page, '/jwt/');
  await page.getByRole('button', { name: 'Sample' }).click();
  await expect(page.getByTestId('jwt-expiry')).toHaveText(/^Valid for another (59m \d+s|1h)\.$/);
  await expect(page.getByTestId('jwt-verdict')).toHaveText('The signature is valid.');
  await expect(page.getByRole('row', { name: /^exp/ })).toContainText('Expires: 20');

  const expired = `${base64url({ alg: 'HS256' })}.${base64url({ sub: 'ada', exp: 1_000_000_000 })}.${base64url('x')}`;
  await page.getByLabel('Token').fill(expired);
  await expect(page.getByTestId('jwt-expiry')).toHaveText(/^Expired \d+d \d+h ago\.$/);
  await expect(page.getByTestId('jwt-verdict')).toContainText('The signature does not match');
});

test('JWT decoder warns about unsigned tokens and signatures that are not quantum-safe', async ({ page }) => {
  await open(page, '/jwt/');
  await page.getByLabel('Token').fill(`${base64url({ alg: 'none' })}.${base64url({ sub: 'ada' })}.`);
  await expect(page.getByTestId('jwt-algorithm')).toContainText('This token is not signed');
  await expect(page.getByTestId('jwt-verdict')).toHaveText('There is no signature to check.');
  await expect(page.getByLabel('Secret')).toHaveCount(0);

  await page.getByLabel('Token').fill(`Bearer ${base64url({ alg: 'RS256' })}.${base64url({ sub: 'ada' })}.${base64url('sig')}`);
  await expect(page.getByTestId('jwt-algorithm')).toContainText('RS256: a large quantum computer could forge this signature');
  await page.getByLabel('Public key (PEM or JWK)').fill('not a key');
  await expect(page.getByTestId('jwt-verdict')).toContainText('This key can not be read');
});

test('JWT decoder explains input that is not a token', async ({ page }) => {
  await open(page, '/jwt/');
  const token = page.getByLabel('Token');
  await token.fill('not.a-token');
  await expect(page.getByRole('status')).toContainText('This is not a JWT');
  await expect(page.getByTestId('jwt-payload')).toHaveCount(0);
  await token.fill(`${base64url('nope')}.${base64url({})}.x`);
  await expect(page.getByRole('status')).toHaveText('The header is not a JSON object.');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByRole('status')).toHaveText('Paste a token to see what is in it.');
});

test('JWT decoder speaks Dutch', async ({ page }) => {
  await open(page, '/nl/jwt/');
  await expect(page.getByTestId('jwt-verdict')).toHaveText('De handtekening klopt.');
  await expect(page.getByRole('row', { name: /^iat/ })).toContainText('Uitgegeven op: 2018-01-18 01:30:22 UTC');
  await page.getByLabel('Token').fill('x');
  await expect(page.getByRole('status')).toContainText('Dit is geen JWT');
});
