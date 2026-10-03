import { expect, test, type Page } from '@playwright/test';
import { checkBsn, checkIban, checkPostcode } from '../../src/lib/tools/dutch-test-data/logic';
import { open } from '../helpers';

/** The lines of what was made up for a kind, once they are there. */
async function made(page: Page, kind: string, count: number): Promise<string[]> {
  const output = page.getByTestId(`dutch-${kind}-made`);
  await expect.poll(async () => ((await output.textContent()) ?? '').split('\n').filter(Boolean).length).toBe(count);
  return ((await output.textContent()) ?? '').split('\n');
}

test('Dutch test data makes numbers that pass their own check', async ({ page }) => {
  await open(page, '/dutch-test-data/');
  for (const bsn of await made(page, 'bsn', 5)) expect(checkBsn(bsn), bsn).toMatchObject({ ok: true });
  for (const iban of await made(page, 'iban', 5)) expect(checkIban(iban), iban).toMatchObject({ ok: true, country: 'NL' });
  for (const postcode of await made(page, 'postcode', 5)) expect(checkPostcode(postcode), postcode).toMatchObject({ ok: true });

  await page.getByRole('spinbutton', { name: 'How many' }).fill('12');
  const more = await made(page, 'bsn', 12);
  expect(new Set(more).size).toBeGreaterThan(6);

  // new ones for one kind leave the others as they are
  const ibans = await made(page, 'iban', 12);
  await page.getByRole('region', { name: 'BSN' }).getByRole('button', { name: 'Make new ones' }).click();
  await expect.poll(async () => (await made(page, 'bsn', 12)).join()).not.toBe(more.join());
  expect(await made(page, 'iban', 12)).toEqual(ibans);
});

test('Dutch test data checks a BSN, an IBAN and a postcode', async ({ page }) => {
  await open(page, '/dutch-test-data/');
  const bsn = page.getByRole('textbox', { name: 'BSN to check' });
  const bsnVerdict = page.getByTestId('dutch-bsn-verdict');
  await expect(bsnVerdict).toHaveText('111222333 passes the 11-test.');
  await bsn.fill('123456789');
  await expect(bsnVerdict).toHaveText('This does not pass the 11-test.');
  await bsn.fill('1234');
  await expect(bsnVerdict).toContainText('A BSN has nine digits');

  const iban = page.getByRole('textbox', { name: 'IBAN to check' });
  const ibanVerdict = page.getByTestId('dutch-iban-verdict');
  await expect(ibanVerdict).toHaveText('NL91 ABNA 0417 1643 00 has the right check digits. The bank is ABN AMRO.');
  await iban.fill('nl91abna0417164301');
  await expect(ibanVerdict).toHaveText('The check digits are not right: there is a typo in it.');
  await iban.fill('NL91 ABNA 0417 1643');
  await expect(ibanVerdict).toHaveText('An IBAN of NL has 18 characters; this has 16.');
  await iban.fill('DE89 3704 0044 0532 0130 00');
  await expect(ibanVerdict).toHaveText('DE89 3704 0044 0532 0130 00 has the right check digits.');

  const postcode = page.getByRole('textbox', { name: 'Postcode to check' });
  const postcodeVerdict = page.getByTestId('dutch-postcode-verdict');
  await postcode.fill('3511ss');
  await expect(postcodeVerdict).toHaveText('The letters SA, SD and SS are not used in postcodes.');
  await postcode.fill('3511 lx');
  await expect(postcodeVerdict).toHaveText('3511 LX has the shape of a postcode.');
  await postcode.fill('');
  await expect(postcodeVerdict).toHaveText('Type a postcode.');
});

test('Dutch test data speaks Dutch', async ({ page }) => {
  await open(page, '/nl/dutch-test-data/');
  await expect(page.getByTestId('dutch-bsn-verdict')).toHaveText('111222333 komt door de 11-proef.');
  await page.getByRole('textbox', { name: 'Postcode om te controleren' }).fill('0123 AB');
  await expect(page.getByTestId('dutch-postcode-verdict')).toHaveText('Een postcode begint niet met 0.');
});
