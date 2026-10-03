import { describe, expect, it } from 'vitest';
import { describeKey, keyCheck, physical, ratioText, report, size, type KeyPress } from './logic';

const press = (over: Partial<KeyPress>): KeyPress => ({
  key: 'a',
  code: 'KeyA',
  keyCode: 65,
  location: 0,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  ...over
});

describe('sizes', () => {
  it('writes a size and a pixel ratio', () => {
    expect(size([1200, 800])).toBe('1200 × 800');
    expect(ratioText(2)).toBe('2');
    expect(ratioText(1.5)).toBe('1.5');
    expect(ratioText(2.625)).toBe('2.63');
    expect(ratioText(1.100000023841858)).toBe('1.1');
  });

  it('gives the pixels the screen really has', () => {
    expect(physical([390, 844], 3)).toEqual([1170, 2532]);
    expect(physical([412, 915], 2.625)).toEqual([1082, 2402]);
    expect(physical([1200, 800], 1)).toEqual([1200, 800]);
  });
});

describe('describeKey', () => {
  it('describes a plain key', () => {
    expect(describeKey(press({}))).toEqual({ key: 'a', code: 'KeyA', keyCode: 65, location: 'standard', modifiers: [], repeat: false });
  });

  it('lists the modifiers that are held, in the order of a shortcut', () => {
    expect(describeKey(press({ key: 'S', code: 'KeyS', keyCode: 83, metaKey: true, shiftKey: true, ctrlKey: true, altKey: true })).modifiers).toEqual([
      'Ctrl',
      'Alt',
      'Shift',
      'Meta'
    ]);
    expect(describeKey(press({ shiftKey: true })).modifiers).toEqual(['Shift']);
  });

  it('writes out a space, and says where a key is', () => {
    expect(describeKey(press({ key: ' ', code: 'Space', keyCode: 32 })).key).toBe('Space (" ")');
    expect(describeKey(press({ key: 'Shift', code: 'ShiftRight', keyCode: 16, location: 2, shiftKey: true }))).toMatchObject({
      location: 'right',
      modifiers: ['Shift']
    });
    expect(describeKey(press({ key: '1', code: 'Numpad1', keyCode: 97, location: 3 })).location).toBe('numpad');
    expect(describeKey(press({ location: 9 })).location).toBe('standard');
    expect(describeKey(press({ repeat: true })).repeat).toBe(true);
  });
});

describe('keyCheck', () => {
  it('writes the comparison to use in code', () => {
    expect(keyCheck({ key: 'a', code: 'KeyA' })).toBe("event.code === 'KeyA'");
    expect(keyCheck({ key: 'Enter', code: '' })).toBe("event.key === 'Enter'");
    expect(keyCheck({ key: "'", code: '' })).toBe("event.key === '\\''");
  });
});

describe('report', () => {
  it('writes names and values as lines, without the empty ones', () => {
    expect(
      report([
        ['Viewport', '1200 × 800'],
        ['Memory', ''],
        ['Pixel ratio', '2']
      ])
    ).toBe('Viewport: 1200 × 800\nPixel ratio: 2');
    expect(report([])).toBe('');
  });
});
