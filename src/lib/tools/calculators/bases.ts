/** A whole number in the bases a developer reads: binary, octal, decimal and hexadecimal. As large as it needs to be. */

export type Base = 2 | 8 | 10 | 16;
export const BASES: Base[] = [2, 8, 10, 16];

export type Read = { ok: true; value: bigint; base: Base } | { ok: false; error: 'empty' | 'digits' };

const PREFIX: Record<Base, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };
const DIGITS: Record<Base, RegExp> = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[\da-f]+$/ };

/**
 * Reads a number. With 'auto' the prefix says the base (0x, 0b, 0o) and without one it is decimal; with a base given,
 * its own prefix may be there. Spaces and underscores between digits are fine, and a minus in front.
 */
export function read(text: string, base: Base | 'auto' = 'auto'): Read {
  let digits = text.toLowerCase().replace(/[\s_]/g, '');
  if (!digits) return { ok: false, error: 'empty' };
  const negative = digits.startsWith('-');
  if (negative || digits.startsWith('+')) digits = digits.slice(1);
  const used: Base = base === 'auto' ? (BASES.find((known) => known !== 10 && digits.startsWith(PREFIX[known])) ?? 10) : base;
  if (PREFIX[used] && digits.startsWith(PREFIX[used])) digits = digits.slice(2);
  if (!DIGITS[used].test(digits)) return { ok: false, error: 'digits' };
  const value = BigInt(PREFIX[used] + digits);
  return { ok: true, value: negative ? -value : value, base: used };
}

/** The number in a base. `group` puts a space between every four digits of binary and hexadecimal, from the right. */
export function write(value: bigint, base: Base, group = false): string {
  const digits = (value < 0n ? -value : value).toString(base);
  const size = base === 2 || base === 16 ? 4 : 0;
  const grouped = group && size ? digits.replace(new RegExp(`\\B(?=(.{${size}})+$)`, 'g'), ' ') : digits;
  return (value < 0n ? '-' : '') + grouped;
}

/** How many bits it takes to write the number, without its sign. */
export const bits = (value: bigint) => (value < 0n ? -value : value).toString(2).length;

/** The character with this number as its code point, when there is one that can be shown. */
export function character(value: bigint): string {
  if (value < 0x20n || value > 0x10ffffn || (value >= 0x7fn && value < 0xa0n) || (value >= 0xd800n && value <= 0xdfffn)) return '';
  return String.fromCodePoint(Number(value));
}
