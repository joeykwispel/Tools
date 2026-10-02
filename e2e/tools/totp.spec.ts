import { expect, test } from '@playwright/test';
import { open } from '../helpers';

/** The key of the test vectors in RFC 4226 and RFC 6238 ("12345678901234567890"), as an authenticator shows it. */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('TOTP gives the codes of the RFC for a secret at a moment', async ({ page }) => {
  // 59 seconds after 1970: the first test vector of RFC 6238
  await page.clock.setFixedTime(new Date(59_000));
  await open(page, '/totp/');
  const code = page.getByTestId('totp-code');
  await expect(code).toHaveText(/^\d{3} \d{3}$/);

  await page.getByRole('textbox', { name: 'Secret', exact: true }).fill(RFC_SECRET.toLowerCase().replace(/(.{4})/g, '$1 '));
  await expect(code).toHaveText('287 082');
  await expect(page.getByTestId('totp-next')).toHaveText('359 152');
  await expect(page.getByTestId('totp-left')).toHaveText('Valid for 1 more second.');

  await page.getByRole('radio', { name: '8', exact: true }).check();
  await expect(code).toHaveText('9428 7082');
  await page.getByRole('radio', { name: 'SHA-256' }).check();
  // not the vector of the RFC, which uses a longer key for SHA-256: only another code than with SHA-1
  await expect(code).not.toHaveText('9428 7082');
  await expect(code).toHaveText(/^\d{4} \d{4}$/);
  await page.getByRole('radio', { name: 'SHA-1', exact: true }).check();

  // a minute per code: second 59 is still in the first period
  await page.getByRole('spinbutton', { name: 'Seconds per code' }).fill('60');
  await expect(code).toHaveText('8475 5224');
  await expect(page.getByTestId('totp-uri')).toHaveText(
    `otpauth://totp/Tools:test%40example.com?secret=${RFC_SECRET}&issuer=Tools&algorithm=SHA1&digits=8&period=60`
  );
  await expect(page.getByTestId('totp-qr')).toBeVisible();
});

test('TOTP moves to the next code when the period is over', async ({ page }) => {
  // second 45 is in the second period (30 to 59); the clock runs on from there
  await page.clock.install({ time: new Date(45_000) });
  await open(page, '/totp/');
  await page.getByRole('textbox', { name: 'Secret', exact: true }).fill(RFC_SECRET);
  const code = page.getByTestId('totp-code');
  await expect(code).toHaveText('287 082');
  await page.clock.fastForward(20_000);
  await expect(code).toHaveText('359 152');
  await expect(page.getByTestId('totp-left')).toHaveText(/^Valid for \d+ more seconds?\.$/);
});

test('TOTP reads an otpauth link, says what is wrong with a secret, and makes a new one', async ({ page }) => {
  await open(page, '/totp/');
  const secret = page.getByRole('textbox', { name: 'Secret', exact: true });
  const status = page.getByRole('status');

  await secret.fill('otpauth://totp/ACME%20Co:john@example.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60');
  await expect(secret).toHaveValue('HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ');
  await expect(status).toHaveText('Read from the link: ACME Co: john@example.com.');
  await expect(page.getByRole('textbox', { name: 'Service' })).toHaveValue('ACME Co');
  await expect(page.getByRole('textbox', { name: 'Account' })).toHaveValue('john@example.com');
  await expect(page.getByRole('radio', { name: 'SHA-256' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '8', exact: true })).toBeChecked();
  await expect(page.getByRole('spinbutton', { name: 'Seconds per code' })).toHaveValue('60');
  await expect(page.getByTestId('totp-code')).toHaveText(/^\d{4} \d{4}$/);

  await secret.fill('otpauth://hotp/alice?secret=JBSWY3DPEHPK3PXP&counter=1');
  await expect(status).toContainText('counter-based codes');
  await secret.fill('not a secret!');
  await expect(status).toContainText('A secret is Base32');
  await expect(page.getByTestId('totp-code')).toHaveText('··· ···');
  await expect(page.getByTestId('totp-qr')).toHaveCount(0);
  await secret.fill('');
  await expect(status).toHaveText('Type or paste a secret.');

  await page.getByRole('button', { name: 'New secret' }).click();
  await expect(secret).toHaveValue(/^[A-Z2-7]{32}$/);
  const first = await secret.inputValue();
  await page.getByRole('button', { name: 'New secret' }).click();
  await expect(secret).not.toHaveValue(first);
  await expect(page.getByTestId('totp-code')).toHaveText(/^\d{4} \d{4}$/);
});

test('TOTP speaks Dutch', async ({ page }) => {
  await open(page, '/nl/totp/');
  await expect(page.getByText('Code nu', { exact: true })).toBeVisible();
  await expect(page.getByTestId('totp-code')).toHaveText(/^\d{3} \d{3}$/);
  await expect(page.getByTestId('totp-left')).toHaveText(/^Nog \d+ seconden? geldig\.$/);
  await page.getByRole('spinbutton', { name: 'Seconden per code' }).fill('0');
  await expect(page.getByRole('status')).toHaveText('De periode is een heel aantal seconden, van 1 tot en met 3600.');
});
