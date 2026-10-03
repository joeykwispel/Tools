/**
 * Easing curves for CSS: cubic-bezier(x1, y1, x2, y2), the keywords that stand for some of them, and how far an
 * animation has come at a moment. The curve runs from (0, 0) to (1, 1); x is time, y is progress.
 */

export type Curve = [x1: number, y1: number, x2: number, y2: number];

/** The keywords of CSS and the curves they are. */
export const KEYWORDS: Record<string, Curve> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1]
};

/** Well-known curves (from easings.net), to start from. */
export const PRESETS: Record<string, Curve> = {
  ...KEYWORDS,
  easeInSine: [0.12, 0, 0.39, 0],
  easeOutSine: [0.61, 1, 0.88, 1],
  easeInOutSine: [0.37, 0, 0.63, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInQuint: [0.64, 0, 0.78, 0],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  easeInBack: [0.36, 0, 0.66, -0.56],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6]
};

export type Read = { ok: true; curve: Curve } | { ok: false; error: 'empty' | 'invalid' | 'x' };

/** Reads cubic-bezier(0.33, 1, 0.68, 1), a keyword, or just four numbers. Both x values have to lie from 0 to 1. */
export function parse(text: string): Read {
  const value = text.trim().toLowerCase().replace(/;$/, '');
  if (!value) return { ok: false, error: 'empty' };
  if (KEYWORDS[value]) return { ok: true, curve: [...KEYWORDS[value]] as Curve };
  const inner = /^cubic-bezier\((.*)\)$/.exec(value)?.[1] ?? value;
  const parts = inner.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 4 || !parts.every((part) => /^[+-]?(\d+\.?\d*|\.\d+)$/.test(part))) return { ok: false, error: 'invalid' };
  const curve = parts.map(Number) as Curve;
  if (curve[0] < 0 || curve[0] > 1 || curve[2] < 0 || curve[2] > 1) return { ok: false, error: 'x' };
  return { ok: true, curve };
}

/** A number with at most three decimals, without zeros at the end. */
const tidy = (value: number) => String(Number(value.toFixed(3)) || 0);

/** The CSS for a curve: its keyword when it has one, cubic-bezier() otherwise. */
export function toCss(curve: Curve): string {
  const rounded = curve.map((value) => Number(value.toFixed(3)));
  const keyword = Object.entries(KEYWORDS).find(([, known]) => known.every((value, i) => value === rounded[i]))?.[0];
  return keyword ?? `cubic-bezier(${curve.map(tidy).join(', ')})`;
}

/** The name of a preset that is this curve, if any. */
export const presetOf = (curve: Curve) =>
  Object.entries(PRESETS).find(([, known]) => known.every((value, i) => Math.abs(value - curve[i]) < 0.0005))?.[0] ?? null;

const bezier = (s: number, a: number, b: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
const slope = (s: number, a: number, b: number) => 3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s * s;

/** How far the animation has come at `time` (0 to 1): what the browser computes for each frame. */
export function progressAt([x1, y1, x2, y2]: Curve, time: number): number {
  if (time <= 0) return 0;
  if (time >= 1) return 1;
  // find s where x(s) is the time: Newton first, halving when it does not settle
  let s = time;
  for (let i = 0; i < 8; i++) {
    const error = bezier(s, x1, x2) - time;
    const d = slope(s, x1, x2);
    if (Math.abs(error) < 1e-7) return bezier(s, y1, y2);
    if (Math.abs(d) < 1e-6) break;
    s -= error / d;
  }
  let [low, high] = [0, 1];
  s = time;
  for (let i = 0; i < 40; i++) {
    const x = bezier(s, x1, x2);
    if (Math.abs(x - time) < 1e-7) break;
    if (x < time) low = s;
    else high = s;
    s = (low + high) / 2;
  }
  return bezier(s, y1, y2);
}

/** How far the curve goes below 0 and above 1: a curve that overshoots needs more room to be drawn. */
export const range = ([, y1, , y2]: Curve): [number, number] => [Math.min(0, y1, y2), Math.max(1, y1, y2)];
