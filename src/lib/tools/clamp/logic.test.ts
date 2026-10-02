import { describe, expect, it } from 'vitest';
import { fluid, pxToRem, remToPx, sizeAt, tidy, zoomSafe } from './logic';

const base = { minSize: 16, maxSize: 32, minViewport: 320, maxViewport: 1280 };

describe('fluid', () => {
  it('writes the clamp() in rem', () => {
    // 16 px more over 960 px of screen: 1.6667vw; at 320 px that is 5.3333 px, so it starts from 10.6667 px
    expect(fluid(base)).toMatchObject({ ok: true, css: 'clamp(1rem, 0.6667rem + 1.6667vw, 2rem)' });
    expect(fluid({ minSize: 16, maxSize: 24, minViewport: 400, maxViewport: 1200 })).toMatchObject({ css: 'clamp(1rem, 0.75rem + 1vw, 1.5rem)' });
  });

  it('writes it in px, or with another root size', () => {
    expect(fluid({ ...base, unit: 'px' })).toMatchObject({ css: 'clamp(16px, 10.6667px + 1.6667vw, 32px)' });
    expect(fluid({ ...base, root: 10 })).toMatchObject({ css: 'clamp(1.6rem, 1.0667rem + 1.6667vw, 3.2rem)' });
  });

  it('leaves out a starting size of 0, and handles a size that shrinks', () => {
    expect(fluid({ minSize: 0, maxSize: 100, minViewport: 0, maxViewport: 1000 })).toMatchObject({ css: 'clamp(0rem, 10vw, 6.25rem)' });
    expect(fluid({ minSize: 32, maxSize: 16, minViewport: 320, maxViewport: 1280 })).toMatchObject({ css: 'clamp(1rem, 2.3333rem - 1.6667vw, 2rem)' });
    expect(fluid({ minSize: 20, maxSize: 20, minViewport: 320, maxViewport: 1280 })).toMatchObject({ css: 'clamp(1.25rem, 1.25rem + 0vw, 1.25rem)' });
  });

  it('says what is wrong', () => {
    expect(fluid({ ...base, minViewport: 1280 })).toEqual({ ok: false, error: 'viewport' });
    expect(fluid({ ...base, minViewport: 1400 })).toEqual({ ok: false, error: 'viewport' });
    expect(fluid({ ...base, root: 0 })).toEqual({ ok: false, error: 'root' });
    expect(fluid({ ...base, minSize: NaN })).toEqual({ ok: false, error: 'number' });
  });
});

describe('sizeAt', () => {
  it('grows in a straight line and stays put beyond the two screens', () => {
    expect([200, 320, 800, 1280, 1920].map((width) => sizeAt(base, width))).toEqual([16, 16, 24, 32, 32]);
    expect(sizeAt({ ...base, minSize: 32, maxSize: 16 }, 800)).toBe(24);
    expect(sizeAt({ ...base, minSize: 32, maxSize: 16 }, 2000)).toBe(16);
  });

  it('agrees with the clamp() it writes', () => {
    const { slope, intercept } = fluid(base) as { slope: number; intercept: number };
    for (const width of [400, 640, 1000]) expect(intercept + slope * width).toBeCloseTo(sizeAt(base, width), 6);
  });
});

describe('px, rem and zoom', () => {
  it('converts px and rem', () => {
    expect(pxToRem(24)).toBe(1.5);
    expect(pxToRem(24, 10)).toBe(2.4);
    expect(remToPx(1.5)).toBe(24);
    expect(remToPx(2, 20)).toBe(40);
  });

  it('writes numbers short', () => {
    expect(tidy(1)).toBe('1');
    expect(tidy(0.666666)).toBe('0.6667');
    expect(tidy(-0)).toBe('0');
    expect(tidy(2.5)).toBe('2.5');
  });

  it('knows when zooming can not double the text', () => {
    expect(zoomSafe(base)).toBe(true);
    expect(zoomSafe({ ...base, maxSize: 40 })).toBe(true);
    expect(zoomSafe({ ...base, maxSize: 41 })).toBe(false);
    expect(zoomSafe({ ...base, minSize: 64, maxSize: 16 })).toBe(false);
  });
});
