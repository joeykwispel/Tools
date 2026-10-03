/**
 * What a browser can say about itself, shaped for a bug report. The reading is done in Tool.svelte, where there is a
 * browser; here is what does not need one: sizes, the description of a key press, and the report as text.
 */

export type Size = [width: number, height: number];

/** 1200 × 800 */
export const size = ([width, height]: Size) => `${width} × ${height}`;

/** A size in CSS pixels as the pixels the screen really has: times the pixel ratio, rounded. */
export const physical = ([width, height]: Size, ratio: number): Size => [Math.round(width * ratio), Math.round(height * ratio)];

/** A pixel ratio with at most two decimals: 2, 1.5, 2.63. Zooming a page changes it, so it is rarely a round number. */
export const ratioText = (ratio: number) => String(Number(ratio.toFixed(2)));

/** What is needed of a keyboard event; a KeyboardEvent fits. */
export interface KeyPress {
  key: string;
  code: string;
  keyCode: number;
  location: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
}

export type KeyLocation = 'standard' | 'left' | 'right' | 'numpad';
const LOCATIONS: KeyLocation[] = ['standard', 'left', 'right', 'numpad'];

export interface KeyInfo {
  /** What the key types or does: "a", "A", "Enter". A space is written out, because it can not be seen */
  key: string;
  /** Which key on the keyboard it is, whatever the layout: KeyA, Enter. Empty when the browser does not say */
  code: string;
  /** The old number for the key. Deprecated, but still what a lot of code checks */
  keyCode: number;
  location: KeyLocation;
  /** The modifier keys that are held, in the order they are written in a shortcut */
  modifiers: string[];
  /** The key is held down and repeats */
  repeat: boolean;
}

export function describeKey(event: KeyPress): KeyInfo {
  const modifiers = [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta'].filter(
    (name) => typeof name === 'string'
  );
  return {
    key: event.key === ' ' ? 'Space (" ")' : event.key,
    code: event.code,
    keyCode: event.keyCode,
    location: LOCATIONS[event.location] ?? 'standard',
    modifiers,
    repeat: event.repeat
  };
}

/** The key as it is written in JavaScript: what to compare event.key or event.code with. */
export const keyCheck = (event: Pick<KeyPress, 'key' | 'code'>) =>
  event.code ? `event.code === '${event.code}'` : `event.key === '${event.key.replace(/[\\']/g, '\\$&')}'`;

/** Names and values as lines of text, to paste into a bug report. Rows without a value are left out. */
export const report = (rows: [name: string, value: string][]) =>
  rows
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n');
