import { parse, type Favorites } from './logic';

/** localStorage keys. The owner is the id of the account these favourites were last synced with. */
export const FAVORITES_KEY = 'tools:favorites';
export const OWNER_KEY = 'tools:favorites-owner';

/** This device's favourites. Empty when there are none, or when storage is unavailable or holds something else. */
export function load(): Favorites {
  try {
    return parse(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? 'null'));
  } catch {
    return {};
  }
}

export function save(favorites: Favorites): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    /* storage unavailable or full: the favourites then last until the tab closes */
  }
}

export function loadOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

export function saveOwner(userId: string): void {
  try {
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* storage unavailable */
  }
}
