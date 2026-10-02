import { fromWall, offsetMinutes } from '../timestamp/logic';

/**
 * Cron expressions the way crontab reads them: five fields (minute, hour, day of the month, month, day of the
 * week) with lists, ranges, steps and names, plus the @daily kind of shorthand. Reading one, saying in words when
 * it runs, and finding the next times it does.
 */

export const FIELDS = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'] as const;
export type FieldName = (typeof FIELDS)[number];

const LIMITS: Record<FieldName, [min: number, max: number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  // 0 and 7 are both Sunday
  dayOfWeek: [0, 7]
};

const NAMES: Partial<Record<FieldName, string[]>> = {
  month: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  dayOfWeek: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
};

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *'
};

export interface Field {
  /** As it was typed */
  text: string;
  /** Every value it stands for, in order. Sunday is always 0. */
  values: number[];
  /** Starts with a star: for the two day fields that means "not restricted" */
  star: boolean;
}

export type CronError =
  /** Not five fields */
  | { kind: 'fields'; count: number }
  /** @reboot has no time: it runs when the machine starts */
  | { kind: 'reboot' }
  | { kind: 'macro'; token: string }
  /** L, W and # are from Quartz and other schedulers, not from cron */
  | { kind: 'unsupported'; field: FieldName; token: string }
  | { kind: 'syntax'; field: FieldName; token: string }
  | { kind: 'value'; field: FieldName; token: string; min: number; max: number }
  /** A range that runs backwards, like 5-1 */
  | { kind: 'range'; field: FieldName; token: string }
  | { kind: 'step'; field: FieldName; token: string };

export type Cron =
  { ok: true; fields: Record<FieldName, Field>; /** the five fields a shorthand stands for */ expanded?: string } | { ok: false; error: CronError };

function number(token: string, field: FieldName): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  const index = NAMES[field]?.indexOf(token.toLowerCase()) ?? -1;
  if (index < 0) return null;
  return field === 'month' ? index + 1 : index;
}

function parseField(text: string, field: FieldName): { ok: true; field: Field } | { ok: false; error: CronError } {
  const [min, max] = LIMITS[field];
  const values = new Set<number>();
  for (const part of text.split(',')) {
    // "L" (last), "15W" (nearest working day), "5#2" (second Friday), "L-3"
    if (part.includes('#') || /^(\d*[LW]+|L-\d+)$/i.test(part)) return { ok: false, error: { kind: 'unsupported', field, token: part } };
    const match = /^(\*|\?|[a-z0-9]+)(?:-([a-z0-9]+))?(?:\/(\d+))?$/i.exec(part);
    if (!match) return { ok: false, error: { kind: 'syntax', field, token: part } };
    const [, first, last, stepText] = match;
    const step = stepText === undefined ? 1 : Number(stepText);
    if (step < 1) return { ok: false, error: { kind: 'step', field, token: part } };

    let from = min;
    let to = max;
    if (first === '*' || first === '?') {
      // a question mark is Quartz for "any" in the two day fields; a star with a range behind it is nothing
      if (last !== undefined || (first === '?' && field !== 'dayOfMonth' && field !== 'dayOfWeek'))
        return { ok: false, error: { kind: 'syntax', field, token: part } };
      // the star of the week does not count Sunday twice
      if (field === 'dayOfWeek') to = 6;
    } else {
      const start = number(first, field);
      const end = last === undefined ? null : number(last, field);
      if (start === null || (last !== undefined && end === null)) return { ok: false, error: { kind: 'syntax', field, token: part } };
      if (start < min || start > max || (end !== null && (end < min || end > max)))
        return { ok: false, error: { kind: 'value', field, token: part, min, max } };
      if (end !== null && end < start) return { ok: false, error: { kind: 'range', field, token: part } };
      from = start;
      // "5/15" is read as "from 5 on, every 15": what most crons do with it
      to = end ?? (stepText === undefined ? start : max);
    }
    for (let value = from; value <= to; value += step) values.add(field === 'dayOfWeek' ? value % 7 : value);
  }
  return { ok: true, field: { text, values: [...values].sort((a, b) => a - b), star: /^[*?]/.test(text) } };
}

/** Reads a cron expression. */
export function parse(text: string): Cron {
  const trimmed = text.trim();
  let expression = trimmed;
  if (trimmed.startsWith('@')) {
    const macro = trimmed.toLowerCase();
    if (macro === '@reboot') return { ok: false, error: { kind: 'reboot' } };
    if (!MACROS[macro]) return { ok: false, error: { kind: 'macro', token: trimmed } };
    expression = MACROS[macro];
  }
  const parts = expression.split(/\s+/).filter(Boolean);
  if (parts.length !== FIELDS.length) return { ok: false, error: { kind: 'fields', count: parts.length } };
  const fields = {} as Record<FieldName, Field>;
  for (const [index, name] of FIELDS.entries()) {
    const result = parseField(parts[index], name);
    if (!result.ok) return result;
    fields[name] = result.field;
  }
  return expression === trimmed ? { ok: true, fields } : { ok: true, fields, expanded: expression };
}

/** A set of numbers, short: runs of three or more as a range. "0, 15, 30, 45", "1-5", "1-5, 10". */
export function compact(values: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < values.length; i++) {
    let end = i;
    while (values[end + 1] === values[end] + 1) end++;
    if (end - i >= 2) {
      out.push(`${values[i]}-${values[end]}`);
      i = end;
    } else out.push(String(values[i]));
  }
  return out.join(', ');
}

/** How many values a field has when it has all of them. */
export const fullSize = (field: FieldName) => (field === 'dayOfWeek' ? 7 : LIMITS[field][1] - LIMITS[field][0] + 1);

const DAY = 86_400_000;
/** How far ahead to look: far enough for 29 February, which can be eight years away (1896 to 1904, 2096 to 2104). */
const HORIZON_DAYS = 366 * 8 + 2;

/**
 * The next moments this runs after `from`, on a clock in the time zone. A time the clock skips when it goes
 * forward does not exist that day and is not run; a time that comes twice when it goes back is run once.
 */
export function next(fields: Record<FieldName, Field>, from: number, timeZone = 'UTC', count = 5): number[] {
  const out: number[] = [];
  const { minute, hour, dayOfMonth, month, dayOfWeek } = fields;
  // crontab's own rule: with both day fields restricted, a day that fits either one is enough
  const either = !dayOfMonth.star && !dayOfWeek.star;
  const startWall = from + offsetMinutes(from, timeZone) * 60_000;
  const day = new Date(startWall);
  day.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < HORIZON_DAYS && out.length < count; i++, day.setUTCDate(day.getUTCDate() + 1)) {
    if (!month.values.includes(day.getUTCMonth() + 1)) continue;
    const onDate = dayOfMonth.values.includes(day.getUTCDate());
    const onWeekday = dayOfWeek.values.includes(day.getUTCDay());
    if (either ? !(onDate || onWeekday) : !(onDate && onWeekday)) continue;
    for (const h of hour.values) {
      for (const m of minute.values) {
        const wall = day.getTime() + h * 3_600_000 + m * 60_000;
        // long before now: not worth asking the clock (which is slow) about
        if (wall < startWall - DAY / 8) continue;
        const ms = fromWall(wall, timeZone);
        if (ms <= from || ms + offsetMinutes(ms, timeZone) * 60_000 !== wall) continue;
        out.push(ms);
        if (out.length === count) return out;
      }
    }
  }
  return out;
}

/** The words a description is made of: see text.ts. */
export interface Words {
  everyMinute: string;
  everyNMinutes: string;
  at: string;
  onTheHour: string;
  minuteOne: string;
  minuteList: string;
  minuteRange: string;
  everyHour: string;
  everyNHours: string;
  hourRange: string;
  hourList: string;
  everyDay: string;
  on: string;
  fromTo: string;
  domOne: string;
  domRange: string;
  domList: string;
  domStep: string;
  orAlso: string;
  butOnly: string;
  inMonths: string;
}

type Shape =
  | { kind: 'all' }
  | { kind: 'one'; value: number }
  /** Three or more in a row */
  | { kind: 'range'; from: number; to: number }
  /** Three or more, evenly spaced */
  | { kind: 'step'; from: number; to: number; step: number }
  | { kind: 'list' };

function shape(values: number[], size: number): Shape {
  if (values.length === size) return { kind: 'all' };
  if (values.length === 1) return { kind: 'one', value: values[0] };
  const step = values[1] - values[0];
  const even = values.length >= 3 && values.every((value, i) => i === 0 || value - values[i - 1] === step);
  if (!even) return { kind: 'list' };
  const [from, to] = [values[0], values[values.length - 1]];
  return step === 1 ? { kind: 'range', from, to } : { kind: 'step', from, to, step };
}

const fill = (text: string, vars: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (all, key: string) => String(vars[key] ?? all));
const clock = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/** How many separate times of day are still written out one by one: "at 09:00, 12:00 and 18:00". */
const FEW = 4;

/** When this runs, as a sentence. `locale` is for the names of days and months and for "a, b and c". */
export function describe(fields: Record<FieldName, Field>, words: Words, locale: string): string {
  const list = (items: (string | number)[]) => new Intl.ListFormat(locale, { type: 'conjunction' }).format(items.map(String));
  // 1 January 2023 was a Sunday
  const weekday = (value: number) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2023, 0, 1 + value));
  const monthName = (value: number) => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2023, value - 1, 1));

  const minutes = fields.minute.values;
  const hours = fields.hour.values;
  const minuteShape = shape(minutes, 60);
  const hourShape = shape(hours, 24);
  /** Evenly spaced from the start to the end of the field: what a star with a step gives */
  const whole = (s: Shape, size: number): s is Extract<Shape, { kind: 'step' }> => s.kind === 'step' && s.from === 0 && s.to + s.step >= size;

  const parts: string[] = [];
  let exact = false;
  if (minuteShape.kind === 'all' && hourShape.kind === 'all') parts.push(words.everyMinute);
  else if (minutes.length * hours.length <= FEW) {
    exact = true;
    parts.push(fill(words.at, { times: list(hours.flatMap((hour) => minutes.map((minute) => clock(hour, minute)))) }));
  } else {
    if (minuteShape.kind === 'all') parts.push(words.everyMinute);
    else if (whole(minuteShape, 60)) parts.push(fill(words.everyNMinutes, { n: minuteShape.step }));
    else if (minuteShape.kind === 'one') parts.push(minuteShape.value === 0 ? words.onTheHour : fill(words.minuteOne, { minute: minuteShape.value }));
    else if (minuteShape.kind === 'range') parts.push(fill(words.minuteRange, minuteShape));
    else parts.push(fill(words.minuteList, { minutes: list(minutes) }));

    if (hourShape.kind === 'all') {
      if (minuteShape.kind !== 'all' && !whole(minuteShape, 60)) parts.push(words.everyHour);
    } else if (whole(hourShape, 24)) parts.push(fill(words.everyNHours, { n: hourShape.step }));
    else if (hourShape.kind === 'one') parts.push(fill(words.hourRange, { from: clock(hourShape.value, 0), to: clock(hourShape.value, 59) }));
    else if (hourShape.kind === 'range') parts.push(fill(words.hourRange, { from: clock(hourShape.from, 0), to: clock(hourShape.to, 59) }));
    else parts.push(fill(words.hourList, { hours: list(hours.map((hour) => clock(hour, 0))) }));
  }

  // the week from Monday, so that "1-5" is Monday to Friday and "6,0" the weekend
  const weekdays = fields.dayOfWeek.values.map((value) => (value + 6) % 7).sort((a, b) => a - b);
  const weekShape = shape(weekdays, 7);
  const fromMonday = (value: number) => weekday((value + 1) % 7);
  const weekText =
    weekShape.kind === 'all'
      ? ''
      : weekShape.kind === 'range'
        ? fill(words.fromTo, { from: fromMonday(weekShape.from), to: fromMonday(weekShape.to) })
        : fill(words.on, { days: list(weekdays.map(fromMonday)) });

  const dates = fields.dayOfMonth.values;
  const dateShape = shape(dates, 31);
  const dateText =
    dateShape.kind === 'all'
      ? ''
      : dateShape.kind === 'one'
        ? fill(words.domOne, { day: dateShape.value })
        : dateShape.kind === 'range'
          ? fill(words.domRange, dateShape)
          : dateShape.kind === 'step'
            ? fill(words.domStep, { n: dateShape.step, from: dateShape.from })
            : fill(words.domList, { days: list(dates) });

  if (dateText && weekText) parts.push(`${dateText} ${!fields.dayOfMonth.star && !fields.dayOfWeek.star ? words.orAlso : words.butOnly} ${weekText}`);
  else if (dateText || weekText) parts.push(dateText || weekText);
  else if (exact) parts.push(words.everyDay);

  const months = fields.month.values;
  const monthShape = shape(months, 12);
  if (monthShape.kind === 'range') parts.push(fill(words.fromTo, { from: monthName(monthShape.from), to: monthName(monthShape.to) }));
  else if (monthShape.kind !== 'all') parts.push(fill(words.inMonths, { months: list(months.map(monthName)) }));

  const sentence = parts.join(', ');
  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}
