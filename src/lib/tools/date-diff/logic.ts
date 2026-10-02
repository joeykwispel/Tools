/**
 * Counting with dates: the days, weeks, months and working days between two of them, and the date a number of
 * (working) days further. A date is a whole number of days since 1 January 1970: no clock, no time zone, so no
 * summer time to trip over.
 */

export type Day = number;

const MS = 86_400_000;

const at = (year: number, month: number, date: number): Day => {
  const d = new Date(0);
  // setUTCFullYear, because Date.UTC reads the years 0 to 99 as 1900 to 1999
  d.setUTCFullYear(year, month - 1, date);
  return Math.round(d.getTime() / MS);
};
const parts = (day: Day) => {
  const d = new Date(day * MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, date: d.getUTCDate() };
};

/** The days in a month; month 1 is January. */
export const daysInMonth = (year: number, month: number) => parts(at(year, month + 1, 0)).date;

/** Reads 2026-10-02, the way a date field gives it. Null when it is not a date that exists. */
export function parseDay(text: string): Day | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [year, month, date] = match.slice(1).map(Number);
  if (year < 1 || month < 1 || month > 12 || date < 1 || date > daysInMonth(year, month)) return null;
  return at(year, month, date);
}

export function formatDay(day: Day): string {
  const { year, month, date } = parts(day);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
}

/** 0 is Sunday, 6 is Saturday. 1 January 1970 was a Thursday. */
export const weekday = (day: Day) => (((day + 4) % 7) + 7) % 7;
const isWeekend = (day: Day) => weekday(day) === 0 || weekday(day) === 6;

/** Easter Sunday, by the calculation of the Gregorian calendar (Meeus, Jones, Butcher). */
export function easter(year: number): Day {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return at(year, month, date);
}

export type HolidayName =
  'newYear' | 'easter' | 'easterMonday' | 'kingsDay' | 'liberationDay' | 'ascension' | 'pentecost' | 'whitMonday' | 'christmas' | 'boxingDay';
export interface Holiday {
  day: Day;
  name: HolidayName;
}

/**
 * The public holidays of the Netherlands in a year, in order. Liberation Day is there once every five years, the
 * way most collective agreements give the day off. Good Friday is not: it is a working day for most people.
 */
export function dutchHolidays(year: number): Holiday[] {
  const sunday = easter(year);
  // King's Day is 27 April since 2014 and was Queen's Day on 30 April before; on a Sunday it is held the day before
  const kings = at(year, 4, year >= 2014 ? 27 : 30);
  const holidays: Holiday[] = [
    { day: at(year, 1, 1), name: 'newYear' },
    { day: sunday, name: 'easter' },
    { day: sunday + 1, name: 'easterMonday' },
    { day: weekday(kings) === 0 ? kings - 1 : kings, name: 'kingsDay' },
    ...(year % 5 === 0 ? [{ day: at(year, 5, 5), name: 'liberationDay' as const }] : []),
    { day: sunday + 39, name: 'ascension' },
    { day: sunday + 49, name: 'pentecost' },
    { day: sunday + 50, name: 'whitMonday' },
    { day: at(year, 12, 25), name: 'christmas' },
    { day: at(year, 12, 26), name: 'boxingDay' }
  ];
  return holidays.sort((a, b) => a.day - b.day);
}

/** The public holidays from `from` up to, not including, `to` that fall on a Monday to Friday. */
export function holidaysBetween(from: Day, to: Day): Holiday[] {
  const out: Holiday[] = [];
  const seen = new Set<Day>();
  for (let year = parts(from).year; year <= parts(to).year; year++) {
    for (const holiday of dutchHolidays(year)) {
      // two on one day (Ascension on 5 May, in 2005) are one day off
      if (holiday.day < from || holiday.day >= to || isWeekend(holiday.day) || seen.has(holiday.day)) continue;
      seen.add(holiday.day);
      out.push(holiday);
    }
  }
  return out;
}

/** A date a number of months further, on the same day of the month, or on the last day when the month is too short. */
export function addMonths(day: Day, months: number): Day {
  const { year, month, date } = parts(day);
  const index = year * 12 + (month - 1) + months;
  const [toYear, toMonth] = [Math.floor(index / 12), (((index % 12) + 12) % 12) + 1];
  return at(toYear, toMonth, Math.min(date, daysInMonth(toYear, toMonth)));
}

export interface Difference {
  /** The second date is before the first: everything is counted from the second to the first */
  backwards: boolean;
  days: number;
  /** The same days as whole weeks and what is left */
  weeks: number;
  weekDays: number;
  /** The same days as years, months and what is left, the way a calendar counts */
  calendar: { years: number; months: number; days: number };
  /** Mondays to Fridays, without the holidays when those are skipped */
  working: number;
  weekend: number;
  /** The holidays that were skipped: those on a Monday to Friday */
  holidays: Holiday[];
}

export interface Options {
  /** Count the last day too: 1 to 3 January is then three days and not two */
  includeEnd?: boolean;
  /** Take the Dutch public holidays off the working days */
  skipHolidays?: boolean;
}

/** What lies between two dates. The first day counts, the last does not, unless `includeEnd` says so. */
export function difference(first: Day, second: Day, { includeEnd = false, skipHolidays = false }: Options = {}): Difference {
  const backwards = second < first;
  const from = backwards ? second : first;
  const to = (backwards ? first : second) + (includeEnd ? 1 : 0);
  const days = to - from;

  const { year: y1, month: m1 } = parts(from);
  const { year: y2, month: m2 } = parts(to);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (addMonths(from, months) > to) months--;

  // whole weeks have five working days each; only the days left over are looked at one by one
  const weeks = Math.floor(days / 7);
  let weekdays = weeks * 5;
  for (let day = from + weeks * 7; day < to; day++) if (!isWeekend(day)) weekdays++;
  const holidays = skipHolidays ? holidaysBetween(from, to) : [];

  return {
    backwards,
    days,
    weeks,
    weekDays: days % 7,
    calendar: { years: Math.floor(months / 12), months: months % 12, days: to - addMonths(from, months) },
    working: weekdays - holidays.length,
    weekend: days - weekdays,
    holidays
  };
}

export const UNITS = ['days', 'workingDays', 'weeks', 'months', 'years'] as const;
export type Unit = (typeof UNITS)[number];

/** The most working days that are stepped through one by one. */
export const MAX_WORKING = 100_000;

/**
 * The date an amount further (or back, with a negative amount). Working days step over weekends, and over the
 * Dutch public holidays when asked: one working day after a Friday is the Monday.
 */
export function add(start: Day, amount: number, unit: Unit, skipHolidays = false): Day {
  if (unit === 'days') return start + amount;
  if (unit === 'weeks') return start + amount * 7;
  if (unit === 'months') return addMonths(start, amount);
  if (unit === 'years') return addMonths(start, amount * 12);

  const step = Math.sign(amount);
  const free = new Map<number, Set<Day>>();
  const isHoliday = (day: Day) => {
    if (!skipHolidays) return false;
    const { year } = parts(day);
    if (!free.has(year)) free.set(year, new Set(dutchHolidays(year).map((holiday) => holiday.day)));
    return free.get(year)!.has(day);
  };
  let day = start;
  for (let left = Math.min(Math.abs(amount), MAX_WORKING); left > 0;) {
    day += step;
    if (!isWeekend(day) && !isHoliday(day)) left--;
  }
  return day;
}
