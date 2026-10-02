import { fromWall, offsetMinutes } from '../timestamp/logic';

/**
 * Planning across time zones: for every hour of a day on one clock, what the clocks elsewhere show, and whether
 * people there are at work, awake or asleep. The clocks themselves are the browser's (timestamp/logic.ts).
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A meeting that starts from 09:00 and before 17:00 is in working hours; from 07:00 and before 22:00 someone is at least awake. */
export const WORK = { from: 9, to: 17 };
export const AWAKE = { from: 7, to: 22 };

export type Kind = 'work' | 'edge' | 'night' | 'weekend';

export interface Cell {
  zone: string;
  /** What the clock there shows, as minutes into its day: 14:30 is 870 */
  minutes: number;
  /** The day there against the day at home: -1 is the day before, 1 the day after */
  dayShift: number;
  /** 0 is Sunday */
  weekday: number;
  kind: Kind;
}

export interface Slot {
  /** The hour on the first clock: 0 to 23 */
  hour: number;
  ms: number;
  /** One per zone, in the order given; the first is the clock the hours are of */
  cells: Cell[];
  everyoneWorks: boolean;
  everyoneAwake: boolean;
}

function kindOf(minutes: number, weekday: number): Kind {
  const hour = minutes / 60;
  if (hour < AWAKE.from || hour >= AWAKE.to) return 'night';
  if (weekday === 0 || weekday === 6) return 'weekend';
  return hour >= WORK.from && hour < WORK.to ? 'work' : 'edge';
}

/**
 * The hours of `date` (2026-10-05) on the clock of the first zone, each with the time in every zone. An hour the
 * clock skips when it goes forward is left out: the day then has 23 hours.
 */
export function slots(date: string, zones: string[]): Slot[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match || !zones.length) return [];
  const midnight = new Date(0);
  midnight.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const homeDay = Math.floor(midnight.getTime() / DAY);

  const out: Slot[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const wall = midnight.getTime() + hour * HOUR;
    const ms = fromWall(wall, zones[0]);
    if (ms + offsetMinutes(ms, zones[0]) * 60_000 !== wall) continue;
    const cells = zones.map((zone): Cell => {
      const local = ms + offsetMinutes(ms, zone) * 60_000;
      const minutes = Math.floor((((local % DAY) + DAY) % DAY) / 60_000);
      const weekday = (((Math.floor(local / DAY) + 4) % 7) + 7) % 7;
      return { zone, minutes, dayShift: Math.floor(local / DAY) - homeDay, weekday, kind: kindOf(minutes, weekday) };
    });
    out.push({
      hour,
      ms,
      cells,
      everyoneWorks: cells.every((cell) => cell.kind === 'work'),
      everyoneAwake: cells.every((cell) => cell.kind !== 'night')
    });
  }
  return out;
}

/** Hours that follow each other, as stretches: 15, 16, 20 is 15:00 to 17:00 and 20:00 to 21:00. */
export function stretches(hours: number[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const hour of hours) {
    const last = out[out.length - 1];
    if (last && last.to === hour) last.to = hour + 1;
    else out.push({ from: hour, to: hour + 1 });
  }
  return out;
}

export type Advice =
  /** There are hours in which everyone is at work */
  | { kind: 'work'; stretches: { from: number; to: number }[] }
  /** Nobody has to be up at night, but someone is outside working hours */
  | { kind: 'awake'; stretches: { from: number; to: number }[] }
  /** Whatever the hour, it is night for someone */
  | { kind: 'none' };

/** The hours to pick from: those in which everyone is at work, or else those in which nobody is asleep. */
export function advise(all: Slot[]): Advice {
  const working = all.filter((slot) => slot.everyoneWorks).map((slot) => slot.hour);
  if (working.length) return { kind: 'work', stretches: stretches(working) };
  const awake = all.filter((slot) => slot.everyoneAwake).map((slot) => slot.hour);
  return awake.length ? { kind: 'awake', stretches: stretches(awake) } : { kind: 'none' };
}

/** 870 as 14:30. */
export const clock = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** The place a zone is named after: "America/New_York" as "New York". */
export const place = (zone: string) => zone.slice(zone.lastIndexOf('/') + 1).replace(/_/g, ' ');

/** How far a zone is from UTC at a moment: UTC+2, UTC-3:30, UTC. */
export function offsetLabel(ms: number, zone: string): string {
  const minutes = offsetMinutes(ms, zone);
  if (minutes === 0) return 'UTC';
  const size = Math.abs(minutes);
  return `UTC${minutes < 0 ? '-' : '+'}${Math.floor(size / 60)}${size % 60 ? `:${String(size % 60).padStart(2, '0')}` : ''}`;
}
