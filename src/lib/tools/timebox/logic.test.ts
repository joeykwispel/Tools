import { describe, expect, it } from 'vitest';
import { MAX, clock, elapsed, fresh, parseDuration, pause, phase, remaining, running, start } from './logic';

describe('timer', () => {
  it('counts from the clock, not from ticks', () => {
    let timer = fresh(60_000);
    expect([running(timer), elapsed(timer, 1000), remaining(timer, 1000)]).toEqual([false, 0, 60_000]);
    timer = start(timer, 1000);
    expect(running(timer)).toBe(true);
    expect(remaining(timer, 1000)).toBe(60_000);
    expect(remaining(timer, 31_000)).toBe(30_000);
    // a tab that slept for ten minutes still knows what time it is
    expect(remaining(timer, 601_000)).toBe(-540_000);
  });

  it('keeps what has run when it is paused and started again', () => {
    let timer = start(fresh(60_000), 0);
    timer = pause(timer, 20_000);
    expect([running(timer), remaining(timer, 999_999)]).toEqual([false, 40_000]);
    timer = start(timer, 100_000);
    expect(remaining(timer, 110_000)).toBe(30_000);
    expect(elapsed(timer, 110_000)).toBe(30_000);
  });

  it('does nothing when it is started twice or paused twice', () => {
    const started = start(fresh(60_000), 0);
    expect(start(started, 5000)).toBe(started);
    const paused = pause(started, 5000);
    expect(pause(paused, 9000)).toBe(paused);
  });

  it('does not run backwards when the clock is set back', () => {
    expect(elapsed(start(fresh(60_000), 5000), 1000)).toBe(0);
  });
});

describe('phase', () => {
  it('says when the end is coming and when it is over', () => {
    expect(phase(300_000, 300_000)).toBe('calm');
    expect(phase(61_000, 300_000)).toBe('calm');
    expect(phase(60_000, 300_000)).toBe('ending');
    expect(phase(1, 300_000)).toBe('ending');
    expect(phase(0, 300_000)).toBe('over');
    expect(phase(-5000, 300_000)).toBe('over');
  });

  it('gives a short timebox ten seconds of warning, but not more than half of it', () => {
    expect(phase(11_000, 30_000)).toBe('calm');
    expect(phase(10_000, 30_000)).toBe('ending');
    expect(phase(6000, 10_000)).toBe('calm');
    expect(phase(5000, 10_000)).toBe('ending');
  });
});

describe('clock', () => {
  it('rounds what is left up', () => {
    expect(clock(300_000)).toBe('5:00');
    expect(clock(299_999)).toBe('5:00');
    expect(clock(299_000)).toBe('4:59');
    expect(clock(7000)).toBe('0:07');
    expect(clock(1)).toBe('0:01');
    expect(clock(3_723_000)).toBe('1:02:03');
  });

  it('counts on with a plus once it is over', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(-999)).toBe('0:00');
    expect(clock(-1000)).toBe('+0:01');
    expect(clock(-72_500)).toBe('+1:12');
  });
});

describe('parseDuration', () => {
  it('reads minutes, minutes and seconds, and hours', () => {
    expect(parseDuration('5')).toBe(300_000);
    expect(parseDuration('1.5')).toBe(90_000);
    expect(parseDuration('1,5')).toBe(90_000);
    expect(parseDuration('5:30')).toBe(330_000);
    expect(parseDuration('0:05')).toBe(5000);
    expect(parseDuration('90:00')).toBe(5_400_000);
    expect(parseDuration('1:00:00')).toBe(3_600_000);
    expect(parseDuration(' 2:5 ')).toBe(125_000);
  });

  it('reads a time with a unit', () => {
    expect(parseDuration('90s')).toBe(90_000);
    expect(parseDuration('45 sec')).toBe(45_000);
    expect(parseDuration('2m')).toBe(120_000);
    expect(parseDuration('15 min')).toBe(900_000);
    expect(parseDuration('1h')).toBe(3_600_000);
    expect(parseDuration('2u')).toBe(7_200_000);
  });

  it('gives null for what is not a time, nothing, or more than a day', () => {
    expect(['', 'soon', '5:60', '5:', ':30', '-5', '0', '0:00', '1:2:3:4', '25h'].map(parseDuration)).toEqual(Array(10).fill(null));
    expect(parseDuration('24h')).toBe(MAX);
  });
});
