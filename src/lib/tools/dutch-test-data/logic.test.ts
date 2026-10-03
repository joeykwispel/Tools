import { describe, expect, it } from 'vitest';
import { bsnSum, checkBsn, checkIban, checkPostcode, formatIban, makeBsn, makeIban, makePostcode, mod97, type Pick } from './logic';

/** A pick that walks through a list of numbers, so what is made can be predicted. */
const fixed = (...values: number[]): Pick => {
  let i = 0;
  return (below) => values[i++ % values.length] % below;
};
/** A pick that is different every time, but the same in every run. */
const seeded = (seed = 1): Pick => {
  let state = seed;
  return (below) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % below;
  };
};

describe('BSN', () => {
  it('passes a number that passes the 11-test', () => {
    expect(checkBsn('111222333')).toEqual({ ok: true, bsn: '111222333' });
    expect(checkBsn('123456782')).toEqual({ ok: true, bsn: '123456782' });
    expect(checkBsn('1234.56.782')).toEqual({ ok: true, bsn: '123456782' });
    expect(checkBsn(' 999 990 019 ')).toEqual({ ok: true, bsn: '999990019' });
    expect(bsnSum('111222333')).toBe(66);
  });

  it('reads eight digits with a zero in front', () => {
    expect(checkBsn('10000008')).toEqual({ ok: true, bsn: '010000008' });
  });

  it('says why a number is not a BSN', () => {
    expect(checkBsn('')).toEqual({ ok: false, error: 'empty' });
    expect(checkBsn('12345678a')).toEqual({ ok: false, error: 'characters' });
    expect(checkBsn('1234567')).toEqual({ ok: false, error: 'length' });
    expect(checkBsn('1234567890')).toEqual({ ok: false, error: 'length' });
    expect(checkBsn('000000000')).toEqual({ ok: false, error: 'zero' });
    expect(checkBsn('123456789')).toEqual({ ok: false, error: 'check' });
    expect(checkBsn('111222334')).toEqual({ ok: false, error: 'check' });
  });

  it('makes numbers that pass, starting with 9999', () => {
    const pick = seeded();
    for (let i = 0; i < 500; i++) {
      const bsn = makeBsn(pick);
      expect(bsn).toMatch(/^9999\d{5}$/);
      expect(checkBsn(bsn), bsn).toEqual({ ok: true, bsn });
    }
    expect(makeBsn(fixed(0))).toBe('999900006');
  });

  it('tries again when the last digit would be 10', () => {
    // 9999 0002 leaves 10, so the next four digits are taken
    expect(bsnSum('999900020') % 11).toBe(10);
    expect(makeBsn(fixed(0, 0, 0, 2, 0, 0, 0, 1))).toBe('999900018');
  });
});

describe('IBAN', () => {
  it('passes an IBAN with the right check digits', () => {
    expect(checkIban('NL91ABNA0417164300')).toEqual({ ok: true, iban: 'NL91 ABNA 0417 1643 00', country: 'NL', bank: 'ABN AMRO' });
    expect(checkIban('nl91 abna 0417 1643 00')).toMatchObject({ ok: true, bank: 'ABN AMRO' });
    expect(checkIban('DE89 3704 0044 0532 0130 00')).toEqual({ ok: true, iban: 'DE89 3704 0044 0532 0130 00', country: 'DE', bank: '' });
    expect(checkIban('GB82 WEST 1234 5698 7654 32')).toMatchObject({ ok: true, country: 'GB' });
    expect(checkIban('BE68 5390 0754 7034')).toMatchObject({ ok: true, country: 'BE' });
  });

  it('works out what is left after dividing by 97', () => {
    expect(mod97('NL91ABNA0417164300')).toBe(1);
    expect(mod97('NL00ABNA0417164300')).toBe(98 - 91);
    expect(formatIban('NL91ABNA0417164300')).toBe('NL91 ABNA 0417 1643 00');
  });

  it('says why something is not an IBAN', () => {
    expect(checkIban('')).toEqual({ ok: false, error: 'empty' });
    expect(checkIban('NL91-ABNA_0417')).toEqual({ ok: false, error: 'characters' });
    expect(checkIban('1234567890123456')).toEqual({ ok: false, error: 'shape' });
    expect(checkIban('NL91ABNA04')).toEqual({ ok: false, error: 'shape' });
    expect(checkIban('NL91ABNA041716430')).toEqual({ ok: false, error: 'length', country: 'NL', expected: 18, length: 17 });
    expect(checkIban('NL91AB1A0417164300')).toEqual({ ok: false, error: 'shape' });
    expect(checkIban('NL92ABNA0417164300')).toEqual({ ok: false, error: 'check' });
    expect(checkIban('NL91ABNA0417164301')).toEqual({ ok: false, error: 'check' });
  });

  it('makes Dutch IBANs that pass', () => {
    const pick = seeded(7);
    for (let i = 0; i < 500; i++) {
      const iban = makeIban(pick);
      expect(iban).toMatch(/^NL\d{2} [A-Z]{4} 0\d{3} \d{4} \d{2}$/);
      expect(checkIban(iban), iban).toMatchObject({ ok: true, country: 'NL' });
    }
    expect(makeIban(fixed(0))).toBe('NL85 ABNA 0000 0000 00');
  });
});

describe('postcode', () => {
  it('passes a postcode of the right shape, and writes it with a space', () => {
    expect(checkPostcode('1012AB')).toEqual({ ok: true, postcode: '1012 AB' });
    expect(checkPostcode(' 9999 xz ')).toEqual({ ok: true, postcode: '9999 XZ' });
    expect(checkPostcode('1000 AA')).toEqual({ ok: true, postcode: '1000 AA' });
  });

  it('says why something is not a postcode', () => {
    expect(checkPostcode('')).toEqual({ ok: false, error: 'empty' });
    expect(checkPostcode('101 AB')).toEqual({ ok: false, error: 'shape' });
    expect(checkPostcode('1012 A')).toEqual({ ok: false, error: 'shape' });
    expect(checkPostcode('1012  AB')).toEqual({ ok: false, error: 'shape' });
    expect(checkPostcode('1012 A1')).toEqual({ ok: false, error: 'shape' });
    expect(checkPostcode('0123 AB')).toEqual({ ok: false, error: 'zero' });
    expect(['1012 SA', '1012 sd', '1012SS'].map(checkPostcode)).toEqual(Array(3).fill({ ok: false, error: 'letters' }));
  });

  it('makes postcodes of the right shape', () => {
    const pick = seeded(3);
    for (let i = 0; i < 500; i++) {
      const postcode = makePostcode(pick);
      expect(checkPostcode(postcode), postcode).toEqual({ ok: true, postcode });
    }
    expect(makePostcode(fixed(0))).toBe('1000 AA');
    // S and A are not given out together, so the next pair is taken
    expect(makePostcode(fixed(18, 0, 18, 1, 500))).toBe('1500 SB');
  });
});
