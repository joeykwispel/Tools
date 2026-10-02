import { auth, type AuthUser } from '$lib/cloud/auth.svelte';
import { supabase } from '$lib/cloud/supabase';
import { fromRows, isFavorite, list, merge, parse, reconcile, toRows, toggle, type FavoriteRow, type Favorites } from './logic';
import { FAVORITES_KEY, load, loadOwner, save, saveOwner } from './storage';

/** 'local' when signed out: the favourites then live in this browser only. */
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

const TABLE = 'tool_favorites';
const COLUMNS = 'slug, starred, changed_at';

/**
 * The favourites the UI reads. They always live in localStorage, so starring works signed out and offline.
 * Signed in, they are also kept in the user's rows of public.tool_favorites: merged on sign-in, and sent on every change.
 * Dropping sign-in means deleting src/lib/cloud, the sync half of this file and the init() calls.
 */
class FavoritesStore {
  items = $state<Favorites>({});
  sync = $state<SyncStatus>('local');

  #started = false;
  #userId: string | null = null;
  /** Database work runs one after the other, so a quick double click can't overtake itself. */
  #queue: Promise<void> = Promise.resolve();

  /** The starred slugs, oldest first. */
  get slugs(): string[] {
    return list(this.items);
  }

  has(slug: string): boolean {
    return isFavorite(this.items, slug);
  }

  /** Reads this device's favourites and starts following the sign-in state. Call once in the browser. */
  init(): void {
    if (this.#started) return;
    this.#started = true;
    this.items = load();
    // another tab starred something
    window.addEventListener('storage', (e) => {
      if (e.key === FAVORITES_KEY) this.items = merge(this.items, load());
    });
    auth.onChange((user) => this.#onUser(user));
  }

  toggle(slug: string): void {
    const next = toggle(this.items, slug);
    if (next === this.items) return;
    this.items = next;
    save(next);
    const userId = this.#userId;
    if (userId) this.#run(() => this.#push(userId, { [slug]: next[slug] }));
  }

  #onUser(user: AuthUser | null): void {
    this.#userId = user?.id ?? null;
    if (user) this.#run(() => this.#syncOnSignIn(user.id));
    else this.sync = 'local';
  }

  /** Pulls the user's rows, merges this device's favourites in, and sends back what the database did not have. */
  async #syncOnSignIn(userId: string): Promise<void> {
    const client = await supabase();
    if (!client) return;
    // Row Level Security already limits this to the user's own rows
    const { data, error } = await client.from(TABLE).select(COLUMNS);
    if (error) throw error;
    const owner = loadOwner();
    const { merged, push } = reconcile({
      local: this.items,
      cloud: fromRows((data ?? []) as FavoriteRow[]),
      owner: owner === null ? 'none' : owner === userId ? 'self' : 'other'
    });
    this.#set(merged);
    saveOwner(userId);
    await this.#push(userId, push);
  }

  /** Sends marks to the database and takes over what it stored: it may have kept a newer change from another device. */
  async #push(userId: string, marks: Favorites): Promise<void> {
    const rows = toRows(marks).map((row) => ({ ...row, user_id: userId }));
    if (!rows.length) return;
    const client = await supabase();
    if (!client) return;
    const { data, error } = await client.from(TABLE).upsert(rows, { onConflict: 'user_id,slug' }).select(COLUMNS);
    if (error) throw error;
    // only if nothing changed here in the meantime: a click made while waiting must not be undone
    const stored = fromRows((data ?? []) as FavoriteRow[]);
    const untouched = Object.fromEntries(Object.entries(stored).filter(([slug]) => this.items[slug]?.at === marks[slug]?.at));
    if (Object.keys(untouched).length) this.#set({ ...this.items, ...untouched });
  }

  #set(favorites: Favorites): void {
    this.items = parse(favorites);
    save(this.items);
  }

  #run(task: () => Promise<void>): void {
    this.sync = 'syncing';
    this.#queue = this.#queue.then(task).then(
      () => {
        if (this.#userId) this.sync = 'synced';
      },
      () => {
        // the favourites are safe in this browser; the next sign-in or page load sends them again
        this.sync = 'error';
      }
    );
  }
}

export const favorites = new FavoritesStore();
