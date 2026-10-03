/**
 * Dutch numbers that have a check built in, to test forms and validation with: the BSN (citizen service number) with
 * its 11-test, the IBAN with its check digits, and the postcode with its shape. Each can be checked and made up.
 */

/** A whole number from 0 up to, but not including, `below`. The page gives one that uses the browser's randomness. */
export type Pick = (below: number) => number;

const digitsOf = (text: string) => text.replace(/[\s.-]/g, '');

export type BsnVerdict = { ok: true; bsn: string } | { ok: false; error: 'empty' | 'characters' | 'length' | 'zero' | 'check' };

/** The sum of the 11-test for a BSN: the digits times 9, 8, 7 … 2, and the last one times -1. A BSN has a sum that 11 divides. */
export const bsnSum = (bsn: string) => [...bsn].reduce((sum, digit, i) => sum + Number(digit) * (i === 8 ? -1 : 9 - i), 0);

/** Checks a BSN: nine digits (eight are read with a zero in front) that pass the 11-test. Spaces and dots are fine. */
export function checkBsn(text: string): BsnVerdict {
  const digits = digitsOf(text);
  if (!digits) return { ok: false, error: 'empty' };
  if (!/^\d+$/.test(digits)) return { ok: false, error: 'characters' };
  if (digits.length !== 8 && digits.length !== 9) return { ok: false, error: 'length' };
  const bsn = digits.padStart(9, '0');
  if (/^0+$/.test(bsn)) return { ok: false, error: 'zero' };
  return bsnSum(bsn) % 11 === 0 ? { ok: true, bsn } : { ok: false, error: 'check' };
}

/**
 * A made-up BSN that passes the 11-test. It starts with 9999, where test numbers are usually put, but nothing here
 * knows which numbers are given out: it may be the number of someone who exists, so it is for test data only.
 */
export function makeBsn(pick: Pick): string {
  for (;;) {
    const start = `9999${Array.from({ length: 4 }, () => pick(10)).join('')}`;
    // the last digit is what is left of the sum of the first eight; 10 is not a digit, so then another start is tried
    const last = bsnSum(`${start}0`) % 11;
    if (last < 10) return start + last;
  }
}

/** How long an IBAN is, per country. */
export const IBAN_LENGTHS: Record<string, number> = {
  NL: 18,
  BE: 16,
  DE: 22,
  FR: 27,
  GB: 22,
  ES: 24,
  IT: 27,
  LU: 20,
  AT: 20,
  CH: 21,
  DK: 18,
  SE: 24,
  NO: 15,
  FI: 18,
  IE: 22,
  PT: 25,
  PL: 28
};

/** The Dutch banks by the four letters in an IBAN. */
export const BANKS: Record<string, string> = {
  ABNA: 'ABN AMRO',
  ASNB: 'ASN Bank',
  BUNQ: 'bunq',
  INGB: 'ING',
  KNAB: 'Knab',
  RABO: 'Rabobank',
  RBRB: 'RegioBank',
  SNSB: 'SNS',
  TRIO: 'Triodos Bank'
};

/** What is left when the number an IBAN stands for is divided by 97: the first four characters go to the end, A is 10, B is 11. */
export function mod97(iban: string): number {
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) for (const digit of String(parseInt(ch, 36))) rest = (rest * 10 + Number(digit)) % 97;
  return rest;
}

/** NL91 ABNA 0417 1643 00 */
export const formatIban = (iban: string) => iban.replace(/(.{4})(?=.)/g, '$1 ');

export type IbanVerdict =
  | { ok: true; iban: string; country: string; /** The name of the bank, for a Dutch IBAN of a bank that is known here */ bank: string }
  | { ok: false; error: 'empty' | 'characters' | 'shape' | 'check' }
  | { ok: false; error: 'length'; country: string; expected: number; length: number };

/** Checks an IBAN of any country: its length where that is known here, the shape of a Dutch one, and the check digits. */
export function checkIban(text: string): IbanVerdict {
  const iban = digitsOf(text).toUpperCase();
  if (!iban) return { ok: false, error: 'empty' };
  if (!/^[A-Z0-9]+$/.test(iban)) return { ok: false, error: 'characters' };
  if (!/^[A-Z]{2}\d{2}/.test(iban) || iban.length < 15 || iban.length > 34) return { ok: false, error: 'shape' };
  const country = iban.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (expected && iban.length !== expected) return { ok: false, error: 'length', country, expected, length: iban.length };
  if (country === 'NL' && !/^NL\d{2}[A-Z]{4}\d{10}$/.test(iban)) return { ok: false, error: 'shape' };
  if (mod97(iban) !== 1) return { ok: false, error: 'check' };
  return { ok: true, iban: formatIban(iban), country, bank: country === 'NL' ? (BANKS[iban.slice(4, 8)] ?? '') : '' };
}

/** A made-up Dutch IBAN with check digits that are right, at one of the banks above. */
export function makeIban(pick: Pick): string {
  const banks = Object.keys(BANKS);
  const account = `${banks[pick(banks.length)]}0${Array.from({ length: 9 }, () => pick(10)).join('')}`;
  const check = 98 - mod97(`NL00${account}`);
  return formatIban(`NL${String(check).padStart(2, '0')}${account}`);
}

/** Letter pairs that are not given out, because of what they stood for. */
const NO_LETTERS = ['SA', 'SD', 'SS'];

export type PostcodeVerdict = { ok: true; postcode: string } | { ok: false; error: 'empty' | 'shape' | 'zero' | 'letters' };

/** Checks the shape of a postcode: four digits that do not start with 0, and two letters that are not SA, SD or SS. */
export function checkPostcode(text: string): PostcodeVerdict {
  const value = text.trim().toUpperCase();
  if (!value) return { ok: false, error: 'empty' };
  const found = /^(\d{4})\s?([A-Z]{2})$/.exec(value);
  if (!found) return { ok: false, error: 'shape' };
  if (found[1].startsWith('0')) return { ok: false, error: 'zero' };
  if (NO_LETTERS.includes(found[2])) return { ok: false, error: 'letters' };
  return { ok: true, postcode: `${found[1]} ${found[2]}` };
}

/** A made-up postcode of the right shape. Whether it is in use, only the postcode table says. */
export function makePostcode(pick: Pick): string {
  for (;;) {
    const letters = String.fromCharCode(65 + pick(26), 65 + pick(26));
    if (!NO_LETTERS.includes(letters)) return `${1000 + pick(9000)} ${letters}`;
  }
}
