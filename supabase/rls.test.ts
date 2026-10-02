import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs the real migrations on an in-memory Postgres (PGlite) with a minimal stand-in for Supabase's auth schema,
 * then acts as different users through the same roles and JWT claim Supabase uses. This proves the RLS policies
 * and the trigger, not a mock of them.
 */

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CAROL = '33333333-3333-4333-8333-333333333333';

let db: PGlite;

/** Runs `sql` as the given Postgres role, with `sub` as the JWT subject (what auth.uid() returns). */
async function as(role: 'anon' | 'authenticated', sub: string | null, sql: string, params: unknown[] = []) {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub ?? '']);
    await db.exec(`set local role ${role}`);
    const result = await db.query<Record<string, unknown>>(sql, params);
    await db.exec('commit');
    return result;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}

/** What supabase-js sends for `.upsert(row, { onConflict: 'user_id,slug' })`. */
const UPSERT = `
  insert into public.tool_favorites (user_id, slug, starred, changed_at) values ($1, $2, $3, $4)
  on conflict (user_id, slug) do update set starred = excluded.starred, changed_at = excluded.changed_at
  returning slug, starred, changed_at`;

const row = async (user: string, slug: string) =>
  (
    await db.query<{ starred: boolean; changed_at: Date }>(`select starred, changed_at from public.tool_favorites where user_id = $1 and slug = $2`, [
      user,
      slug
    ])
  ).rows[0];

beforeAll(async () => {
  db = new PGlite();
  // What Supabase provides out of the box: roles, the auth schema and auth.uid()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    -- Supabase grants everything on public tables to these roles by default; RLS has to do the protecting.
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  const dir = new URL('./migrations/', import.meta.url);
  for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
  await db.exec(
    `insert into auth.users (id, email) values ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com'), ('${CAROL}', 'carol@example.com')`
  );
  await db.exec(`insert into public.tool_favorites (user_id, slug, changed_at) values ('${BOB}', 'jwt', '2026-10-01T10:00:00Z')`);
});

afterAll(async () => {
  await db?.close();
});

describe('tool_favorites RLS', () => {
  it('a user can star a tool and read it back, and sees only their own rows', async () => {
    await as('authenticated', ALICE, UPSERT, [ALICE, 'json', true, '2026-10-01T10:00:00Z']);
    const { rows } = await as('authenticated', ALICE, `select user_id, slug, starred from public.tool_favorites`);
    expect(rows).toEqual([{ user_id: ALICE, slug: 'json', starred: true }]);
  });

  it("a user cannot read, change or delete another user's rows", async () => {
    const read = await as('authenticated', ALICE, `select * from public.tool_favorites where user_id = $1`, [BOB]);
    expect(read.rows).toEqual([]);
    const updated = await as('authenticated', ALICE, `update public.tool_favorites set starred = false, changed_at = now() where user_id = $1`, [BOB]);
    const deleted = await as('authenticated', ALICE, `delete from public.tool_favorites where user_id = $1`, [BOB]);
    expect([updated.affectedRows, deleted.affectedRows]).toEqual([0, 0]);
    expect((await row(BOB, 'jwt')).starred).toBe(true);
  });

  it('a user cannot add a row for another user, or upsert over one', async () => {
    await expect(as('authenticated', ALICE, UPSERT, [BOB, 'regex', true, '2026-10-01T10:00:00Z'])).rejects.toThrow(/row-level security/);
    await expect(as('authenticated', ALICE, UPSERT, [BOB, 'jwt', false, '2026-10-02T10:00:00Z'])).rejects.toThrow();
    expect((await row(BOB, 'jwt')).starred).toBe(true);
  });

  it('a user cannot move their own row to another user', async () => {
    await expect(
      as('authenticated', ALICE, `update public.tool_favorites set user_id = $1, changed_at = now() where user_id = $2`, [BOB, ALICE])
    ).rejects.toThrow();
  });

  it('anonymous visitors cannot read or write at all', async () => {
    await expect(as('anon', null, `select * from public.tool_favorites`)).rejects.toThrow(/permission denied/);
    await expect(as('anon', null, UPSERT, [ALICE, 'jwt', true, '2026-10-01T10:00:00Z'])).rejects.toThrow(/permission denied/);
  });

  it('a user without a JWT subject sees nothing', async () => {
    const { rows } = await as('authenticated', null, `select * from public.tool_favorites`);
    expect(rows).toEqual([]);
  });

  it('a user can wipe their own favourites, and they go away with the account', async () => {
    await as('authenticated', CAROL, UPSERT, [CAROL, 'jwt', true, '2026-10-01T10:00:00Z']);
    const { affectedRows } = await as('authenticated', CAROL, `delete from public.tool_favorites where user_id = $1`, [CAROL]);
    expect(affectedRows).toBe(1);
    await as('authenticated', CAROL, UPSERT, [CAROL, 'json', true, '2026-10-01T10:00:00Z']);
    await db.query(`delete from auth.users where id = $1`, [CAROL]);
    const { rows } = await db.query(`select 1 from public.tool_favorites where user_id = $1`, [CAROL]);
    expect(rows).toEqual([]);
  });
});

describe('tool_favorites: the last change wins', () => {
  it('a newer change replaces the row, an older one leaves it as it is', async () => {
    await as('authenticated', ALICE, UPSERT, [ALICE, 'diff', true, '2026-10-01T10:00:00Z']);
    await as('authenticated', ALICE, UPSERT, [ALICE, 'diff', false, '2026-10-01T12:00:00Z']);
    expect((await row(ALICE, 'diff')).starred).toBe(false);

    // a phone that was offline sends the star it made at 11:00
    const { rows } = await as('authenticated', ALICE, UPSERT, [ALICE, 'diff', true, '2026-10-01T11:00:00Z']);
    expect((await row(ALICE, 'diff')).starred).toBe(false);
    // and is told what the database kept, so it can take that over
    expect(rows[0]).toMatchObject({ slug: 'diff', starred: false });
    expect((rows[0]['changed_at'] as Date).toISOString()).toBe('2026-10-01T12:00:00.000Z');
  });

  it('on the same instant a star beats a removal, whichever arrives first', async () => {
    await as('authenticated', ALICE, UPSERT, [ALICE, 'hash', true, '2026-10-01T10:00:00Z']);
    await as('authenticated', ALICE, UPSERT, [ALICE, 'hash', false, '2026-10-01T10:00:00Z']);
    expect((await row(ALICE, 'hash')).starred).toBe(true);

    await as('authenticated', ALICE, UPSERT, [ALICE, 'uuid', false, '2026-10-01T10:00:00Z']);
    await as('authenticated', ALICE, UPSERT, [ALICE, 'uuid', true, '2026-10-01T10:00:00Z']);
    expect((await row(ALICE, 'uuid')).starred).toBe(true);
  });

  it('a change dated in the future is stored as made now, so a fast clock cannot win forever', async () => {
    await as('authenticated', ALICE, UPSERT, [ALICE, 'cron', true, '2999-01-01T00:00:00Z']);
    const stored = (await row(ALICE, 'cron')).changed_at.getTime();
    expect(Math.abs(stored - Date.now())).toBeLessThan(60_000);
  });
});

describe('tool_favorites: sane values', () => {
  it('only accepts slugs that could be a tool', async () => {
    for (const bad of ['', 'JWT', 'a b', '../etc', '-a', 'a--b', '<script>', 'x'.repeat(65)]) {
      await expect(as('authenticated', ALICE, UPSERT, [ALICE, bad, true, '2026-10-01T10:00:00Z']), bad).rejects.toThrow(/check constraint/);
    }
  });

  it('stops at 200 rows per user, while changing an existing row still works', async () => {
    await db.exec(`insert into auth.users (id) values ('44444444-4444-4444-8444-444444444444')`);
    const DAVE = '44444444-4444-4444-8444-444444444444';
    await db.query(
      `insert into public.tool_favorites (user_id, slug, changed_at) select $1, 'tool-' || n, '2026-10-01T10:00:00Z' from generate_series(1, 200) n`,
      [DAVE]
    );
    await expect(as('authenticated', DAVE, UPSERT, [DAVE, 'one-too-many', true, '2026-10-01T10:00:00Z'])).rejects.toThrow(/too many favorites/);
    await as('authenticated', DAVE, UPSERT, [DAVE, 'tool-1', false, '2026-10-01T12:00:00Z']);
    expect((await row(DAVE, 'tool-1')).starred).toBe(false);
    // someone else's rows do not count towards the limit
    await as('authenticated', ALICE, UPSERT, [ALICE, 'timestamp', true, '2026-10-01T10:00:00Z']);
  });
});
