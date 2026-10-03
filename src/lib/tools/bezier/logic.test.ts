import { describe, expect, it } from 'vitest';
import { PRESETS, parse, presetOf, progressAt, range, toCss, type Curve } from './logic';

describe('parse', () => {
  it('reads cubic-bezier(), keywords and bare numbers', () => {
    expect(parse('cubic-bezier(0.33, 1, 0.68, 1)')).toEqual({ ok: true, curve: [0.33, 1, 0.68, 1] });
    expect(parse('  CUBIC-BEZIER(.34,1.56,.64,1); ')).toEqual({ ok: true, curve: [0.34, 1.56, 0.64, 1] });
    expect(parse('0.68 -0.6 0.32 1.6')).toEqual({ ok: true, curve: [0.68, -0.6, 0.32, 1.6] });
    expect(parse('ease')).toEqual({ ok: true, curve: [0.25, 0.1, 0.25, 1] });
    expect(parse('Ease-In-Out')).toEqual({ ok: true, curve: [0.42, 0, 0.58, 1] });
  });

  it('says what is wrong', () => {
    expect(parse('')).toEqual({ ok: false, error: 'empty' });
    expect(parse('cubic-bezier(0.1, 0.2, 0.3)')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('steps(4)')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('cubic-bezier(a, b, c, d)')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('cubic-bezier(1.2, 0, 0.5, 1)')).toEqual({ ok: false, error: 'x' });
    expect(parse('cubic-bezier(0.2, 0, -0.1, 1)')).toEqual({ ok: false, error: 'x' });
  });
});

describe('toCss and presetOf', () => {
  it('writes a keyword when there is one', () => {
    expect(toCss([0.25, 0.1, 0.25, 1])).toBe('ease');
    expect(toCss([0, 0, 1, 1])).toBe('linear');
    expect(toCss([0.42, 0, 0.58, 1])).toBe('ease-in-out');
  });

  it('writes cubic-bezier() otherwise, short', () => {
    expect(toCss([0.33, 1, 0.68, 1])).toBe('cubic-bezier(0.33, 1, 0.68, 1)');
    expect(toCss([0.123456, -0.5, 1, 1.25])).toBe('cubic-bezier(0.123, -0.5, 1, 1.25)');
    expect(toCss([0.3333, 0, 0.6667, 1])).toBe('cubic-bezier(0.333, 0, 0.667, 1)');
  });

  it('knows a preset by its numbers', () => {
    expect(presetOf([0.22, 1, 0.36, 1])).toBe('easeOutQuint');
    expect(presetOf([0.25, 0.1, 0.25, 1])).toBe('ease');
    expect(presetOf([0.2, 1, 0.36, 1])).toBeNull();
  });

  it('has presets that CSS accepts', () => {
    for (const [name, curve] of Object.entries(PRESETS)) expect(parse(toCss(curve)), name).toEqual({ ok: true, curve });
  });
});

describe('progressAt', () => {
  it('starts at 0 and ends at 1', () => {
    for (const curve of Object.values(PRESETS)) {
      expect(progressAt(curve, 0)).toBe(0);
      expect(progressAt(curve, 1)).toBe(1);
    }
  });

  it('is time itself for linear', () => {
    for (const time of [0.1, 0.25, 0.5, 0.9]) expect(progressAt(PRESETS.linear, time)).toBeCloseTo(time, 6);
  });

  it('gives what browsers give for the keywords', () => {
    // values every engine agrees on, at half the time
    expect(progressAt(PRESETS.ease, 0.5)).toBeCloseTo(0.8024, 4);
    expect(progressAt(PRESETS['ease-in'], 0.5)).toBeCloseTo(0.3154, 3);
    expect(progressAt(PRESETS['ease-out'], 0.5)).toBeCloseTo(0.6846, 3);
    expect(progressAt(PRESETS['ease-in-out'], 0.5)).toBeCloseTo(0.5, 6);
  });

  it('overshoots with a back curve, and keeps going up for the others', () => {
    const back = PRESETS.easeOutBack;
    expect(Math.max(...Array.from({ length: 99 }, (_, i) => progressAt(back, (i + 1) / 100)))).toBeGreaterThan(1.05);
    const cubic: Curve = PRESETS.easeOutCubic;
    const values = Array.from({ length: 101 }, (_, i) => progressAt(cubic, i / 100));
    expect(values.every((value, i) => i === 0 || value >= values[i - 1] - 1e-9)).toBe(true);
  });

  it('settles on steep curves, where Newton alone does not', () => {
    for (const curve of [
      [1, 0, 1, 0],
      [0, 1, 0, 1]
    ] as Curve[]) {
      const values = Array.from({ length: 1001 }, (_, i) => progressAt(curve, i / 1000));
      expect(values.every((value, i) => value >= 0 && value <= 1 && (i === 0 || value >= values[i - 1] - 1e-6))).toBe(true);
    }
  });
});

describe('range', () => {
  it('makes room for a curve that overshoots', () => {
    expect(range(PRESETS.ease)).toEqual([0, 1]);
    expect(range(PRESETS.easeInOutBack)).toEqual([-0.6, 1.6]);
  });
});
