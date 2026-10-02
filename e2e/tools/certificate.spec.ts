import { X509Certificate } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { EC_CA, RSA } from '../../src/lib/tools/certificate/fixtures';
import { open } from '../helpers';

test('Certificate decoder shows what is in a certificate', async ({ page }) => {
  await open(page, '/certificate/');
  // the page opens with a sample certificate
  const card = page.getByTestId('certificate');
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('tools.example.test');
  await expect(card).toContainText('C=NL, ST=Gelderland, L=Druten, O=Example B.V., OU=Dev, CN=tools.example.test, emailAddress=dev@example.test');
  await expect(card).toContainText('self-signed');
  await expect(card).toContainText('RSA, 2048 bits');
  await expect(card).toContainText('SHA-256 with RSA');
  await expect(card).toContainText('DNS: *.example.test');
  await expect(card).toContainText('IP: 192.0.2.10');
  await expect(card).toContainText('digitalSignature, keyEncipherment');
  await expect(card).toContainText('serverAuth, clientAuth');
  await expect(page.getByTestId('certificate-sha256')).toHaveText(new X509Certificate(RSA).fingerprint256);
  await expect(page.getByTestId('certificate-quantum')).toContainText('Not quantum-safe');
  // the sample is valid for a year from the day it was made
  await expect(page.getByTestId('certificate-validity')).toHaveText(/Valid for another \d+ days\.|Expired \d+ days ago\./);
});

test('Certificate decoder reads a chain, and explains what is not a certificate', async ({ page }) => {
  await open(page, '/certificate/');
  const input = page.getByRole('textbox', { name: 'Certificate (PEM)' });
  await input.fill(`${RSA}\n${EC_CA}`);
  const cards = page.getByTestId('certificate');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(1).getByRole('heading', { level: 2 })).toContainText('Certificate 2');
  await expect(cards.nth(1).getByRole('heading', { level: 2 })).toContainText('Example Root CA');
  await expect(cards.nth(1)).toContainText('ECDSA, P-256, 256 bits');
  await expect(cards.nth(1)).toContainText('at most 1 authorities below it');

  await input.fill('-----BEGIN PRIVATE KEY-----\nMIIBVQ==\n-----END PRIVATE KEY-----');
  await expect(page.getByRole('alert')).toContainText('This is a private key (PRIVATE KEY). It is not read or shown.');
  await expect(cards).toHaveCount(0);
  await input.fill('hello');
  await expect(page.getByRole('alert')).toContainText('There is no certificate here');
  await input.fill(RSA.split('\n').slice(0, 10).join('\n') + '\n-----END CERTIFICATE-----');
  await expect(page.getByRole('alert')).toContainText('This is not a complete certificate');
  await input.fill('');
  await expect(page.getByText('Paste a certificate to see what is in it.')).toBeVisible();
});

test('Certificate decoder speaks Dutch', async ({ page }) => {
  await open(page, '/nl/certificate/');
  const card = page.getByTestId('certificate');
  await expect(card).toContainText('Onderwerp');
  await expect(card).toContainText('self-signed: het staat voor zichzelf in');
  await expect(page.getByTestId('certificate-quantum')).toContainText('Niet quantum-safe');
});
