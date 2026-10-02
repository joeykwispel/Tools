import { fromOklch, toHex, toOklch, type Colour } from '../colour/logic';

/**
 * Contrast the way WCAG 2.2 measures it: the relative luminance of two colours, and how far apart they are, from
 * 1:1 (the same) to 21:1 (black on white). And for a pair that falls short, the nearest colour that does not.
 */

/** Relative luminance, by the formula in WCAG (with its own threshold of 0.03928). */
export function luminance({ r, g, b }: Colour): number {
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** A colour that is not solid, as it looks on top of another one. */
export function blend(top: Colour, under: Colour): Colour {
  const a = top.alpha;
  return { r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a), alpha: 1 };
}

const WHITE: Colour = { r: 1, g: 1, b: 1, alpha: 1 };

/**
 * The contrast ratio of text on a background. A background that is not solid is taken to lie on white, the way
 * a page starts out; text that is not solid is mixed with the background first.
 */
export function ratio(text: Colour, background: Colour): number {
  const bg = background.alpha < 1 ? blend(background, WHITE) : background;
  const fg = text.alpha < 1 ? blend(text, bg) : text;
  const [light, dark] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** 4.4999 is written as 4.49: WCAG does not round up, and a pair that fails should not look as if it passes. */
export const written = (value: number) => (Math.floor(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '');

export const CHECKS = [
  { id: 'aaNormal', level: 'AA', min: 4.5 },
  { id: 'aaLarge', level: 'AA', min: 3 },
  { id: 'aaaNormal', level: 'AAA', min: 7 },
  { id: 'aaaLarge', level: 'AAA', min: 4.5 },
  { id: 'ui', level: 'AA', min: 3 }
] as const;
export type CheckId = (typeof CHECKS)[number]['id'];

export interface Suggestion {
  hex: string;
  ratio: number;
}

/**
 * The colour nearest to `change` that reaches `target` against `keep`: the same hue and chroma in OKLCH, only
 * lighter or darker, by as little as it takes. Null when no lightness gets there.
 */
export function nearest(change: Colour, keep: Colour, target: number, changeIsText = true): Suggestion | null {
  const measure = (candidate: Colour) => (changeIsText ? ratio(candidate, keep) : ratio(keep, candidate));
  const solid = { ...change, alpha: 1 };
  if (measure(solid) >= target) return { hex: toHex(solid), ratio: measure(solid) };
  const [L, C, h] = toOklch(solid);
  // in small steps both ways, so the first one that passes is the nearest
  for (let step = 0.002; step <= 1; step += 0.002) {
    const found = [L - step, L + step]
      .filter((lightness) => lightness >= 0 && lightness <= 1)
      .map((lightness) => {
        const [r, g, b] = fromOklch(lightness, C, h).rgb;
        // rounded to what HEX can hold first, so the colour given is the colour measured
        const hex = toHex({ r, g, b, alpha: 1 });
        const rounded = { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255, alpha: 1 };
        return { hex, ratio: measure(rounded) };
      })
      .filter((candidate) => candidate.ratio >= target)
      .sort((a, b) => b.ratio - a.ratio);
    if (found.length) return found[0];
  }
  return null;
}
