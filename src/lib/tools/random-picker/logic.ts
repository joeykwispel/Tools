/**
 * Picking from a list of names: one of them, all of them in a random order, or split into groups. What is random
 * comes from a function that is given, so the page can use the browser's randomness and a test its own.
 */

/** A whole number from 0 up to, but not including, `below`. */
export type Pick = (below: number) => number;

/** The names in a text: one per line, without the spaces around them and without empty lines. */
export const namesOf = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** The items in a random order, every order as likely as any other (Fisher–Yates). The list given is left as it is. */
export function shuffle<T>(items: readonly T[], pick: Pick): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The names that have not had a turn: each name as often as it is in the list, minus the times it was picked. */
export function waiting(names: readonly string[], picked: readonly string[]): string[] {
  const left = [...picked];
  return names.filter((name) => {
    const at = left.indexOf(name);
    if (at < 0) return true;
    left.splice(at, 1);
    return false;
  });
}

export interface Picked {
  name: string;
  /** Who has had a turn after this pick; starts over with only this name once everyone has been */
  picked: string[];
}

/**
 * Picks a name. With `fair`, nobody is picked again until everyone has been; after the last one it starts over.
 * Null when there are no names.
 */
export function pickOne(names: readonly string[], picked: readonly string[], pick: Pick, fair = true): Picked | null {
  if (!names.length) return null;
  if (!fair) return { name: names[pick(names.length)], picked: [] };
  const left = waiting(names, picked);
  const from = left.length ? left : [...names];
  const name = from[pick(from.length)];
  return { name, picked: left.length ? [...picked, name] : [name] };
}

/** The items dealt over `count` groups like cards, so the groups differ by one at most. Never more groups than items. */
export function groups<T>(items: readonly T[], count: number, pick: Pick): T[][] {
  const amount = Math.max(1, Math.min(Math.floor(count) || 1, items.length));
  const out: T[][] = Array.from({ length: items.length ? amount : 0 }, () => []);
  shuffle(items, pick).forEach((item, i) => out[i % amount].push(item));
  return out;
}
