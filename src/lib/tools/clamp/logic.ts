/**
 * Fluid sizes for CSS: a clamp() that grows in a straight line from one size at a narrow screen to another at a
 * wide one, and stays put beyond them. Sizes come in pixels and go out in rem (or px), the way a stylesheet wants.
 */

export interface Fluid {
  /** The size at the narrow screen, in px */
  minSize: number;
  /** The size at the wide screen, in px */
  maxSize: number;
  /** The width of the narrow screen, in px */
  minViewport: number;
  /** The width of the wide screen, in px */
  maxViewport: number;
  /** What 1rem is, in px: 16 unless the site changes it */
  root?: number;
  unit?: 'rem' | 'px';
}

export type Result = { ok: true; css: string; slope: number; intercept: number } | { ok: false; error: 'number' | 'viewport' | 'root' };

/** A number with at most four decimals, without zeros at the end. */
export const tidy = (value: number) => String(Number(value.toFixed(4)) || 0);

export const pxToRem = (px: number, root = 16) => px / root;
export const remToPx = (rem: number, root = 16) => rem * root;

/** The clamp() for a fluid size: clamp(1rem, 0.5rem + 2.5vw, 2rem). */
export function fluid({ minSize, maxSize, minViewport, maxViewport, root = 16, unit = 'rem' }: Fluid): Result {
  if (![minSize, maxSize, minViewport, maxViewport, root].every(Number.isFinite)) return { ok: false, error: 'number' };
  if (root <= 0) return { ok: false, error: 'root' };
  if (minViewport >= maxViewport) return { ok: false, error: 'viewport' };

  // size = intercept + slope × viewport, in px; 1vw is a hundredth of the viewport
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const intercept = minSize - slope * minViewport;
  const length = (px: number) => (unit === 'rem' ? `${tidy(pxToRem(px, root))}rem` : `${tidy(px)}px`);
  const vw = `${tidy(slope * 100)}vw`;
  const preferred = intercept === 0 ? vw : `${length(intercept)} ${slope < 0 ? '-' : '+'} ${tidy(Math.abs(slope * 100))}vw`;
  // clamp() wants the smaller bound first, also for a size that shrinks on a wider screen
  const [low, high] = [Math.min(minSize, maxSize), Math.max(minSize, maxSize)];
  return { ok: true, css: `clamp(${length(low)}, ${preferred}, ${length(high)})`, slope, intercept };
}

/** The size in px that the clamp() gives at a width of the screen. */
export function sizeAt({ minSize, maxSize, minViewport, maxViewport }: Fluid, viewport: number): number {
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const size = minSize + slope * (viewport - minViewport);
  return Math.min(Math.max(size, Math.min(minSize, maxSize)), Math.max(minSize, maxSize));
}

/**
 * Text that grows with the screen grows less when the visitor zooms in: zooming makes the screen narrower in CSS
 * pixels. With the largest size more than 2.5 times the smallest, zooming to 200% can not make the text twice as
 * large, which WCAG asks (1.4.4).
 */
export const ZOOM_LIMIT = 2.5;
export const zoomSafe = ({ minSize, maxSize }: Fluid) => Math.max(minSize, maxSize) <= ZOOM_LIMIT * Math.min(minSize, maxSize);

/** Widths of screens people have, to show the size at. */
export const WIDTHS = [320, 375, 768, 1024, 1280, 1440, 1920];
