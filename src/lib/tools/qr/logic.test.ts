import { describe, expect, it } from 'vitest';
import { make, path, toSvg, wifi, type Matrix } from './logic';

const matrix = (text: string, level?: 'L' | 'M' | 'Q' | 'H'): Matrix => {
  const made = make(text, level);
  if (!made.ok) throw new Error(made.error);
  return made.matrix;
};
const draw = (m: Matrix) => m.map((row) => row.map((dark) => (dark ? '#' : '.')).join(''));

/** The pattern in three corners of every QR code, by which a scanner finds it. */
const FINDER = ['#######', '#.....#', '#.###.#', '#.###.#', '#.###.#', '#.....#', '#######'];

describe('make', () => {
  it('gives a square code with the three finder patterns', () => {
    const rows = draw(matrix('https://tools.joeyoosenbrug.nl'));
    const size = rows.length;
    expect(rows.every((row) => row.length === size)).toBe(true);
    expect(rows.slice(0, 7).map((row) => row.slice(0, 7))).toEqual(FINDER);
    expect(rows.slice(0, 7).map((row) => row.slice(size - 7))).toEqual(FINDER);
    expect(rows.slice(size - 7).map((row) => row.slice(0, 7))).toEqual(FINDER);
    // the fourth corner has none
    expect(rows.slice(size - 7).map((row) => row.slice(size - 7))).not.toEqual(FINDER);
  });

  it('takes the smallest size that holds the text', () => {
    expect(make('hi')).toMatchObject({ ok: true, version: 1 });
    expect(matrix('hi')).toHaveLength(21);
    const long = make('x'.repeat(300));
    expect(long.ok && long.version).toBeGreaterThan(8);
    expect(long.ok && long.matrix.length).toBe(long.ok ? long.version * 4 + 17 : 0);
  });

  it('needs a larger code for more error correction', () => {
    const text = 'x'.repeat(100);
    expect(matrix(text, 'H').length).toBeGreaterThan(matrix(text, 'L').length);
  });

  it('gives the same code for the same text, and another for another text', () => {
    expect(draw(matrix('same'))).toEqual(draw(matrix('same')));
    expect(draw(matrix('same'))).not.toEqual(draw(matrix('other')));
  });

  it('holds every character as UTF-8', () => {
    // é is two bytes in UTF-8 and one in Latin-1: 16 of them fit version 1 at level L (17 bytes) only as Latin-1
    expect(make('é'.repeat(16), 'L')).toMatchObject({ ok: true, version: 2 });
    expect(make('e'.repeat(16), 'L')).toMatchObject({ ok: true, version: 1 });
    expect(make('日本語 😀').ok).toBe(true);
  });

  it('says so when the text is empty or does not fit', () => {
    expect(make('')).toEqual({ ok: false, error: 'empty' });
    expect(make('x'.repeat(3000))).toEqual({ ok: false, error: 'tooLong' });
    expect(make('x'.repeat(2953), 'L').ok).toBe(true);
    expect(make('x'.repeat(2954), 'L')).toEqual({ ok: false, error: 'tooLong' });
  });
});

describe('path and toSvg', () => {
  const small: Matrix = [
    [true, true, false],
    [false, false, true],
    [true, false, true]
  ];

  it('joins neighbours in a row into one rectangle, moved in by the margin', () => {
    expect(path(small, 0)).toBe('M0 0h2v1h-2zM2 1h1v1h-1zM0 2h1v1h-1zM2 2h1v1h-1z');
    expect(path(small, 4)).toBe('M4 4h2v1h-2zM6 5h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1z');
  });

  it('writes an SVG document with a white background and a quiet zone', () => {
    const svg = toSvg(small);
    expect(svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 11" shape-rendering="crispEdges"><rect width="11" height="11" fill="#fff"/><path d="M4 4h2v1h-2zM6 5h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1z" fill="#000"/></svg>'
    );
    expect(toSvg(matrix('hi'))).toContain('viewBox="0 0 29 29"');
  });

  it('draws exactly the dark squares', () => {
    const m = matrix('count the squares');
    const dark = m.flat().filter(Boolean).length;
    const drawn = [...path(m).matchAll(/h(\d+)v1/g)].reduce((sum, [, width]) => sum + Number(width), 0);
    expect(drawn).toBe(dark);
  });
});

describe('wifi', () => {
  it('writes the settings of a network the way a camera reads them', () => {
    expect(wifi({ ssid: 'Home', password: 'secret123', security: 'WPA' })).toBe('WIFI:T:WPA;S:Home;P:secret123;;');
    expect(wifi({ ssid: 'Cafe', password: '', security: 'nopass' })).toBe('WIFI:T:nopass;S:Cafe;;');
    expect(wifi({ ssid: 'Hidden', password: 'x', security: 'WEP', hidden: true })).toBe('WIFI:T:WEP;S:Hidden;P:x;H:true;;');
  });

  it('escapes the characters that have a meaning in the format', () => {
    expect(wifi({ ssid: 'My;Net:work', password: 'p\\a"s,s', security: 'WPA' })).toBe('WIFI:T:WPA;S:My\\;Net\\:work;P:p\\\\a\\"s\\,s;;');
  });
});
