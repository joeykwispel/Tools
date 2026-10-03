/** Sizes of data: bytes in steps of 1000 (kB, MB) and of 1024 (KiB, MiB), and bits as network speeds are given in. */

export type Family = 'decimal' | 'binary' | 'bits';

export interface Unit {
  id: string;
  /** How many bytes one of it is */
  bytes: number;
  family: Family;
}

export const UNITS: Unit[] = [
  { id: 'B', bytes: 1, family: 'decimal' },
  { id: 'kB', bytes: 1e3, family: 'decimal' },
  { id: 'MB', bytes: 1e6, family: 'decimal' },
  { id: 'GB', bytes: 1e9, family: 'decimal' },
  { id: 'TB', bytes: 1e12, family: 'decimal' },
  { id: 'PB', bytes: 1e15, family: 'decimal' },
  { id: 'KiB', bytes: 2 ** 10, family: 'binary' },
  { id: 'MiB', bytes: 2 ** 20, family: 'binary' },
  { id: 'GiB', bytes: 2 ** 30, family: 'binary' },
  { id: 'TiB', bytes: 2 ** 40, family: 'binary' },
  { id: 'PiB', bytes: 2 ** 50, family: 'binary' },
  { id: 'bit', bytes: 1 / 8, family: 'bits' },
  { id: 'kbit', bytes: 125, family: 'bits' },
  { id: 'Mbit', bytes: 125e3, family: 'bits' },
  { id: 'Gbit', bytes: 125e6, family: 'bits' }
];

const unit = (id: string) => UNITS.find((known) => known.id === id);

/** A number of a unit in every unit. Empty when the unit is not known or the number is not one. */
export function convert(value: number, from: string): { unit: Unit; value: number }[] {
  const source = unit(from);
  if (!source || !Number.isFinite(value)) return [];
  const bytes = value * source.bytes;
  return UNITS.map((known) => ({ unit: known, value: bytes / known.bytes }));
}

/** A number to read: whole when it is, otherwise six significant digits, without zeros at the end. */
export function show(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value) && Math.abs(value) < 1e21) return String(value);
  return String(Number(value.toPrecision(6)));
}
