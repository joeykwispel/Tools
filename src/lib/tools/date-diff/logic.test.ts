import { describe, expect, it } from 'vitest';
import { add, addMonths, daysInMonth, difference, dutchHolidays, easter, formatDay, holidaysBetween, parseDay, weekday } from './logic';

const day = (text: string) => {
  const parsed = parseDay(text);
  if (parsed === null) throw new Error(`not a date: ${text}`);
  return parsed;
};
const between = (from: string, to: string, options = {}) => difference(day(from), day(to), options);

describe('parseDay and formatDay', () => {
  it('counts days from 1 January 1970', () => {
    expect(parseDay('1970-01-01')).toBe(0);
    expect(parseDay('1970-01-02')).toBe(1);
    expect(parseDay('1969-12-31')).toBe(-1);
    expect(parseDay('2026-10-02')).toBe(Date.UTC(2026, 9, 2) / 86_400_000);
    expect(parseDay(' 2000-02-29 ')).toBe(Date.UTC(2000, 1, 29) / 86_400_000);
  });

  it('refuses a date that does not exist', () => {
    for (const text of ['', '2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '1900-02-29', '0000-01-01', '2026-1-1', '02-10-2026', 'today']) {
      expect(parseDay(text), text).toBeNull();
    }
  });

  it('writes a date back, also from the first centuries', () => {
    for (const text of ['1970-01-01', '2026-10-02', '2024-02-29', '1600-12-31', '0099-03-01', '0001-01-01', '9999-12-31']) {
      expect(formatDay(day(text)), text).toBe(text);
    }
  });

  it('knows the day of the week and the length of a month', () => {
    expect(weekday(0)).toBe(4);
    expect(weekday(day('2026-10-02'))).toBe(5);
    expect(weekday(day('2026-10-04'))).toBe(0);
    expect(weekday(day('1969-12-28'))).toBe(0);
    expect([1, 2, 4, 12].map((month) => daysInMonth(2026, month))).toEqual([31, 28, 30, 31]);
    expect([2024, 2000, 1900].map((year) => daysInMonth(year, 2))).toEqual([29, 29, 28]);
  });
});

describe('holidays', () => {
  it('finds Easter', () => {
    const known = { 1961: '04-02', 2000: '04-23', 2008: '03-23', 2011: '04-24', 2019: '04-21', 2024: '03-31', 2025: '04-20', 2026: '04-05', 2038: '04-25' };
    for (const [year, date] of Object.entries(known)) expect(formatDay(easter(Number(year))), year).toBe(`${year}-${date}`);
  });

  it('lists the Dutch public holidays of a year', () => {
    expect(dutchHolidays(2026).map(({ day, name }) => `${formatDay(day)} ${name}`)).toEqual([
      '2026-01-01 newYear',
      '2026-04-05 easter',
      '2026-04-06 easterMonday',
      '2026-04-27 kingsDay',
      '2026-05-14 ascension',
      '2026-05-24 pentecost',
      '2026-05-25 whitMonday',
      '2026-12-25 christmas',
      '2026-12-26 boxingDay'
    ]);
  });

  it('has Liberation Day once every five years', () => {
    const liberation = (year: number) => dutchHolidays(year).find(({ name }) => name === 'liberationDay');
    expect(formatDay(liberation(2025)!.day)).toBe('2025-05-05');
    expect(liberation(2030)).toBeDefined();
    expect(liberation(2026)).toBeUndefined();
  });

  it('moves King’s Day off a Sunday, and knows Queen’s Day', () => {
    const kings = (year: number) => formatDay(dutchHolidays(year).find(({ name }) => name === 'kingsDay')!.day);
    expect(kings(2026)).toBe('2026-04-27');
    // 27 April 2025 was a Sunday
    expect(kings(2025)).toBe('2025-04-26');
    expect(kings(2013)).toBe('2013-04-30');
  });

  it('gives the holidays on a working day in a period', () => {
    // Boxing Day 2026 is a Saturday, Easter and Pentecost are Sundays
    expect(holidaysBetween(day('2026-01-01'), day('2027-01-01')).map(({ name }) => name)).toEqual([
      'newYear',
      'easterMonday',
      'kingsDay',
      'ascension',
      'whitMonday',
      'christmas'
    ]);
    // the last day does not count
    expect(holidaysBetween(day('2026-12-24'), day('2026-12-25'))).toEqual([]);
    expect(holidaysBetween(day('2026-12-25'), day('2026-12-26')).map(({ name }) => name)).toEqual(['christmas']);
    // Ascension Day fell on Liberation Day in 2005: one day off
    expect(holidaysBetween(day('2005-05-01'), day('2005-05-10'))).toHaveLength(1);
  });
});

describe('difference', () => {
  it('counts days, weeks and working days', () => {
    // Friday to the Friday after
    expect(between('2026-10-02', '2026-10-09')).toEqual({
      backwards: false,
      days: 7,
      weeks: 1,
      weekDays: 0,
      calendar: { years: 0, months: 0, days: 7 },
      working: 5,
      weekend: 2,
      holidays: []
    });
    expect(between('2026-10-02', '2026-10-02')).toMatchObject({ days: 0, working: 0, weekend: 0, calendar: { years: 0, months: 0, days: 0 } });
    // Friday to Monday: the Friday, and a weekend
    expect(between('2026-10-02', '2026-10-05')).toMatchObject({ days: 3, weeks: 0, weekDays: 3, working: 1, weekend: 2 });
    // Saturday to Sunday
    expect(between('2026-10-03', '2026-10-04')).toMatchObject({ days: 1, working: 0, weekend: 1 });
  });

  it('counts the last day too when asked', () => {
    expect(between('2026-10-02', '2026-10-09', { includeEnd: true })).toMatchObject({ days: 8, weeks: 1, weekDays: 1, working: 6, weekend: 2 });
    expect(between('2026-10-02', '2026-10-02', { includeEnd: true })).toMatchObject({ days: 1, working: 1 });
    expect(between('2026-01-01', '2026-12-31', { includeEnd: true })).toMatchObject({ days: 365, calendar: { years: 1, months: 0, days: 0 } });
  });

  it('counts a whole year', () => {
    // 2026 starts on a Thursday: 52 weeks and that Thursday
    expect(between('2026-01-01', '2027-01-01')).toMatchObject({
      days: 365,
      weeks: 52,
      weekDays: 1,
      working: 261,
      weekend: 104,
      calendar: { years: 1, months: 0, days: 0 }
    });
    expect(between('2024-01-01', '2025-01-01')).toMatchObject({ days: 366, working: 262, weekend: 104 });
  });

  it('takes the public holidays off the working days', () => {
    const year = between('2026-01-01', '2027-01-01', { skipHolidays: true });
    expect(year.working).toBe(255);
    expect(year.weekend).toBe(104);
    expect(year.holidays).toHaveLength(6);
    expect(between('2026-12-21', '2026-12-28', { skipHolidays: true })).toMatchObject({ working: 4, holidays: [{ name: 'christmas' }] });
  });

  it('counts the way a calendar does', () => {
    expect(between('2026-10-02', '2027-01-05').calendar).toEqual({ years: 0, months: 3, days: 3 });
    expect(between('1990-05-17', '2026-10-02').calendar).toEqual({ years: 36, months: 4, days: 15 });
    // from the end of a month: February is too short for a 31st
    expect(between('2024-01-31', '2024-03-01').calendar).toEqual({ years: 0, months: 1, days: 1 });
    expect(between('2026-01-31', '2026-02-28').calendar).toEqual({ years: 0, months: 1, days: 0 });
    expect(between('2020-02-29', '2021-02-28').calendar).toEqual({ years: 1, months: 0, days: 0 });
    expect(between('2026-01-15', '2026-02-14').calendar).toEqual({ years: 0, months: 0, days: 30 });
  });

  it('counts back when the second date is the earlier one', () => {
    expect(between('2026-10-09', '2026-10-02')).toMatchObject({ backwards: true, days: 7, working: 5 });
    expect(between('2026-10-09', '2026-10-02', { includeEnd: true })).toMatchObject({ backwards: true, days: 8, working: 6 });
  });

  it('counts across centuries without looking at every day', () => {
    const long = between('0001-01-01', '9999-12-31', { skipHolidays: true });
    expect(long.days).toBe(3_652_058);
    expect(long.working + long.weekend + long.holidays.length).toBe(long.days);
  });
});

describe('add', () => {
  const plus = (start: string, amount: number, unit: Parameters<typeof add>[2], holidays = false) => formatDay(add(day(start), amount, unit, holidays));

  it('adds days and weeks', () => {
    expect(plus('2026-10-02', 30, 'days')).toBe('2026-11-01');
    expect(plus('2026-10-02', -2, 'days')).toBe('2026-09-30');
    expect(plus('2026-10-02', 2, 'weeks')).toBe('2026-10-16');
    expect(plus('2026-10-02', 0, 'days')).toBe('2026-10-02');
  });

  it('adds months and years, ending on the last day when the month is too short', () => {
    expect(plus('2026-01-31', 1, 'months')).toBe('2026-02-28');
    expect(plus('2026-01-31', 2, 'months')).toBe('2026-03-31');
    expect(plus('2026-10-02', 3, 'months')).toBe('2027-01-02');
    expect(plus('2026-03-31', -1, 'months')).toBe('2026-02-28');
    expect(plus('2024-02-29', 1, 'years')).toBe('2025-02-28');
    expect(plus('2024-02-29', 4, 'years')).toBe('2028-02-29');
    expect(formatDay(addMonths(day('2026-01-15'), -13))).toBe('2024-12-15');
  });

  it('steps over the weekend with working days', () => {
    // from a Friday
    expect(plus('2026-10-02', 1, 'workingDays')).toBe('2026-10-05');
    expect(plus('2026-10-02', 5, 'workingDays')).toBe('2026-10-09');
    expect(plus('2026-10-02', 10, 'workingDays')).toBe('2026-10-16');
    // from a Saturday, and back from a Monday
    expect(plus('2026-10-03', 1, 'workingDays')).toBe('2026-10-05');
    expect(plus('2026-10-05', -1, 'workingDays')).toBe('2026-10-02');
    expect(plus('2026-10-03', 0, 'workingDays')).toBe('2026-10-03');
  });

  it('steps over the public holidays when asked', () => {
    // the Thursday before Christmas, which is a Friday in 2026
    expect(plus('2026-12-24', 1, 'workingDays')).toBe('2026-12-25');
    expect(plus('2026-12-24', 1, 'workingDays', true)).toBe('2026-12-28');
    // back over Easter Monday
    expect(plus('2026-04-07', -1, 'workingDays', true)).toBe('2026-04-03');
  });

  it('agrees with the count of working days', () => {
    const start = day('2026-03-10');
    for (const amount of [1, 7, 23, 260]) {
      const end = add(start, amount, 'workingDays', true);
      // from the day after the start up to and including the end
      expect(difference(start + 1, end + 1, { skipHolidays: true }).working, String(amount)).toBe(amount);
    }
  });
});
