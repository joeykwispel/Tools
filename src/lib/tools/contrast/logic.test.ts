import { describe, expect, it } from 'vitest';
import { parse, type Colour } from '../colour/logic';
import { blend, luminance, nearest, ratio, written } from './logic';

const colour = (text: string): Colour => {
  const read = parse(text);
  if (!read.ok) throw new Error(`not a colour: ${text}`);
  return read.colour;
};
const contrast = (text: string, background: string) => ratio(colour(text), colour(background));

describe('luminance and ratio', () => {
  it('measures the luminance of white, black and the primaries', () => {
    expect(luminance(colour('#ffffff'))).toBe(1);
    expect(luminance(colour('#000000'))).toBe(0);
    expect(luminance(colour('#ff0000'))).toBeCloseTo(0.2126, 4);
    expect(luminance(colour('#00ff00'))).toBeCloseTo(0.7152, 4);
    expect(luminance(colour('#0000ff'))).toBeCloseTo(0.0722, 4);
  });

  it('gives the ratios everyone knows', () => {
    expect(contrast('#000', '#fff')).toBe(21);
    expect(contrast('#fff', '#000')).toBe(21);
    expect(contrast('#fff', '#fff')).toBe(1);
    // the lightest grey that passes AA on white, and the one just above it that does not
    expect(contrast('#767676', '#fff')).toBeCloseTo(4.54, 2);
    expect(contrast('#777777', '#fff')).toBeCloseTo(4.48, 2);
    expect(contrast('#ff0000', '#fff')).toBeCloseTo(4, 2);
    expect(contrast('#0000ff', '#fff')).toBeCloseTo(8.59, 2);
  });

  it('mixes a colour that is not solid with what is under it', () => {
    expect(blend(colour('rgb(0 0 0 / 0.5)'), colour('#fff'))).toEqual({ r: 0.5, g: 0.5, b: 0.5, alpha: 1 });
    expect(contrast('rgb(0 0 0 / 0.5)', '#fff')).toBeCloseTo(ratio(colour('rgb(127.5 127.5 127.5)'), colour('#fff')), 6);
    // a background that is not solid lies on white
    expect(contrast('#000', 'rgb(0 0 0 / 0)')).toBe(21);
  });

  it('writes a ratio without rounding up', () => {
    expect(written(21)).toBe('21');
    expect(written(4.5)).toBe('4.5');
    expect(written(4.4999)).toBe('4.49');
    expect(written(4.546)).toBe('4.54');
    expect(written(1)).toBe('1');
  });
});

describe('nearest', () => {
  it('keeps a colour that already passes', () => {
    expect(nearest(colour('#000'), colour('#fff'), 4.5)).toEqual({ hex: '#000000', ratio: 21 });
  });

  it('finds the nearest text colour that passes, close to the threshold', () => {
    const grey = nearest(colour('#999999'), colour('#ffffff'), 4.5)!;
    expect(contrast(grey.hex, '#fff')).toBeGreaterThanOrEqual(4.5);
    expect(grey.ratio).toBeLessThan(4.7);
    // still a grey, and darker
    expect(grey.hex.slice(1, 3)).toBe(grey.hex.slice(3, 5));
    expect(parseInt(grey.hex.slice(1, 3), 16)).toBeLessThan(0x99);
  });

  it('keeps the hue', () => {
    const orange = nearest(colour('#ff8800'), colour('#ffffff'), 4.5)!;
    expect(orange.ratio).toBeGreaterThanOrEqual(4.5);
    const read = parse(orange.hex);
    expect(read.ok).toBe(true);
    // red is up, blue is down: still an orange-brown
    const [r, g, b] = orange.hex.match(/[0-9a-f]{2}/g)!.map((pair) => parseInt(pair, 16));
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('goes lighter on a dark background', () => {
    const light = nearest(colour('#333333'), colour('#000000'), 7)!;
    expect(light.ratio).toBeGreaterThanOrEqual(7);
    expect(parseInt(light.hex.slice(1, 3), 16)).toBeGreaterThan(0x33);
  });

  it('changes the background instead, when asked', () => {
    const background = nearest(colour('#eeeeee'), colour('#777777'), 4.5, false)!;
    expect(contrast('#777777', background.hex)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives up when no lightness gets there', () => {
    // nothing reaches 21:1 against a mid grey
    expect(nearest(colour('#808080'), colour('#777777'), 21)).toBeNull();
  });
});
