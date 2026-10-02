import { BY_HEX, NAMES } from './names';

/**
 * Colours as CSS writes them: reading HEX, rgb(), hsl(), oklch() and names, and writing each of them. A colour is
 * kept as sRGB with channels from 0 to 1, not rounded, so that going from one notation to another loses nothing.
 */

export interface Colour {
  r: number;
  g: number;
  b: number;
  /** 0 is see-through, 1 is solid */
  alpha: number;
}

export type Notation = 'hex' | 'rgb' | 'hsl' | 'oklch' | 'name';

export type Read =
  | { ok: true; colour: Colour; notation: Notation; /** it was outside what sRGB can show, and is brought inside */ mapped: boolean }
  | { ok: false; error: 'empty' | 'invalid' };

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** hsl to sRGB. Hue in degrees, saturation and lightness from 0 to 1. */
export function fromHsl(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return l - (chroma / 2) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

/** sRGB to hsl: hue in degrees, saturation and lightness from 0 to 1. A grey has hue 0. */
export function toHsl({ r, g, b }: Colour): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-9) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

const toLinear = (c: number) => (Math.abs(c) <= 0.04045 ? c / 12.92 : Math.sign(c) * ((Math.abs(c) + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (Math.abs(c) <= 0.0031308 ? c * 12.92 : Math.sign(c) * (1.055 * Math.abs(c) ** (1 / 2.4) - 0.055));

/** sRGB to OKLCH (Björn Ottosson's OKLab, as polar coordinates): lightness 0 to 1, chroma from 0, hue in degrees. */
export function toOklch({ r, g, b }: Colour): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  // a grey has no hue: the tiny rest of the calculation is not one
  return C < 1e-5 ? [L, 0, 0] : [L, C, ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** OKLCH to sRGB, as it comes out: channels below 0 or above 1 when a screen with sRGB can not show the colour. */
function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const A = C * Math.cos((h * Math.PI) / 180);
  const B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  ];
}

const inGamut = (rgb: number[]) => rgb.every((channel) => channel >= -0.0005 && channel <= 1.0005);

/**
 * OKLCH to a colour sRGB can show. One that falls outside keeps its lightness and hue and gives up chroma until
 * it fits, which is how CSS brings a colour into the gamut of a screen.
 */
export function fromOklch(L: number, C: number, h: number): { rgb: [number, number, number]; mapped: boolean } {
  const lightness = clamp(L);
  const direct = oklchToRgb(lightness, C, h);
  if (inGamut(direct)) return { rgb: direct.map((channel) => clamp(channel)) as [number, number, number], mapped: false };
  let [low, high] = [0, C];
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    if (inGamut(oklchToRgb(lightness, middle, h))) low = middle;
    else high = middle;
  }
  return { rgb: oklchToRgb(lightness, low, h).map((channel) => clamp(channel)) as [number, number, number], mapped: true };
}

/** A number, a percentage of `whole`, or "none" (which CSS reads as 0). */
function amount(token: string, whole: number): number | null {
  if (token.toLowerCase() === 'none') return 0;
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%?)$/i.exec(token);
  if (!match) return null;
  return match[2] ? (Number(match[1]) / 100) * whole : Number(match[1]);
}

const TURNS: Record<string, number> = { deg: 1, '': 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };

function angle(token: string): number | null {
  if (token.toLowerCase() === 'none') return 0;
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+))(deg|grad|rad|turn)?$/i.exec(token);
  return match ? Number(match[1]) * TURNS[(match[2] ?? '').toLowerCase()] : null;
}

/** Reads a colour the way CSS does: #f80, #ff8800, rgb(255 136 0), hsl(32 100% 50% / 0.5), oklch(70% 0.19 55), orange. */
export function parse(text: string): Read {
  const value = text.trim().toLowerCase();
  if (!value) return { ok: false, error: 'empty' };
  const invalid = { ok: false, error: 'invalid' } as const;

  if (value === 'transparent') return { ok: true, colour: { r: 0, g: 0, b: 0, alpha: 0 }, notation: 'name', mapped: false };
  if (NAMES[value]) return { ...parse(`#${NAMES[value]}`), notation: 'name' } as Read;

  // the # may be left out when it is six or eight digits, which is how a colour is often copied
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value) ?? /^([0-9a-f]{6}|[0-9a-f]{8})$/.exec(value);
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
    const [r, g, b, a = 255] = digits.match(/../g)!.map((pair) => parseInt(pair, 16));
    return { ok: true, colour: { r: r / 255, g: g / 255, b: b / 255, alpha: a / 255 }, notation: 'hex', mapped: false };
  }

  const call = /^(rgba?|hsla?|oklch)\(\s*(.*?)\s*\)$/.exec(value);
  if (!call) return invalid;
  const parts = call[2]
    .replace(/\//g, ' / ')
    .split(/[\s,]+/)
    .filter(Boolean);
  const slash = parts.indexOf('/');
  const main = slash < 0 ? parts : parts.slice(0, slash);
  const alphaToken = slash < 0 ? main[3] : parts[slash + 1];
  if (main.length < 3 || main.length > (slash < 0 ? 4 : 3) || (slash >= 0 && parts.length !== slash + 2)) return invalid;
  const alpha = alphaToken === undefined ? 1 : amount(alphaToken, 1);
  if (alpha === null) return invalid;
  const done = (rgb: number[], notation: Notation, mapped = false): Read => ({
    ok: true,
    colour: { r: rgb[0], g: rgb[1], b: rgb[2], alpha: clamp(alpha) },
    notation,
    mapped
  });

  if (call[1].startsWith('rgb')) {
    const channels = main.slice(0, 3).map((token) => amount(token, 255));
    if (channels.some((channel) => channel === null)) return invalid;
    return done(
      channels.map((channel) => clamp(channel! / 255)),
      'rgb'
    );
  }
  if (call[1].startsWith('hsl')) {
    const h = angle(main[0]);
    // without a % sign a number is read as a percentage too: hsl(32 100 50)
    const [s, l] = [main[1], main[2]].map((token) => amount(token.endsWith('%') || token === 'none' ? token : `${token}%`, 1));
    if (h === null || s === null || l === null) return invalid;
    return done(fromHsl(h, clamp(s), clamp(l)), 'hsl');
  }
  const L = amount(main[0], 1);
  // 100% of chroma is 0.4, by the definition of CSS
  const C = amount(main[1], 0.4);
  const h = angle(main[2]);
  if (L === null || C === null || h === null) return invalid;
  const { rgb, mapped } = fromOklch(L, Math.max(0, C), h);
  return done(rgb, 'oklch', mapped);
}

/** A number with at most this many decimals, without zeros at the end. */
const round = (value: number, digits: number) => String(Number(value.toFixed(digits)));
const byte = (channel: number) => Math.round(clamp(channel) * 255);
const hasAlpha = (colour: Colour) => colour.alpha < 0.9995;

/** #rrggbb, or #rrggbbaa when it is not solid. */
export function toHex(colour: Colour): string {
  const pair = (value: number) => value.toString(16).padStart(2, '0');
  return `#${pair(byte(colour.r))}${pair(byte(colour.g))}${pair(byte(colour.b))}${hasAlpha(colour) ? pair(Math.round(colour.alpha * 255)) : ''}`;
}

/**
 * rgb(255 136 0), or with `commas` the older rgb(255, 136, 0) and rgba(255, 136, 0, 0.5) that every browser ever
 * made understands.
 */
export function toRgb(colour: Colour, commas = false): string {
  const channels = [byte(colour.r), byte(colour.g), byte(colour.b)];
  const alpha = round(colour.alpha, 3);
  if (commas) return hasAlpha(colour) ? `rgba(${channels.join(', ')}, ${alpha})` : `rgb(${channels.join(', ')})`;
  return `rgb(${channels.join(' ')}${hasAlpha(colour) ? ` / ${alpha}` : ''})`;
}

export function toHslText(colour: Colour, commas = false): string {
  const [h, s, l] = toHsl(colour);
  const parts = [round(h, 1), `${round(s * 100, 1)}%`, `${round(l * 100, 1)}%`];
  const alpha = round(colour.alpha, 3);
  if (commas) return hasAlpha(colour) ? `hsla(${parts.join(', ')}, ${alpha})` : `hsl(${parts.join(', ')})`;
  return `hsl(${parts.join(' ')}${hasAlpha(colour) ? ` / ${alpha}` : ''})`;
}

export function toOklchText(colour: Colour): string {
  const [L, C, h] = toOklch(colour);
  return `oklch(${round(L * 100, 2)}% ${round(C, 4)} ${round(h, 2)}${hasAlpha(colour) ? ` / ${round(colour.alpha, 3)}` : ''})`;
}

/** The name CSS has for exactly this colour, when it has one and the colour is solid. */
export function toName(colour: Colour): string | null {
  if (colour.alpha === 0 && toHex({ ...colour, alpha: 1 }) === '#000000') return 'transparent';
  return hasAlpha(colour) ? null : (BY_HEX[toHex(colour).slice(1)] ?? null);
}

/** How light each step of the scale is, in OKLCH: from nearly white to nearly black. */
const STEPS = [0.97, 0.92, 0.85, 0.76, 0.66, 0.56, 0.46, 0.36, 0.27, 0.18];

/** The same hue and chroma from light to dark, as hex. Steps that feel even to the eye, which is what OKLCH is for. */
export function shades(colour: Colour): string[] {
  const [, C, h] = toOklch(colour);
  return STEPS.map((L) => {
    const [r, g, b] = fromOklch(L, C, h).rgb;
    return toHex({ r, g, b, alpha: 1 });
  });
}
