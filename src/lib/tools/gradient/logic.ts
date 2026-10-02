import { parse, toRgb } from '../colour/logic';

/** CSS for a gradient and for a box shadow, from a few settings. Colours are read like the colour converter reads them. */

export type Kind = 'linear' | 'radial' | 'conic';

export interface Stop {
  colour: string;
  /** 0 to 100 */
  position: number;
}

export interface Gradient {
  kind: Kind;
  /** Degrees: the direction of a linear gradient, the start of a conic one */
  angle: number;
  /** For a radial gradient */
  shape: 'circle' | 'ellipse';
  stops: Stop[];
  /** Mix the colours in OKLCH: smoother, without the grey middle of two opposite colours (browsers since 2023) */
  oklch: boolean;
  /** Repeat the stops over the whole surface */
  repeating?: boolean;
}

export type Css = { ok: true; css: string } | { ok: false; error: 'colour'; index: number } | { ok: false; error: 'stops' };

/** A colour the way it was typed when it is a name or HEX, and as rgb() otherwise: short and as recognisable as can be. */
function colourText(text: string): string | null {
  const read = parse(text);
  if (!read.ok) return null;
  return read.notation === 'hex' || read.notation === 'name' ? text.trim().toLowerCase() : toRgb(read.colour);
}

const number = (value: number) => String(Number(value.toFixed(2)));
const length = (px: number) => (px === 0 ? '0' : `${number(px)}px`);

/** linear-gradient(90deg, #ff8800 0%, #663399 100%) and its radial and conic relatives. */
export function gradient({ kind, angle, shape, stops, oklch, repeating = false }: Gradient): Css {
  if (stops.length < 2) return { ok: false, error: 'stops' };
  const written: string[] = [];
  for (const [index, stop] of stops.entries()) {
    const colour = colourText(stop.colour);
    if (colour === null) return { ok: false, error: 'colour', index };
    written.push(`${colour} ${number(Math.min(100, Math.max(0, stop.position)))}%`);
  }
  const space = oklch ? 'in oklch' : '';
  const head =
    kind === 'linear'
      ? [space, `${number(angle)}deg`].filter(Boolean).join(' ')
      : kind === 'radial'
        ? [shape, space].filter(Boolean).join(' ')
        : [`from ${number(angle)}deg`, space].filter(Boolean).join(' ');
  return { ok: true, css: `${repeating ? 'repeating-' : ''}${kind}-gradient(${[head, ...written].join(', ')})` };
}

export interface Shadow {
  x: number;
  y: number;
  blur: number;
  spread: number;
  colour: string;
  inset: boolean;
}

/** box-shadow with one or more layers, the first on top. */
export function shadow(layers: Shadow[]): Css {
  if (!layers.length) return { ok: true, css: 'none' };
  const written: string[] = [];
  for (const [index, layer] of layers.entries()) {
    const colour = colourText(layer.colour);
    if (colour === null) return { ok: false, error: 'colour', index };
    const parts = [layer.inset ? 'inset' : '', length(layer.x), length(layer.y), length(Math.max(0, layer.blur)), length(layer.spread), colour];
    written.push(parts.filter(Boolean).join(' '));
  }
  return { ok: true, css: written.join(', ') };
}

/** Shadows to start from. */
export const SHADOWS: Record<'soft' | 'lifted' | 'sharp' | 'inner', Shadow[]> = {
  soft: [{ x: 0, y: 8, blur: 24, spread: -4, colour: 'rgb(15 23 42 / 0.18)', inset: false }],
  lifted: [
    { x: 0, y: 1, blur: 2, spread: 0, colour: 'rgb(15 23 42 / 0.12)', inset: false },
    { x: 0, y: 12, blur: 32, spread: -8, colour: 'rgb(15 23 42 / 0.28)', inset: false }
  ],
  sharp: [{ x: 6, y: 6, blur: 0, spread: 0, colour: '#0f172a', inset: false }],
  inner: [{ x: 0, y: 2, blur: 6, spread: 0, colour: 'rgb(15 23 42 / 0.25)', inset: true }]
};
