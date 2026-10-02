import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '$lib/cloud/auth.svelte';
import type { FavoriteRow } from './logic';
import { FAVORITES_KEY, OWNER_KEY } from './storage';

/**
 * The store against a stand-in for the database that follows the same rule as the trigger (the last change wins),
 * and a stand-in for sign-in. The real policies and trigger are proven in supabase/rls.test.ts.
 */

const T = Date.parse('2026-10-02T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const ADA: AuthUser = { id: 'ada', email: 'ada@example.com', name: 'Ada' };

const fake = vi.hoisted(() => ({
  cloud: new Map<string, { slug: string; starred: boolean; changed_at: string }>(),
  upserts: [] as { slug: string; starred: boolean; changed_at: string; user_id: string }[][],
  failing: false,
  signIn: (() => {}) as (user: { id: string; email: string | null; name: string | null } | null) => void
}));

vi.mock('$lib/cloud/auth.svelte', () => ({
  auth: {
    onChange: (fn: typeof fake.signIn) => {
      fake.signIn = fn;
      return () => {};
    }
  }
}));

vi.mock('$lib/cloud/supabase', () => ({
  supabase: async () => ({
    from: () => ({
      select: async () => (fake.failing ? { data: null, error: new Error('offline') } : { data: [...fake.cloud.values()], error: null }),
      upsert: (rows: (FavoriteRow & { user_id: string })[]) => ({
        select: async () => {
          if (fake.failing) return { data: null, error: new Error('offline') };
          fake.upserts.push(rows);
          for (const { slug, starred, changed_at } of rows) {
            const old = fake.cloud.get(slug);
            if (!old || changed_at > old.changed_at || (changed_at === old.changed_at && starred)) fake.cloud.set(slug, { slug, starred, changed_at });
          }
          return { data: rows.map((r) => fake.cloud.get(r.slug)), error: null };
        }
      })
    })
  })
}));

const stored = () => JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '{}');

async function start(local: Record<string, { starred: boolean; at: number }> = {}, owner?: string) {
  if (Object.keys(local).length) localStorage.setItem(FAVORITES_KEY, JSON.stringify(local));
  if (owner) localStorage.setItem(OWNER_KEY, owner);
  const { favorites } = await import('./favorites.svelte');
  favorites.init();
  return favorites;
}

beforeEach(() => {
  vi.resetModules();
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v)
  });
  vi.stubGlobal('window', { addEventListener: () => {} });
  fake.cloud.clear();
  fake.upserts.length = 0;
  fake.failing = false;
});

describe('signed out', () => {
  it('keeps favourites in this browser and sends nothing', async () => {
    const favorites = await start();
    favorites.toggle('jwt');
    favorites.toggle('json');
    favorites.toggle('json');
    expect(favorites.has('jwt')).toBe(true);
    expect(favorites.slugs).toEqual(['jwt']);
    expect(stored().jwt.starred).toBe(true);
    expect(stored().json.starred).toBe(false);
    expect(favorites.sync).toBe('local');
    expect(fake.upserts).toEqual([]);
  });

  it('reads them back on the next visit', async () => {
    const favorites = await start({ jwt: { starred: true, at: T } });
    expect(favorites.slugs).toEqual(['jwt']);
  });
});

describe('signing in', () => {
  it('merges this device with the account and sends only what the account was missing', async () => {
    fake.cloud.set('json', { slug: 'json', starred: true, changed_at: iso(T) });
    fake.cloud.set('diff', { slug: 'diff', starred: false, changed_at: iso(T + 50) });
    const favorites = await start({ jwt: { starred: true, at: T + 10 }, diff: { starred: true, at: T } });
    fake.signIn(ADA);
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));

    // diff was removed on another device after it was starred here
    expect(favorites.slugs).toEqual(['json', 'jwt']);
    expect(fake.upserts).toEqual([[{ slug: 'jwt', starred: true, changed_at: iso(T + 10), user_id: 'ada' }]]);
    expect(Object.keys(stored()).sort()).toEqual(['diff', 'json', 'jwt']);
    expect(localStorage.getItem(OWNER_KEY)).toBe('ada');
  });

  it('does not give the favourites of another account to the user who signs in', async () => {
    fake.cloud.set('json', { slug: 'json', starred: true, changed_at: iso(T) });
    const favorites = await start({ jwt: { starred: true, at: T + 10 } }, 'someone-else');
    fake.signIn(ADA);
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));
    expect(favorites.slugs).toEqual(['json']);
    expect(fake.upserts).toEqual([]);
    expect(stored()).toEqual({ json: { starred: true, at: T } });
  });

  it('sends each change made while signed in', async () => {
    const favorites = await start();
    fake.signIn(ADA);
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));
    favorites.toggle('regex');
    expect(favorites.sync).toBe('syncing');
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));
    favorites.toggle('regex');
    await vi.waitFor(() => expect(fake.upserts).toHaveLength(2));
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));
    expect(fake.upserts.map((rows) => rows.map((r) => [r.slug, r.starred, r.user_id]))).toEqual([[['regex', true, 'ada']], [['regex', false, 'ada']]]);
    expect(fake.cloud.get('regex')?.starred).toBe(false);
    expect(favorites.has('regex')).toBe(false);
  });

  it('keeps the favourites on the device after signing out, and stops sending', async () => {
    const favorites = await start();
    fake.signIn(ADA);
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));
    favorites.toggle('jwt');
    await vi.waitFor(() => expect(fake.upserts).toHaveLength(1));
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));
    fake.signIn(null);
    expect(favorites.sync).toBe('local');
    favorites.toggle('json');
    expect(favorites.slugs).toEqual(['jwt', 'json']);
    await new Promise((r) => setTimeout(r, 20));
    expect(fake.upserts).toHaveLength(1);
  });

  it('keeps working when the database cannot be reached, and catches up at the next sign-in', async () => {
    fake.failing = true;
    const favorites = await start({ jwt: { starred: true, at: T } });
    fake.signIn(ADA);
    await vi.waitFor(() => expect(favorites.sync).toBe('error'));
    favorites.toggle('json');
    await vi.waitFor(() => expect(favorites.sync).toBe('error'));
    expect(favorites.slugs).toEqual(['jwt', 'json']);
    expect(stored().json.starred).toBe(true);

    fake.failing = false;
    fake.signIn(null);
    fake.signIn(ADA);
    await vi.waitFor(() => expect(favorites.sync).toBe('synced'));
    expect([...fake.cloud.keys()].sort()).toEqual(['json', 'jwt']);
  });
});
