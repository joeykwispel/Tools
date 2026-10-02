import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Hex / Base32 writes text as hex, with a choice of separator and case', async ({ page }) => {
  await open(page, '/hex/');
  const input = page.getByRole('textbox', { name: 'Text', exact: true });
  const output = page.getByTestId('hex-output');

  await input.fill('Hi é');
  await expect(output).toHaveText('48 69 20 c3 a9');
  await expect(page.getByRole('status')).toHaveText('5 bytes.');
  await page.getByRole('radio', { name: 'a colon' }).check();
  await page.getByRole('checkbox', { name: 'Upper case' }).check();
  await expect(output).toHaveText('48:69:20:C3:A9');
  await page.getByRole('radio', { name: 'nothing' }).check();
  await expect(output).toHaveText('486920C3A9');

  // switching direction carries the result over
  await page.getByRole('radio', { name: 'Hex to text' }).check();
  await expect(page.getByRole('textbox', { name: 'Hex', exact: true })).toHaveValue('486920C3A9');
  await expect(output).toHaveText('Hi é');
});

test('Hex / Base32 reads hex the way it is found, and explains what is not hex', async ({ page }) => {
  await open(page, '/hex/');
  await page.getByRole('radio', { name: 'Hex to text' }).check();
  const input = page.getByRole('textbox', { name: 'Hex', exact: true });

  await input.fill('0x48, 0x69');
  await expect(page.getByTestId('hex-output')).toHaveText('Hi');
  await input.fill('48 6');
  await expect(page.getByRole('status')).toContainText('not complete hex');
  await input.fill('zz');
  await expect(page.getByRole('status')).toContainText('This is not hex');
  // bytes that are not text are shown as bytes
  await input.fill('fffe');
  await expect(page.getByRole('status')).toContainText('These 2 bytes are not text');
  await expect(page.getByTestId('hex-output')).toHaveText('ff fe');
});

test('Hex / Base32 does Base32 both ways', async ({ page }) => {
  await open(page, '/hex/');
  await page.getByRole('radio', { name: 'Base32' }).check();
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('foobar');
  await expect(page.getByTestId('hex-output')).toHaveText('MZXW6YTBOI======');
  await page.getByRole('checkbox', { name: /Pad with =/ }).uncheck();
  await expect(page.getByTestId('hex-output')).toHaveText('MZXW6YTBOI');

  await page.getByRole('radio', { name: 'Base32 to text' }).check();
  const input = page.getByRole('textbox', { name: 'Base32', exact: true });
  await expect(input).toHaveValue('MZXW6YTBOI');
  await expect(page.getByTestId('hex-output')).toHaveText('foobar');
  await input.fill('mzxw 6ytb');
  await expect(page.getByTestId('hex-output')).toHaveText('fooba');
  await input.fill('M1');
  await expect(page.getByRole('status')).toContainText('This is not Base32');

  // the same bytes, rewritten in the other format
  await input.fill('MZXW6===');
  await page.getByRole('radio', { name: 'Hex', exact: true }).check();
  await expect(page.getByRole('textbox', { name: 'Hex', exact: true })).toHaveValue('66 6f 6f');
});

test('Hex / Base32 speaks Dutch', async ({ page }) => {
  await open(page, '/nl/hex/');
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill('Hi');
  await expect(page.getByTestId('hex-output')).toHaveText('48 69');
  await page.getByRole('radio', { name: 'Hex naar tekst' }).check();
  await page.getByRole('textbox', { name: 'Hex', exact: true }).fill('4');
  await expect(page.getByRole('status')).toContainText('Dit is geen volledige hex');
});
