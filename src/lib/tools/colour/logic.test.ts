import { describe, expect, it } from 'vitest';
import { fromOklch, parse, shades, toHex, toHslText, toName, toOklch, toOklchText, toRgb, type Colour } from './logic';
import { BY_HEX, NAMES } from './names';

const colour = (text: string): Colour => {
  const read = parse(text);
  if (!read.ok) throw new Error(`not a colour: ${text}`);
  return read.colour;
};
const hex = (text: string) => toHex(colour(text));

describe('parse', () => {
  it('reads hex in every length, with or without #', () => {
    expect(parse('#ff8800')).toEqual({ ok: true, colour: { r: 1, g: 136 / 255, b: 0, alpha: 1 }, notation: 'hex', mapped: false });
    expect(hex('#f80')).toBe('#ff8800');
    expect(hex('#F80')).toBe('#ff8800');
    expect(hex('ff8800')).toBe('#ff8800');
    expect(hex('#ff880080')).toBe('#ff880080');
    expect(colour('#f808').alpha).toBeCloseTo(136 / 255);
    expect(parse('f80')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('#ff88')).toMatchObject({ ok: true });
    expect(parse('#ff8')).toMatchObject({ ok: true });
    expect(parse('#ff88000')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('#gg8800')).toEqual({ ok: false, error: 'invalid' });
  });

  it('reads rgb() in the new and the old way', () => {
    for (const text of ['rgb(255 136 0)', 'rgb(255, 136, 0)', 'RGB(255,136,0)', 'rgba(255, 136, 0, 1)', 'rgb(100% 53.3333% 0%)', 'rgb(255 136 none)']) {
      expect(hex(text), text).toBe('#ff8800');
    }
    expect(colour('rgb(255 136 0 / 0.5)').alpha).toBe(0.5);
    expect(colour('rgba(255, 136, 0, 50%)').alpha).toBe(0.5);
    expect(hex('rgb(300 -20 0)')).toBe('#ff0000');
    expect(parse('rgb(255 136)')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('rgb(255 136 0 0.5 1)')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('rgb(255 136 0 /)')).toEqual({ ok: false, error: 'invalid' });
    expect(parse('rgb(a b c)')).toEqual({ ok: false, error: 'invalid' });
  });

  it('reads hsl() with any unit of angle', () => {
    for (const text of ['hsl(32 100% 50%)', 'hsl(32, 100%, 50%)', 'hsla(32deg, 100%, 50%, 1)', 'hsl(0.0889turn 100% 50%)', 'hsl(32 100 50)']) {
      expect(hex(text), text).toBe('#ff8800');
    }
    expect(hex('hsl(0 100% 50%)')).toBe('#ff0000');
    expect(hex('hsl(120 100% 25%)')).toBe('#008000');
    expect(hex('hsl(240 100% 50%)')).toBe('#0000ff');
    expect(hex('hsl(-120 100% 50%)')).toBe('#0000ff');
    expect(hex('hsl(3.14159rad 100% 50%)')).toBe('#00ffff');
    expect(hex('hsl(200grad 100% 50%)')).toBe('#00ffff');
    expect(colour('hsl(32 100% 50% / 25%)').alpha).toBe(0.25);
  });

  it('reads oklch(), and brings a colour sRGB can not show inside', () => {
    expect(hex('oklch(62.8% 0.2577 29.23)')).toBe('#ff0000');
    expect(hex('oklch(0.628 0.2577 29.23)')).toBe('#ff0000');
    expect(hex('oklch(100% 0 0)')).toBe('#ffffff');
    expect(hex('oklch(0% 0 0)')).toBe('#000000');
    expect(parse('oklch(62.8% 0.2577 29.23)')).toMatchObject({ notation: 'oklch', mapped: false });
    // far more chroma than any screen shows: same lightness and hue, less chroma
    const vivid = parse('oklch(70% 0.4 145)');
    expect(vivid).toMatchObject({ ok: true, mapped: true });
    const [L, , h] = toOklch((vivid as { colour: Colour }).colour);
    expect(L).toBeCloseTo(0.7, 2);
    expect(h).toBeCloseTo(145, 0);
    // 100% chroma is 0.4
    expect(parse('oklch(70% 100% 145)')).toMatchObject({ mapped: true });
  });

  it('reads the names of colours', () => {
    expect(parse('rebeccapurple')).toMatchObject({ ok: true, notation: 'name', colour: { r: 0x66 / 255, g: 0x33 / 255, b: 0x99 / 255, alpha: 1 } });
    expect(hex('CornflowerBlue')).toBe('#6495ed');
    expect(parse('transparent')).toMatchObject({ ok: true, colour: { alpha: 0 } });
    expect(parse('reddish')).toEqual({ ok: false, error: 'invalid' });
  });

  it('says when there is nothing to read', () => {
    expect(parse('')).toEqual({ ok: false, error: 'empty' });
    expect(parse('   ')).toEqual({ ok: false, error: 'empty' });
    expect(parse('lab(50% 40 60)')).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('writing', () => {
  it('writes each notation', () => {
    const orange = colour('#ff8800');
    expect(toHex(orange)).toBe('#ff8800');
    expect(toRgb(orange)).toBe('rgb(255 136 0)');
    expect(toRgb(orange, true)).toBe('rgb(255, 136, 0)');
    expect(toHslText(orange)).toBe('hsl(32 100% 50%)');
    expect(toHslText(orange, true)).toBe('hsl(32, 100%, 50%)');
    expect(toOklchText(colour('#ff0000'))).toBe('oklch(62.8% 0.2577 29.23)');
    expect(toOklchText(colour('#0000ff'))).toBe('oklch(45.2% 0.3132 264.05)');
    expect(toOklchText(colour('#808080'))).toBe('oklch(59.99% 0 0)');
  });

  it('writes see-through colours with their alpha', () => {
    const half = colour('rgb(255 136 0 / 0.5)');
    expect(toHex(half)).toBe('#ff880080');
    expect(toRgb(half)).toBe('rgb(255 136 0 / 0.5)');
    expect(toRgb(half, true)).toBe('rgba(255, 136, 0, 0.5)');
    expect(toHslText(half)).toBe('hsl(32 100% 50% / 0.5)');
    expect(toHslText(half, true)).toBe('hsla(32, 100%, 50%, 0.5)');
    expect(toOklchText(half)).toMatch(/ \/ 0\.5\)$/);
  });

  it('comes back to the same colour from every notation', () => {
    for (const text of ['#ff8800', '#123456', '#000000', '#ffffff', '#7f7f7f', '#00ff00', '#663399', '#fefefe', '#010203']) {
      const start = colour(text);
      for (const written of [toRgb(start), toRgb(start, true), toHslText(start), toHslText(start, true), toOklchText(start)]) {
        expect(hex(written), `${text} as ${written}`).toBe(text);
      }
    }
  });

  it('knows the name of a colour', () => {
    expect(toName(colour('#663399'))).toBe('rebeccapurple');
    expect(toName(colour('#808080'))).toBe('gray');
    expect(toName(colour('#00ffff'))).toBe('aqua');
    expect(toName(colour('#ff00ff'))).toBe('fuchsia');
    expect(toName(colour('#ff8801'))).toBeNull();
    expect(toName(colour('#66339980'))).toBeNull();
    expect(toName(colour('transparent'))).toBe('transparent');
  });
});

describe('names', () => {
  it('has the colours of CSS', () => {
    expect(Object.keys(NAMES)).toHaveLength(148);
    expect(Object.values(NAMES).every((value) => /^[0-9a-f]{6}$/.test(value))).toBe(true);
    // every colour has one name back, and the names it has are ones CSS has for it
    for (const [value, name] of Object.entries(BY_HEX)) expect(NAMES[name]).toBe(value);
  });
});

describe('shades and fromOklch', () => {
  it('goes from light to dark in the same hue', () => {
    const scale = shades(colour('#ff8800'));
    expect(scale).toHaveLength(10);
    const lightness = scale.map((value) => toOklch(colour(value))[0]);
    expect(lightness.every((L, i) => i === 0 || L < lightness[i - 1])).toBe(true);
    for (const value of scale.slice(2, 8)) expect(toOklch(colour(value))[2]).toBeGreaterThan(40);
    for (const value of scale.slice(2, 8)) expect(toOklch(colour(value))[2]).toBeLessThan(75);
    // a grey stays grey
    expect(shades(colour('#808080')).every((value) => value.slice(1, 3) === value.slice(3, 5) && value.slice(3, 5) === value.slice(5, 7))).toBe(true);
  });

  it('keeps a colour that fits as it is', () => {
    const { rgb, mapped } = fromOklch(0.628, 0.2577, 29.23);
    expect(mapped).toBe(false);
    expect(rgb.map((channel) => Math.round(channel * 255))).toEqual([255, 0, 0]);
  });
});
