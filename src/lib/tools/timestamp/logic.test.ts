import { describe, expect, it } from 'vitest';
import { fromWall, guessUnit, inWords, knownZone, offsetMinutes, offsetText, read, relative, toHttp, toIso, toSeconds, toWeekDate } from './logic';

/** 2023-11-14T22:13:20Z, a Tuesday: 1 700 000 000 seconds after 1970. */
const MOMENT = 1_700_000_000_000;
const AMSTERDAM = 'Europe/Amsterdam';

describe('read: timestamps', () => {
  it('guesses the unit from the size', () => {
    expect(read('1700000000')).toEqual({ ok: true, ms: MOMENT, kind: 'timestamp', unit: 's' });
    expect(read('1700000000000')).toEqual({ ok: true, ms: MOMENT, kind: 'timestamp', unit: 'ms' });
    expect(read('1700000000000000')).toEqual({ ok: true, ms: MOMENT, kind: 'timestamp', unit: 'us' });
    expect(read('1700000000000000000')).toEqual({ ok: true, ms: MOMENT, kind: 'timestamp', unit: 'ns' });
    expect(read('0')).toEqual({ ok: true, ms: 0, kind: 'timestamp', unit: 's' });
    expect(guessUnit(99_999_999_999)).toBe('s');
    expect(guessUnit(100_000_000_000)).toBe('ms');
    expect(guessUnit(-1_700_000_000_000)).toBe('ms');
  });

  it('takes the unit it is told', () => {
    expect(read('1700000000', 'UTC', 'ms')).toMatchObject({ ms: 1_700_000_000, unit: 'ms' });
    expect(read('1700000000000', 'UTC', 's')).toMatchObject({ ms: 1.7e15, unit: 's' });
  });

  it('reads fractions, a sign, underscores and spaces around', () => {
    expect(read('1700000000.5')).toMatchObject({ ms: MOMENT + 500, unit: 's' });
    expect(read('  1_700_000_000\n')).toMatchObject({ ms: MOMENT });
    expect(read('-1')).toMatchObject({ ms: -1000, unit: 's' });
    expect(read('+86400')).toMatchObject({ ms: 86_400_000 });
  });

  it('rounds down to a whole millisecond, also before 1970', () => {
    expect(read('1700000000000999', 'UTC', 'us')).toMatchObject({ ms: MOMENT });
    expect(read('-1500', 'UTC', 'us')).toMatchObject({ ms: -2 });
    expect(read('-2000', 'UTC', 'us')).toMatchObject({ ms: -2 });
    expect(read('-1', 'UTC', 'ns')).toMatchObject({ ms: -1 });
  });

  it('refuses what is beyond the reach of a date', () => {
    expect(read('8640000000000', 'UTC', 's')).toMatchObject({ ok: true, ms: 8.64e15 });
    expect(read('8640000000001', 'UTC', 's')).toEqual({ ok: false, error: 'range' });
  });
});

describe('read: dates', () => {
  it('reads ISO 8601 with a zone or an offset', () => {
    const expected = { ok: true, ms: MOMENT, kind: 'date', zoned: true };
    expect(read('2023-11-14T22:13:20Z')).toEqual(expected);
    expect(read('2023-11-14t22:13:20z')).toEqual(expected);
    expect(read('2023-11-14T23:13:20+01:00')).toEqual(expected);
    expect(read('2023-11-15T03:43:20+0530')).toEqual(expected);
    expect(read('2023-11-14 14:13:20 -08')).toEqual(expected);
    // the zone in the text wins from the one that is asked for
    expect(read('2023-11-14T22:13:20Z', AMSTERDAM)).toEqual(expected);
  });

  it('takes a date without a zone to be in the zone asked for', () => {
    expect(read('2023-11-14T22:13:20')).toEqual({ ok: true, ms: MOMENT, kind: 'date', zoned: false });
    expect(read('2023-11-14 23:13:20', AMSTERDAM)).toEqual({ ok: true, ms: MOMENT, kind: 'date', zoned: false });
    // summer time: two hours ahead
    expect(read('2023-07-01T12:00', AMSTERDAM)).toMatchObject({ ms: Date.UTC(2023, 6, 1, 10) });
    expect(read('2023-11-14')).toMatchObject({ ms: Date.UTC(2023, 10, 14) });
    expect(read('2023-11-14', AMSTERDAM)).toMatchObject({ ms: Date.UTC(2023, 10, 13, 23) });
  });

  it('reads fractions of a second, down to the millisecond', () => {
    expect(read('2023-11-14T22:13:20.5Z')).toMatchObject({ ms: MOMENT + 500 });
    expect(read('2023-11-14T22:13:20.123456789Z')).toMatchObject({ ms: MOMENT + 123 });
    expect(read('2023-11-14T22:13:20,25Z')).toMatchObject({ ms: MOMENT + 250 });
  });

  it('refuses a date that does not exist', () => {
    for (const text of ['2023-02-29', '2023-13-01', '2023-00-10', '2023-04-31', '2023-11-14T24:00', '2023-11-14T12:60', '2016-12-31T23:59:60Z']) {
      expect(read(text), text).toEqual({ ok: false, error: 'invalid' });
    }
    expect(read('2024-02-29')).toMatchObject({ ok: true, ms: Date.UTC(2024, 1, 29) });
    expect(read('1900-02-29')).toEqual({ ok: false, error: 'invalid' });
    expect(read('2000-02-29')).toMatchObject({ ok: true });
  });

  it('reads the date of an HTTP header or an e-mail', () => {
    expect(read('Tue, 14 Nov 2023 22:13:20 GMT')).toEqual({ ok: true, ms: MOMENT, kind: 'date', zoned: true });
    expect(read('14 Nov 2023 23:13:20 +0100')).toEqual({ ok: true, ms: MOMENT, kind: 'date', zoned: true });
  });

  it('says when there is nothing to read', () => {
    expect(read('')).toEqual({ ok: false, error: 'empty' });
    expect(read('   ')).toEqual({ ok: false, error: 'empty' });
    expect(read('hello')).toEqual({ ok: false, error: 'invalid' });
    expect(read('12:30')).toEqual({ ok: false, error: 'invalid' });
    expect(read('1.2.3')).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('time zones', () => {
  it('knows how far a zone is ahead of UTC at a moment', () => {
    expect(offsetMinutes(MOMENT, 'UTC')).toBe(0);
    expect(offsetMinutes(MOMENT, AMSTERDAM)).toBe(60);
    expect(offsetMinutes(Date.UTC(2023, 6, 1), AMSTERDAM)).toBe(120);
    expect(offsetMinutes(MOMENT, 'Asia/Kolkata')).toBe(330);
    expect(offsetMinutes(MOMENT, 'America/St_Johns')).toBe(-210);
    expect(offsetMinutes(MOMENT + 999, 'America/New_York')).toBe(-300);
    expect(offsetMinutes(-1, AMSTERDAM)).toBe(60);
  });

  it('finds the moment for a date and time on a clock in a zone', () => {
    expect(fromWall(Date.UTC(2023, 6, 1, 12), AMSTERDAM)).toBe(Date.UTC(2023, 6, 1, 10));
    expect(fromWall(Date.UTC(2023, 0, 1, 12), AMSTERDAM)).toBe(Date.UTC(2023, 0, 1, 11));
    // the first minutes after the clock went forward (26 March 2023, 02:00 became 03:00)
    expect(fromWall(Date.UTC(2023, 2, 26, 3, 30), AMSTERDAM)).toBe(Date.UTC(2023, 2, 26, 1, 30));
    expect(fromWall(Date.UTC(2023, 2, 26, 1, 30), AMSTERDAM)).toBe(Date.UTC(2023, 2, 26, 0, 30));
    expect(fromWall(Date.UTC(2023, 10, 14, 12), 'Pacific/Kiritimati')).toBe(Date.UTC(2023, 10, 13, 22));
  });

  it('knows which zones exist', () => {
    expect(knownZone(AMSTERDAM)).toBe(true);
    expect(knownZone('UTC')).toBe(true);
    expect(knownZone('Mars/Olympus_Mons')).toBe(false);
  });

  it('writes an offset', () => {
    expect([0, 60, -210, 345, -720, 840].map(offsetText)).toEqual(['Z', '+01:00', '-03:30', '+05:45', '-12:00', '+14:00']);
  });
});

describe('writing a moment', () => {
  it('writes ISO 8601 in UTC or on a clock in a zone', () => {
    expect(toIso(MOMENT)).toBe('2023-11-14T22:13:20Z');
    expect(toIso(MOMENT, AMSTERDAM)).toBe('2023-11-14T23:13:20+01:00');
    expect(toIso(MOMENT, 'America/St_Johns')).toBe('2023-11-14T18:43:20-03:30');
    expect(toIso(MOMENT + 123)).toBe('2023-11-14T22:13:20.123Z');
    expect(toIso(0)).toBe('1970-01-01T00:00:00Z');
    expect(toIso(-1)).toBe('1969-12-31T23:59:59.999Z');
  });

  it('reads back the ISO 8601 it wrote', () => {
    for (const zone of ['UTC', AMSTERDAM, 'Asia/Kolkata', 'America/St_Johns']) {
      expect(read(toIso(MOMENT + 7, zone)), zone).toMatchObject({ ms: MOMENT + 7 });
    }
  });

  it('writes the date in the week calendar', () => {
    expect(toWeekDate(MOMENT)).toBe('2023-W46-2');
    // a Sunday in the last week of the year before, and a Monday in the first week of the year after
    expect(toWeekDate(Date.UTC(2021, 0, 3))).toBe('2020-W53-7');
    expect(toWeekDate(Date.UTC(2023, 0, 1))).toBe('2022-W52-7');
    expect(toWeekDate(Date.UTC(2024, 11, 30))).toBe('2025-W01-1');
    expect(toWeekDate(Date.UTC(2024, 0, 1))).toBe('2024-W01-1');
    expect(toWeekDate(Date.UTC(2026, 9, 2, 23, 59))).toBe('2026-W40-5');
    // further east it is already Wednesday
    expect(toWeekDate(MOMENT, 'Pacific/Kiritimati')).toBe('2023-W46-3');
  });

  it('writes the date of an HTTP header, and whole seconds', () => {
    expect(toHttp(MOMENT)).toBe('Tue, 14 Nov 2023 22:13:20 GMT');
    expect(toSeconds(MOMENT + 999)).toBe('1700000000');
    expect(toSeconds(-1)).toBe('-1');
  });

  it('says how long ago or how far away', () => {
    const now = MOMENT;
    expect(relative(now, now, 'en')).toBe('now');
    expect(relative(now - 400, now, 'en')).toBe('now');
    expect(relative(now - 30_000, now, 'en')).toBe('30 seconds ago');
    expect(relative(now + 90_000, now, 'en')).toBe('in 2 minutes');
    expect(relative(now - 3 * 3_600_000, now, 'en')).toBe('3 hours ago');
    expect(relative(now + 86_400_000, now, 'en')).toBe('tomorrow');
    expect(relative(now - 10 * 86_400_000, now, 'en')).toBe('10 days ago');
    expect(relative(now - 90 * 86_400_000, now, 'en')).toBe('3 months ago');
    expect(relative(0, now, 'en')).toBe('54 years ago');
    expect(relative(now - 3 * 3_600_000, now, 'nl')).toBe('3 uur geleden');
    expect(relative(now + 86_400_000, now, 'nl')).toBe('morgen');
  });

  it('writes the date in words', () => {
    expect(inWords(MOMENT, 'UTC', 'en-GB')).toContain('Tuesday');
    expect(inWords(MOMENT, 'UTC', 'en-GB')).toContain('14 November 2023');
    expect(inWords(MOMENT, 'UTC', 'en-GB')).toContain('22:13:20');
    expect(inWords(MOMENT, AMSTERDAM, 'nl-NL')).toContain('dinsdag 14 november 2023');
    expect(inWords(MOMENT, AMSTERDAM, 'nl-NL')).toContain('23:13:20');
  });
});
