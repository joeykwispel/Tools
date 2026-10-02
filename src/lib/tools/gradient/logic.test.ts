import { describe, expect, it } from 'vitest';
import { SHADOWS, gradient, shadow, type Gradient } from './logic';

const base: Gradient = {
  kind: 'linear',
  angle: 90,
  shape: 'circle',
  stops: [
    { colour: '#ff8800', position: 0 },
    { colour: 'rebeccapurple', position: 100 }
  ],
  oklch: false
};

describe('gradient', () => {
  it('writes a linear, radial and conic gradient', () => {
    expect(gradient(base)).toEqual({ ok: true, css: 'linear-gradient(90deg, #ff8800 0%, rebeccapurple 100%)' });
    expect(gradient({ ...base, kind: 'radial' })).toMatchObject({ css: 'radial-gradient(circle, #ff8800 0%, rebeccapurple 100%)' });
    expect(gradient({ ...base, kind: 'radial', shape: 'ellipse' })).toMatchObject({ css: 'radial-gradient(ellipse, #ff8800 0%, rebeccapurple 100%)' });
    expect(gradient({ ...base, kind: 'conic', angle: 45 })).toMatchObject({ css: 'conic-gradient(from 45deg, #ff8800 0%, rebeccapurple 100%)' });
  });

  it('mixes in OKLCH and repeats when asked', () => {
    expect(gradient({ ...base, oklch: true })).toMatchObject({ css: 'linear-gradient(in oklch 90deg, #ff8800 0%, rebeccapurple 100%)' });
    expect(gradient({ ...base, kind: 'radial', oklch: true })).toMatchObject({ css: 'radial-gradient(circle in oklch, #ff8800 0%, rebeccapurple 100%)' });
    expect(gradient({ ...base, kind: 'conic', angle: 0, oklch: true })).toMatchObject({
      css: 'conic-gradient(from 0deg in oklch, #ff8800 0%, rebeccapurple 100%)'
    });
    expect(gradient({ ...base, repeating: true })).toMatchObject({ css: 'repeating-linear-gradient(90deg, #ff8800 0%, rebeccapurple 100%)' });
  });

  it('writes other colours as rgb(), and keeps positions inside 0 to 100', () => {
    const stops = [
      { colour: 'hsl(0 100% 50% / 0.5)', position: -10 },
      { colour: ' #ABC ', position: 33.333 },
      { colour: 'oklch(70% 0.1 200)', position: 140 }
    ];
    expect(gradient({ ...base, stops })).toMatchObject({ css: 'linear-gradient(90deg, rgb(255 0 0 / 0.5) 0%, #abc 33.33%, rgb(64 177 183) 100%)' });
  });

  it('says what is wrong', () => {
    expect(gradient({ ...base, stops: [base.stops[0]] })).toEqual({ ok: false, error: 'stops' });
    expect(gradient({ ...base, stops: [base.stops[0], { colour: 'nope', position: 50 }] })).toEqual({ ok: false, error: 'colour', index: 1 });
  });
});

describe('shadow', () => {
  it('writes one or more layers', () => {
    expect(shadow([{ x: 0, y: 4, blur: 12, spread: 0, colour: 'rgb(0 0 0 / 25%)', inset: false }])).toEqual({
      ok: true,
      css: '0 4px 12px 0 rgb(0 0 0 / 0.25)'
    });
    expect(shadow(SHADOWS.lifted)).toMatchObject({ css: '0 1px 2px 0 rgb(15 23 42 / 0.12), 0 12px 32px -8px rgb(15 23 42 / 0.28)' });
    expect(shadow(SHADOWS.inner)).toMatchObject({ css: 'inset 0 2px 6px 0 rgb(15 23 42 / 0.25)' });
    expect(shadow(SHADOWS.sharp)).toMatchObject({ css: '6px 6px 0 0 #0f172a' });
  });

  it('keeps blur from going below 0, and writes none for no layers', () => {
    expect(shadow([{ x: -2.5, y: 0, blur: -5, spread: 1, colour: 'black', inset: false }])).toMatchObject({ css: '-2.5px 0 0 1px black' });
    expect(shadow([])).toEqual({ ok: true, css: 'none' });
  });

  it('says which layer has a colour that can not be read', () => {
    expect(shadow([SHADOWS.soft[0], { ...SHADOWS.soft[0], colour: 'shadowy' }])).toEqual({ ok: false, error: 'colour', index: 1 });
  });
});
