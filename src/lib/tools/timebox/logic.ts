/**
 * A timer that counts down a timebox and keeps counting when it is over. Its state is three numbers and every change
 * makes a new state from the time of the clock, so a tab that sleeps for a while does not lose seconds.
 */

export interface Timer {
  /** How long the timebox is, in milliseconds */
  duration: number;
  /** When it was last started, on the clock that is used; null while it stands still */
  startedAt: number | null;
  /** What had already run before it was last started */
  before: number;
}

export const fresh = (duration: number): Timer => ({ duration, startedAt: null, before: 0 });
export const running = (timer: Timer) => timer.startedAt !== null;

/** How long it has run in all. */
export const elapsed = (timer: Timer, now: number) => timer.before + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt));
/** What is left; below zero once the timebox is over. */
export const remaining = (timer: Timer, now: number) => timer.duration - elapsed(timer, now);

export const start = (timer: Timer, now: number): Timer => (running(timer) ? timer : { ...timer, startedAt: now });
export const pause = (timer: Timer, now: number): Timer => (running(timer) ? { ...timer, startedAt: null, before: elapsed(timer, now) } : timer);

export type Phase = 'calm' | 'ending' | 'over';

/** Where in the timebox it is: the last fifth (or the last ten seconds of a short one) is the end coming, then it is over. */
export function phase(left: number, duration: number): Phase {
  if (left <= 0) return 'over';
  return left <= Math.max(duration / 5, Math.min(10_000, duration / 2)) ? 'ending' : 'calm';
}

/**
 * Time as a clock shows it: 5:00, 0:07, 1:02:03. What is left is rounded up, so it says 0:01 until the very end; time
 * over the timebox gets a plus and is rounded down: +0:12.
 */
export function clock(left: number): string {
  const seconds = left > 0 ? Math.ceil(left / 1000) : Math.floor(-left / 1000);
  const [h, m, s] = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
  const text = h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  return left <= 0 && seconds > 0 ? `+${text}` : text;
}

/** The longest timebox: a day. */
export const MAX = 24 * 3600_000;

/**
 * Reads how long a timebox is: minutes (5, 1.5), minutes and seconds (5:30), hours too (1:00:00), or with a unit
 * (90s, 2m, 1h). Null when it is not a time, is zero, or is more than a day.
 */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase().replace(',', '.');
  let ms: number;
  const unit = /^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h|u)$/.exec(value);
  if (unit) ms = Number(unit[1]) * (unit[2].startsWith('s') ? 1000 : unit[2].startsWith('m') ? 60_000 : 3600_000);
  else if (/^\d+(?:\.\d+)?$/.test(value)) ms = Number(value) * 60_000;
  else if (/^\d+(:[0-5]?\d){1,2}$/.test(value)) ms = value.split(':').reduce((total, part) => total * 60 + Number(part), 0) * 1000;
  else return null;
  ms = Math.round(ms);
  return ms > 0 && ms <= MAX ? ms : null;
}
