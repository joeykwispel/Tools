/**
 * Favourites, as pure functions. A favourite is kept per tool slug together with when it last changed, and a removed
 * favourite stays behind as `starred: false`. That memory is what lets two devices agree: per slug, the last change wins.
 */

/** One favourite, or the memory of one that was removed. `at` is the time of the last change, in ms since 1970. */
export interface Mark {
  starred: boolean;
  at: number;
}

/** Slug → mark. */
export type Favorites = Record<string, Mark>;

/** A row of public.tool_favorites, without the user id. */
export interface FavoriteRow {
  slug: string;
  starred: boolean;
  changed_at: string;
}

/** The same rule as the registry and the database: lowercase words joined by dashes. */
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 64;
/** More than the registry will ever hold; the database enforces the same limit per user. */
export const MAX_FAVORITES = 200;

const validSlug = (slug: string) => slug.length <= MAX_SLUG_LENGTH && SLUG.test(slug);

export const isFavorite = (favorites: Favorites, slug: string) => favorites[slug]?.starred === true;

/** The starred slugs, oldest first, so a new favourite is added at the end. */
export const list = (favorites: Favorites): string[] =>
  Object.keys(favorites)
    .filter((slug) => favorites[slug].starred)
    .sort((a, b) => favorites[a].at - favorites[b].at || a.localeCompare(b));

/** Stars or unstars a tool. Returns a new object; an invalid slug changes nothing. */
export function toggle(favorites: Favorites, slug: string, now = Date.now()): Favorites {
  if (!validSlug(slug)) return favorites;
  const previous = favorites[slug];
  // Never go back in time: after a clock correction this change must still beat the previous one.
  const at = Math.max(now, (previous?.at ?? 0) + 1);
  return { ...favorites, [slug]: { starred: !previous?.starred, at } };
}

/** True when `a` should replace `b`. On the same millisecond a star beats a removal, on every device alike. */
const wins = (a: Mark, b: Mark) => (a.at !== b.at ? a.at > b.at : a.starred && !b.starred);

/** Per slug, the last change wins. The order of the arguments does not matter. */
export function merge(a: Favorites, b: Favorites): Favorites {
  const out: Favorites = { ...a };
  for (const [slug, mark] of Object.entries(b)) {
    if (!out[slug] || wins(mark, out[slug])) out[slug] = mark;
  }
  return out;
}

/** The marks in `local` that `cloud` does not have yet, or has an older version of: what has to be sent. */
export function changedSince(local: Favorites, cloud: Favorites): Favorites {
  const out: Favorites = {};
  for (const [slug, mark] of Object.entries(local)) {
    if (!cloud[slug] || wins(mark, cloud[slug])) out[slug] = mark;
  }
  return out;
}

/** Who this device's favourites belong to: nobody yet, the user signing in, or another account that used this browser. */
export type Owner = 'none' | 'self' | 'other';

/**
 * What to do when a user signs in: what this device shows from now on, and what to send to the database.
 * Favourites made while signed out are added to the account. Favourites that belong to another account are not:
 * the device then simply takes over what the new account has.
 */
export function reconcile({ local, cloud, owner }: { local: Favorites; cloud: Favorites; owner: Owner }): { merged: Favorites; push: Favorites } {
  if (owner === 'other') return { merged: cloud, push: {} };
  return { merged: merge(local, cloud), push: changedSince(local, cloud) };
}

/** Reads favourites from storage or any other untrusted source: keeps what is valid, drops the rest. */
export function parse(raw: unknown): Favorites {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const entries: [string, Mark][] = [];
  for (const [slug, value] of Object.entries(raw)) {
    if (!validSlug(slug) || !value || typeof value !== 'object') continue;
    const { starred, at } = value as Partial<Mark>;
    if (typeof starred !== 'boolean' || typeof at !== 'number' || !Number.isFinite(at) || at < 0) continue;
    entries.push([slug, { starred, at }]);
  }
  // over the limit: keep the most recent changes
  entries.sort((a, b) => b[1].at - a[1].at);
  return Object.fromEntries(entries.slice(0, MAX_FAVORITES));
}

export const toRows = (favorites: Favorites): FavoriteRow[] =>
  Object.entries(favorites).map(([slug, mark]) => ({ slug, starred: mark.starred, changed_at: new Date(mark.at).toISOString() }));

export function fromRows(rows: readonly FavoriteRow[]): Favorites {
  const raw: Record<string, Mark> = {};
  for (const row of rows) raw[row.slug] = { starred: row.starred, at: Date.parse(row.changed_at) };
  return parse(raw);
}
