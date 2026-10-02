import { describe, expect, it } from 'vitest';
import { compact, describe as explain, next, parse, type FieldName } from './logic';
import text from './text';

const values = (expression: string, field: FieldName) => {
  const cron = parse(expression);
  if (!cron.ok) throw new Error(JSON.stringify(cron.error));
  return cron.fields[field].values;
};
const error = (expression: string) => {
  const cron = parse(expression);
  return cron.ok ? null : cron.error;
};
const fields = (expression: string) => {
  const cron = parse(expression);
  if (!cron.ok) throw new Error(JSON.stringify(cron.error));
  return cron.fields;
};
const iso = (moments: number[]) => moments.map((ms) => new Date(ms).toISOString().slice(0, 16) + 'Z');

describe('parse', () => {
  it('reads stars, values, lists, ranges and steps', () => {
    expect(values('* * * * *', 'minute')).toHaveLength(60);
    expect(values('* * * * *', 'hour')).toHaveLength(24);
    expect(values('* * * * *', 'dayOfMonth')).toHaveLength(31);
    expect(values('* * * * *', 'month')).toHaveLength(12);
    expect(values('* * * * *', 'dayOfWeek')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(values('5 * * * *', 'minute')).toEqual([5]);
    expect(values('0,30,15 * * * *', 'minute')).toEqual([0, 15, 30]);
    expect(values('* 9-17 * * *', 'hour')).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(values('*/15 * * * *', 'minute')).toEqual([0, 15, 30, 45]);
    expect(values('10-30/10 * * * *', 'minute')).toEqual([10, 20, 30]);
    expect(values('5/15 * * * *', 'minute')).toEqual([5, 20, 35, 50]);
    expect(values('0 0 1,15-17,*/10 * *', 'dayOfMonth')).toEqual([1, 11, 15, 16, 17, 21, 31]);
  });

  it('reads the names of months and days, in any case', () => {
    expect(values('0 0 * JAN,jun-Aug *', 'month')).toEqual([1, 6, 7, 8]);
    expect(values('0 0 * * mon-FRI', 'dayOfWeek')).toEqual([1, 2, 3, 4, 5]);
    expect(values('0 0 * * sun,wed', 'dayOfWeek')).toEqual([0, 3]);
  });

  it('takes 7 for Sunday too', () => {
    expect(values('0 0 * * 7', 'dayOfWeek')).toEqual([0]);
    expect(values('0 0 * * 5-7', 'dayOfWeek')).toEqual([0, 5, 6]);
    expect(values('0 0 * * 0-7', 'dayOfWeek')).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('knows whether a field starts with a star', () => {
    const cron = fields('*/5 0 ? * 1');
    expect([cron.minute.star, cron.hour.star, cron.dayOfMonth.star, cron.month.star, cron.dayOfWeek.star]).toEqual([true, false, true, true, false]);
    expect(cron.minute.text).toBe('*/5');
  });

  it('writes out the shorthand', () => {
    expect(parse('@daily')).toMatchObject({ ok: true, expanded: '0 0 * * *' });
    expect(parse('@Hourly')).toMatchObject({ ok: true, expanded: '0 * * * *' });
    expect(parse(' @weekly ')).toMatchObject({ ok: true, expanded: '0 0 * * 0' });
    expect(parse('@yearly')).toMatchObject({ expanded: '0 0 1 1 *' });
    expect(parse('0 0 * * *')).not.toHaveProperty('expanded');
    expect(error('@reboot')).toEqual({ kind: 'reboot' });
    expect(error('@sometimes')).toEqual({ kind: 'macro', token: '@sometimes' });
  });

  it('says what is wrong', () => {
    expect(error('')).toEqual({ kind: 'fields', count: 0 });
    expect(error('* * * *')).toEqual({ kind: 'fields', count: 4 });
    expect(error('0 0 12 * * ?')).toEqual({ kind: 'fields', count: 6 });
    expect(error('60 * * * *')).toEqual({ kind: 'value', field: 'minute', token: '60', min: 0, max: 59 });
    expect(error('* 24 * * *')).toEqual({ kind: 'value', field: 'hour', token: '24', min: 0, max: 23 });
    expect(error('* * 0 * *')).toEqual({ kind: 'value', field: 'dayOfMonth', token: '0', min: 1, max: 31 });
    expect(error('* * * 13 *')).toEqual({ kind: 'value', field: 'month', token: '13', min: 1, max: 12 });
    expect(error('* * * * 8')).toEqual({ kind: 'value', field: 'dayOfWeek', token: '8', min: 0, max: 7 });
    expect(error('* * * * 1,9-10')).toEqual({ kind: 'value', field: 'dayOfWeek', token: '9-10', min: 0, max: 7 });
    expect(error('30-10 * * * *')).toEqual({ kind: 'range', field: 'minute', token: '30-10' });
    expect(error('*/0 * * * *')).toEqual({ kind: 'step', field: 'minute', token: '*/0' });
    expect(error('a * * * *')).toEqual({ kind: 'syntax', field: 'minute', token: 'a' });
    expect(error('* * * foo *')).toEqual({ kind: 'syntax', field: 'month', token: 'foo' });
    expect(error('1,,2 * * * *')).toEqual({ kind: 'syntax', field: 'minute', token: '' });
    expect(error('*-5 * * * *')).toEqual({ kind: 'syntax', field: 'minute', token: '*-5' });
    expect(error('? * * * *')).toEqual({ kind: 'syntax', field: 'minute', token: '?' });
    expect(error('* * * * mon-jan')).toEqual({ kind: 'syntax', field: 'dayOfWeek', token: 'mon-jan' });
  });

  it('says so when it is the cron of another scheduler', () => {
    expect(error('0 0 L * *')).toEqual({ kind: 'unsupported', field: 'dayOfMonth', token: 'L' });
    expect(error('0 0 15W * *')).toEqual({ kind: 'unsupported', field: 'dayOfMonth', token: '15W' });
    expect(error('0 0 * * 5#2')).toEqual({ kind: 'unsupported', field: 'dayOfWeek', token: '5#2' });
    expect(error('0 0 * * 5L')).toEqual({ kind: 'unsupported', field: 'dayOfWeek', token: '5L' });
    // names with those letters in them are fine
    expect(values('0 0 * jul wed', 'month')).toEqual([7]);
  });
});

describe('compact', () => {
  it('writes runs of three or more as a range', () => {
    expect(compact([0, 15, 30, 45])).toBe('0, 15, 30, 45');
    expect(compact([1, 2, 3, 4, 5])).toBe('1-5');
    expect(compact([0, 1, 5, 6, 7, 9])).toBe('0, 1, 5-7, 9');
    expect(compact([3])).toBe('3');
    expect(compact([])).toBe('');
  });
});

describe('next', () => {
  // Friday 2 October 2026, 10:07:30 UTC
  const FROM = Date.UTC(2026, 9, 2, 10, 7, 30);

  it('finds the next runs in UTC', () => {
    expect(iso(next(fields('* * * * *'), FROM, 'UTC', 3))).toEqual(['2026-10-02T10:08Z', '2026-10-02T10:09Z', '2026-10-02T10:10Z']);
    expect(iso(next(fields('*/15 * * * *'), FROM, 'UTC', 3))).toEqual(['2026-10-02T10:15Z', '2026-10-02T10:30Z', '2026-10-02T10:45Z']);
    expect(iso(next(fields('0 9 * * 1-5'), FROM, 'UTC', 3))).toEqual(['2026-10-05T09:00Z', '2026-10-06T09:00Z', '2026-10-07T09:00Z']);
    expect(iso(next(fields('30 2 1 * *'), FROM, 'UTC', 2))).toEqual(['2026-11-01T02:30Z', '2026-12-01T02:30Z']);
    expect(iso(next(fields('0 0 1 1 *'), FROM, 'UTC', 2))).toEqual(['2027-01-01T00:00Z', '2028-01-01T00:00Z']);
  });

  it('does not count the minute it is asked in', () => {
    const exact = Date.UTC(2026, 9, 2, 10, 0, 0);
    expect(iso(next(fields('0 10 * * *'), exact, 'UTC', 1))).toEqual(['2026-10-03T10:00Z']);
    expect(iso(next(fields('0 10 * * *'), exact - 1, 'UTC', 1))).toEqual(['2026-10-02T10:00Z']);
  });

  it('runs on a day that fits either day field when both are given', () => {
    // the 13th, and every Friday
    expect(iso(next(fields('0 0 13 * 5'), FROM, 'UTC', 4))).toEqual(['2026-10-09T00:00Z', '2026-10-13T00:00Z', '2026-10-16T00:00Z', '2026-10-23T00:00Z']);
    // with a star in front, both have to fit: Mondays on an odd day of the month
    expect(iso(next(fields('0 0 */2 * 1'), FROM, 'UTC', 3))).toEqual(['2026-10-05T00:00Z', '2026-10-19T00:00Z', '2026-11-09T00:00Z']);
  });

  it('finds 29 February, and gives up on a date that never comes', () => {
    expect(iso(next(fields('0 0 29 2 *'), FROM, 'UTC', 2))).toEqual(['2028-02-29T00:00Z', '2032-02-29T00:00Z']);
    expect(next(fields('0 0 30 2 *'), FROM, 'UTC', 2)).toEqual([]);
    expect(next(fields('0 0 31 4,6,9,11 *'), FROM)).toEqual([]);
  });

  it('follows the clock of a time zone', () => {
    // 09:00 in Amsterdam is 07:00 UTC in summer and 08:00 in winter; the clock goes back on 25 October 2026
    expect(iso(next(fields('0 9 * * *'), Date.UTC(2026, 9, 23, 12), 'Europe/Amsterdam', 3))).toEqual([
      '2026-10-24T07:00Z',
      '2026-10-25T08:00Z',
      '2026-10-26T08:00Z'
    ]);
    expect(iso(next(fields('0 0 * * *'), FROM, 'Asia/Tokyo', 2))).toEqual(['2026-10-02T15:00Z', '2026-10-03T15:00Z']);
  });

  it('skips a time the clock skips, and runs a time that comes twice once', () => {
    // 28 March 2027: in Amsterdam 02:00 becomes 03:00, so 02:30 does not exist that day
    expect(iso(next(fields('30 2 * * *'), Date.UTC(2027, 2, 26, 12), 'Europe/Amsterdam', 3))).toEqual([
      '2027-03-27T01:30Z',
      '2027-03-29T00:30Z',
      '2027-03-30T00:30Z'
    ]);
    // 25 October 2026: 02:30 comes twice
    const twice = next(fields('30 2 * * *'), Date.UTC(2026, 9, 24, 12), 'Europe/Amsterdam', 2);
    expect(twice).toHaveLength(2);
    expect(new Date(twice[0]).toISOString().slice(0, 10)).toBe('2026-10-25');
    expect(iso([twice[1]])).toEqual(['2026-10-26T01:30Z']);
  });
});

describe('describe', () => {
  const en = (expression: string) => explain(fields(expression), text.en.words, 'en-GB');
  const nl = (expression: string) => explain(fields(expression), text.nl.words, 'nl-NL');

  it('says when it runs', () => {
    expect(en('* * * * *')).toBe('Every minute.');
    expect(en('*/5 * * * *')).toBe('Every 5 minutes.');
    expect(en('0 * * * *')).toBe('On the hour, every hour.');
    expect(en('15 * * * *')).toBe('At minute 15 of the hour, every hour.');
    expect(en('0 4 * * *')).toBe('At 04:00, every day.');
    expect(en('5 4 * * sun')).toBe('At 04:05, on Sunday.');
    expect(en('0 9 * * 1-5')).toBe('At 09:00, from Monday to Friday.');
    expect(en('0 9,12,18 * * *')).toBe('At 09:00, 12:00 and 18:00, every day.');
    expect(en('0,30 9 * * *')).toBe('At 09:00 and 09:30, every day.');
    expect(en('0 */2 * * *')).toBe('On the hour, every 2 hours.');
    expect(en('15 9-17 * * *')).toBe('At minute 15 of the hour, from 09:00 to 17:59.');
    expect(en('* 9 * * *')).toBe('Every minute, from 09:00 to 09:59.');
    expect(en('*/15 9-17 * * 1-5')).toBe('Every 15 minutes, from 09:00 to 17:59, from Monday to Friday.');
    expect(en('0-10 * * * *')).toBe('Every minute from minute 0 to 10 of the hour, every hour.');
    expect(en('1,2,50 6,7,20 * * *')).toBe('At minutes 1, 2 and 50 of the hour, in the hours that start at 06:00, 07:00 and 20:00.');
  });

  it('says on which days and in which months', () => {
    expect(en('30 2 1 * *')).toBe('At 02:30, on day 1 of the month.');
    expect(en('0 0 1,15 * *')).toBe('At 00:00, on days 1 and 15 of the month.');
    expect(en('0 0 1-7 * *')).toBe('At 00:00, on days 1 to 7 of the month.');
    expect(en('0 0 */2 * *')).toBe('At 00:00, every 2 days of the month, starting on day 1.');
    expect(en('0 0 1 1 *')).toBe('At 00:00, on day 1 of the month, in January.');
    expect(en('0 0 1 */3 *')).toBe('At 00:00, on day 1 of the month, in January, April, July and October.');
    expect(en('0 0 * 6-8 *')).toBe('At 00:00, every day, from June to August.');
    expect(en('0 0 * * 0,6')).toBe('At 00:00, on Saturday and Sunday.');
    expect(en('0 0 * * 5-7')).toBe('At 00:00, from Friday to Sunday.');
    expect(en('@weekly')).toBe('At 00:00, on Sunday.');
  });

  it('says which rule holds when both day fields are given', () => {
    expect(en('0 0 13 * 5')).toBe('At 00:00, on day 13 of the month and also on Friday.');
    expect(en('0 0 */2 * 1')).toBe('At 00:00, every 2 days of the month, starting on day 1 but only on Monday.');
  });

  it('speaks Dutch', () => {
    expect(nl('* * * * *')).toBe('Elke minuut.');
    expect(nl('*/5 * * * *')).toBe('Elke 5 minuten.');
    expect(nl('0 22 * * 1-5')).toBe('Om 22:00, van maandag tot en met vrijdag.');
    expect(nl('0 9,12,18 * * *')).toBe('Om 09:00, 12:00 en 18:00, elke dag.');
    expect(nl('0 */2 * * *')).toBe('Op het hele uur, elke 2 uur.');
    expect(nl('15 9-17 * * *')).toBe('Op minuut 15 van het uur, van 09:00 tot en met 17:59.');
    expect(nl('0 0 1 1 *')).toBe('Om 00:00, op dag 1 van de maand, in januari.');
    expect(nl('0 0 13 * 5')).toBe('Om 00:00, op dag 13 van de maand en ook op vrijdag.');
  });
});
