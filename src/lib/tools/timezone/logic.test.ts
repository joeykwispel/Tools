import { describe, expect, it } from 'vitest';
import { advise, clock, offsetLabel, place, slots, stretches } from './logic';

const AMS = 'Europe/Amsterdam';
const NYC = 'America/New_York';
const TOKYO = 'Asia/Tokyo';
/** A Monday in summer time: Amsterdam is UTC+2, New York UTC-4, Tokyo UTC+9. */
const MONDAY = '2026-10-05';

describe('slots', () => {
  it('gives every hour of the day on the first clock', () => {
    const all = slots(MONDAY, [AMS]);
    expect(all.map((slot) => slot.hour)).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
    expect(new Date(all[0].ms).toISOString()).toBe('2026-10-04T22:00:00.000Z');
    expect(new Date(all[15].ms).toISOString()).toBe('2026-10-05T13:00:00.000Z');
    expect(all[15].cells).toEqual([{ zone: AMS, minutes: 900, dayShift: 0, weekday: 1, kind: 'work' }]);
  });

  it('gives the time on the other clocks, and the day when it is another one', () => {
    const all = slots(MONDAY, [AMS, NYC, TOKYO]);
    // 15:00 in Amsterdam is 09:00 in New York and 22:00 in Tokyo
    expect(all[15].cells.map((cell) => [clock(cell.minutes), cell.dayShift])).toEqual([
      ['15:00', 0],
      ['09:00', 0],
      ['22:00', 0]
    ]);
    // 02:00 in Amsterdam is still Sunday in New York; 18:00 is already Tuesday in Tokyo
    expect(all[2].cells[1]).toMatchObject({ minutes: 20 * 60, dayShift: -1, weekday: 0 });
    expect(all[18].cells[2]).toMatchObject({ minutes: 60, dayShift: 1, weekday: 2 });
  });

  it('follows zones that are half an hour or three quarters off', () => {
    const [, kolkata, kathmandu] = slots(MONDAY, ['UTC', 'Asia/Kolkata', 'Asia/Kathmandu'])[12].cells;
    expect(clock(kolkata.minutes)).toBe('17:30');
    expect(clock(kathmandu.minutes)).toBe('17:45');
  });

  it('says who is at work, who is awake and who is asleep', () => {
    const kinds = slots(MONDAY, ['UTC']).map((slot) => slot.cells[0].kind);
    expect(kinds.slice(0, 7)).toEqual(Array(7).fill('night'));
    expect(kinds.slice(7, 9)).toEqual(['edge', 'edge']);
    expect(kinds.slice(9, 17)).toEqual(Array(8).fill('work'));
    expect(kinds.slice(17, 22)).toEqual(Array(5).fill('edge'));
    expect(kinds.slice(22)).toEqual(['night', 'night']);
  });

  it('knows the weekend, also when it is only weekend somewhere else', () => {
    expect(slots('2026-10-03', ['UTC'])[12].cells[0]).toMatchObject({ weekday: 6, kind: 'weekend' });
    expect(slots('2026-10-03', ['UTC'])[3].cells[0].kind).toBe('night');
    // Monday 08:00 in Tokyo is Sunday evening in New York
    const [tokyo, newYork] = slots(MONDAY, [TOKYO, NYC])[8].cells;
    expect(tokyo.kind).toBe('edge');
    expect(newYork).toMatchObject({ minutes: 19 * 60, dayShift: -1, weekday: 0, kind: 'weekend' });
  });

  it('marks the hours in which everyone works or is awake', () => {
    const all = slots(MONDAY, [AMS, NYC]);
    // New York starts at 15:00 Amsterdam time; Amsterdam stops at 17:00
    expect(all.filter((slot) => slot.everyoneWorks).map((slot) => slot.hour)).toEqual([15, 16]);
    expect(all.filter((slot) => slot.everyoneAwake).map((slot) => slot.hour)).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21]);
  });

  it('leaves out the hour the clock skips, and keeps the day at 24 hours when it goes back', () => {
    // 29 March 2026: 02:00 does not exist in Amsterdam
    expect(slots('2026-03-29', [AMS]).map((slot) => slot.hour)).toEqual([0, 1, ...Array.from({ length: 21 }, (_, i) => i + 3)]);
    expect(slots('2026-10-25', [AMS])).toHaveLength(24);
    // seen from a clock that does not change, Amsterdam has the same time twice that day
    const fromUtc = slots('2026-10-25', ['UTC', AMS]).map((slot) => clock(slot.cells[1].minutes));
    expect(fromUtc.slice(0, 3)).toEqual(['02:00', '02:00', '03:00']);
  });

  it('gives nothing without a date or a zone', () => {
    expect(slots('', [AMS])).toEqual([]);
    expect(slots('tomorrow', [AMS])).toEqual([]);
    expect(slots(MONDAY, [])).toEqual([]);
  });
});

describe('advise and stretches', () => {
  it('joins hours that follow each other', () => {
    expect(stretches([15, 16])).toEqual([{ from: 15, to: 17 }]);
    expect(stretches([9, 10, 11, 15, 20, 21])).toEqual([
      { from: 9, to: 12 },
      { from: 15, to: 16 },
      { from: 20, to: 22 }
    ]);
    expect(stretches([23])).toEqual([{ from: 23, to: 24 }]);
    expect(stretches([])).toEqual([]);
  });

  it('advises the hours in which everyone is at work', () => {
    expect(advise(slots(MONDAY, [AMS, NYC]))).toEqual({ kind: 'work', stretches: [{ from: 15, to: 17 }] });
    expect(advise(slots(MONDAY, [AMS]))).toEqual({ kind: 'work', stretches: [{ from: 9, to: 17 }] });
  });

  it('falls back on the hours in which nobody is asleep', () => {
    // Amsterdam and Tokyo share no working hours: 09:00 in Amsterdam is 16:00 in Tokyo... and that is one
    expect(advise(slots(MONDAY, [AMS, TOKYO]))).toEqual({ kind: 'work', stretches: [{ from: 9, to: 10 }] });
    // with New York there is none; nobody is asleep when it is 13:00 or 14:00 in Amsterdam
    expect(advise(slots(MONDAY, [AMS, NYC, TOKYO]))).toEqual({ kind: 'awake', stretches: [{ from: 13, to: 15 }] });
  });

  it('says so when it is always night for someone', () => {
    expect(advise(slots(MONDAY, [AMS, 'America/Los_Angeles', TOKYO, 'Asia/Kolkata', 'Pacific/Auckland']))).toEqual({ kind: 'none' });
    expect(advise([])).toEqual({ kind: 'none' });
  });
});

describe('writing', () => {
  it('writes a time, a place and an offset', () => {
    expect([0, 870, 1439].map(clock)).toEqual(['00:00', '14:30', '23:59']);
    expect(place('America/New_York')).toBe('New York');
    expect(place('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(place('UTC')).toBe('UTC');
    const moment = Date.UTC(2026, 9, 5, 12);
    expect(offsetLabel(moment, 'UTC')).toBe('UTC');
    expect(offsetLabel(moment, AMS)).toBe('UTC+2');
    expect(offsetLabel(moment, NYC)).toBe('UTC-4');
    expect(offsetLabel(moment, 'Asia/Kolkata')).toBe('UTC+5:30');
    expect(offsetLabel(moment, 'America/St_Johns')).toBe('UTC-2:30');
  });
});
