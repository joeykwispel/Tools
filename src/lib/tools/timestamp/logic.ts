/**
 * Unix timestamps and dates: reading either one, and writing a moment in the forms a developer meets. A moment is
 * a number of milliseconds since 1970 in UTC throughout; a time zone only matters when reading or writing a date.
 */

export type Unit = 's' | 'ms' | 'us' | 'ns';
export const UNITS: Unit[] = ['s', 'ms', 'us', 'ns'];

/** The furthest a JavaScript date reaches from 1970: 100 million days. */
const LIMIT = 8.64e15;

/**
 * Which unit a timestamp is in, by how large it is: seconds up to the year 5138, then milliseconds, microseconds
 * and nanoseconds. A timestamp in milliseconds from before March 1973 is too small to tell and is read as seconds.
 */
export function guessUnit(value: number): Unit {
  const size = Math.abs(value);
  return size < 1e11 ? 's' : size < 1e14 ? 'ms' : size < 1e17 ? 'us' : 'ns';
}

export type Read =
  | { ok: true; ms: number; kind: 'timestamp'; unit: Unit }
  | { ok: true; ms: number; kind: 'date'; /** the text said which zone or offset it is in */ zoned: boolean }
  | { ok: false; error: 'empty' | 'invalid' | 'range' };

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const leap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let found = formatters.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    formatters.set(timeZone, found);
  }
  return found;
}

/** Whether the browser knows this time zone, like "Europe/Amsterdam". */
export function knownZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** How many minutes a time zone is ahead of UTC at a moment: 60 for Amsterdam in winter, 120 in summer. */
export function offsetMinutes(ms: number, timeZone: string): number {
  if (timeZone === 'UTC') return 0;
  const parts: Record<string, string> = {};
  for (const { type, value } of formatter(timeZone).formatToParts(ms)) parts[type] = value;
  const year = parts.era === 'BC' ? 1 - Number(parts.year) : Number(parts.year);
  const wall = new Date(0);
  wall.setUTCFullYear(year, Number(parts.month) - 1, Number(parts.day));
  wall.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second));
  return Math.round((wall.getTime() - Math.floor(ms / 1000) * 1000) / 60_000);
}

/** The moment at which a clock in a time zone shows this date and time. `wall` is that date and time as if it were UTC. */
export function fromWall(wall: number, timeZone: string): number {
  const first = wall - offsetMinutes(wall, timeZone) * 60_000;
  // around a change of the clock the first guess can be an hour off: look again at the moment found
  return wall - offsetMinutes(first, timeZone) * 60_000;
}

const NUMBER = /^[+-]?\d+(\.\d+)?$/;
const ISO = /^([+-]?\d{4,6})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

/** To milliseconds, without losing digits of a timestamp in nanoseconds (too large for a JavaScript number). */
function toMs(text: string, unit: Unit): number {
  if (/^[+-]?\d+$/.test(text)) {
    const whole = BigInt(text);
    // rounded down, so a moment before 1970 stays before the next millisecond too
    const floor = (divisor: bigint) => (whole >= 0n || whole % divisor === 0n ? whole / divisor : whole / divisor - 1n);
    return Number(unit === 's' ? whole * 1000n : unit === 'ms' ? whole : floor(unit === 'us' ? 1000n : 1_000_000n));
  }
  return Math.floor(Number(text) * { s: 1000, ms: 1, us: 0.001, ns: 0.000001 }[unit]);
}

/**
 * Reads a timestamp (in `unit`, or guessed from its size) or a date. A date in ISO 8601 without a zone is taken
 * to be in `timeZone`; anything else a browser can read as a date (like the date of an HTTP header) is read too.
 */
export function read(text: string, timeZone = 'UTC', unit: Unit | 'auto' = 'auto'): Read {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'empty' };

  const digits = trimmed.replace(/_/g, '');
  if (NUMBER.test(digits)) {
    const used = unit === 'auto' ? guessUnit(Number(digits)) : unit;
    const ms = toMs(digits, used);
    return Math.abs(ms) <= LIMIT ? { ok: true, ms, kind: 'timestamp', unit: used } : { ok: false, error: 'range' };
  }

  const iso = ISO.exec(trimmed);
  if (iso) {
    const [, y, mo, d, h = '0', mi = '0', s = '0', fraction = '', zone] = iso;
    const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
    const days = month === 2 && leap(year) ? 29 : MONTH_LENGTHS[month - 1];
    // 24:00 is not written here and second 60 does not exist in Unix time: both are refused
    if (month < 1 || month > 12 || day < 1 || day > days || hour > 23 || minute > 59 || second > 59) return { ok: false, error: 'invalid' };
    const wallDate = new Date(0);
    wallDate.setUTCFullYear(year, month - 1, day);
    wallDate.setUTCHours(hour, minute, second, Number(fraction.padEnd(3, '0').slice(0, 3)));
    const wall = wallDate.getTime();
    let ms: number;
    if (!zone) ms = fromWall(wall, timeZone);
    else if (zone.toUpperCase() === 'Z') ms = wall;
    else {
      const [, sign, zh, zm = '0'] = /^([+-])(\d{2}):?(\d{2})?$/.exec(zone)!;
      ms = wall - (sign === '-' ? -1 : 1) * (Number(zh) * 60 + Number(zm)) * 60_000;
    }
    return Math.abs(ms) <= LIMIT ? { ok: true, ms, kind: 'date', zoned: !!zone } : { ok: false, error: 'range' };
  }

  // what is left needs letters to be a date ("14 Nov 2023 22:13:20 GMT"): a browser reads a lot of loose numbers as one too
  if (!/[a-z]/i.test(trimmed)) return { ok: false, error: 'invalid' };
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? { ok: false, error: 'invalid' } : { ok: true, ms, kind: 'date', zoned: /(gmt|utc|z|[+-]\d{2}:?\d{2})\s*(\(.*\))?$/i.test(trimmed) };
}

const pad = (value: number, length = 2) => String(Math.abs(value)).padStart(length, '0');

/** +01:00, -03:30, or Z for UTC itself. */
export function offsetText(minutes: number): string {
  if (minutes === 0) return 'Z';
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

/** ISO 8601 as a clock in the time zone shows it, with its offset: 2023-11-14T23:13:20+01:00. Milliseconds only when there are any. */
export function toIso(ms: number, timeZone = 'UTC'): string {
  const offset = offsetMinutes(ms, timeZone);
  const text = new Date(ms + offset * 60_000).toISOString().slice(0, -1);
  return (text.endsWith('.000') ? text.slice(0, -4) : text) + offsetText(offset);
}

/** The date in a week calendar (ISO 8601): year, week 1 to 53 and day 1 (Monday) to 7, as 2023-W46-2. */
export function toWeekDate(ms: number, timeZone = 'UTC'): string {
  const wall = new Date(ms + offsetMinutes(ms, timeZone) * 60_000);
  const weekday = (wall.getUTCDay() + 6) % 7;
  // the week belongs to the year its Thursday is in
  const thursday = new Date(wall);
  thursday.setUTCDate(wall.getUTCDate() - weekday + 3);
  const year = thursday.getUTCFullYear();
  const newYear = new Date(0);
  newYear.setUTCFullYear(year, 0, 1);
  const week = Math.floor((thursday.getTime() - newYear.getTime()) / 86_400_000 / 7) + 1;
  return `${year}-W${pad(week)}-${weekday + 1}`;
}

/** The date as an HTTP header and an e-mail write it: Tue, 14 Nov 2023 22:13:20 GMT. */
export const toHttp = (ms: number) => new Date(ms).toUTCString();

export const toSeconds = (ms: number) => String(Math.floor(ms / 1000));

/** How far a moment is from now, in the largest unit that says something: "3 hours ago", "in 2 days". */
export function relative(ms: number, now: number, locale: string): string {
  const seconds = (ms - now) / 1000;
  const size = Math.abs(seconds);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
    size < 45
      ? [seconds, 'second']
      : size < 45 * 60
        ? [seconds / 60, 'minute']
        : size < 22 * 3600
          ? [seconds / 3600, 'hour']
          : size < 26 * 86_400
            ? [seconds / 86_400, 'day']
            : size < 320 * 86_400
              ? [seconds / (30.44 * 86_400), 'month']
              : [seconds / (365.25 * 86_400), 'year'];
  // "|| 0" turns the -0 of a moment just past into 0, which is written as "now"
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.sign(amount) * Math.round(Math.abs(amount)) || 0, unit);
}

/** The date and time in words, the way the language writes them, on a clock in the time zone. */
export const inWords = (ms: number, timeZone: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone }).format(ms);
