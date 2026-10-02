import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('HMAC signs a message with a key, by the chosen algorithm', async ({ page }) => {
  await open(page, '/hmac/');
  await page.getByRole('textbox', { name: 'Message' }).fill('what do ya want for nothing?');
  await page.getByRole('textbox', { name: 'Secret key' }).fill('Jefe');
  await expect(page.getByTestId('hmac-hex')).toHaveText('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  await expect(page.getByTestId('hmac-base64')).toHaveText('W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=');

  await page.getByRole('radio', { name: 'HMAC-SHA-1' }).check();
  await expect(page.getByTestId('hmac-hex')).toHaveText('effcdf6ae5eb2fa2d27416d5f184df9c259a7c79');

  // the same key written as hex
  await page.getByRole('radio', { name: 'hex' }).check();
  await page.getByRole('textbox', { name: 'Secret key' }).fill('4a656665');
  await expect(page.getByTestId('hmac-hex')).toHaveText('effcdf6ae5eb2fa2d27416d5f184df9c259a7c79');
  await page.getByRole('textbox', { name: 'Secret key' }).fill('not hex');
  await expect(page.getByText('This key is not valid hex.')).toBeVisible();
  await expect(page.getByTestId('hmac-hex')).toHaveCount(0);
});

test('HMAC checks a webhook signature', async ({ page }) => {
  const body = '{"action":"opened","number":42}';
  const signature = createHmac('sha256', 'whsec').update(body).digest('hex');
  await open(page, '/hmac/');
  await page.getByRole('textbox', { name: 'Message' }).fill(body);
  await page.getByRole('textbox', { name: 'Secret key' }).fill('whsec');
  const given = page.getByRole('textbox', { name: 'Compare with a signature' });
  const verdict = page.getByTestId('hmac-verdict');

  await given.fill(`sha256=${signature}`);
  await expect(verdict).toHaveText('The signatures match: this message was signed with this key.');
  // one space more in the message is another message
  await page.getByRole('textbox', { name: 'Message' }).fill(`${body} `);
  await expect(verdict).toContainText('The signatures do not match');
  await page.getByRole('textbox', { name: 'Message' }).fill(body);
  await page.getByRole('radio', { name: 'HMAC-SHA-512' }).check();
  await expect(verdict).toHaveText('This signature is 32 bytes; HMAC-SHA-512 gives 64. It was probably made with another algorithm.');
});

test('HMAC speaks Dutch', async ({ page }) => {
  await open(page, '/nl/hmac/');
  await page.getByRole('textbox', { name: 'Bericht' }).fill('a');
  await page.getByRole('textbox', { name: 'Geheime sleutel' }).fill('b');
  await page.getByRole('textbox', { name: 'Vergelijk met een handtekening' }).fill('00');
  await expect(page.getByTestId('hmac-verdict')).toContainText('Deze handtekening is 1 bytes');
});
