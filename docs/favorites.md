# Favourites and sign-in

Star a tool and it is pinned for you. Without an account the favourites live in this browser. Sign in with Google and they follow you to your other devices. It works the way CodeGuessr syncs its stats: Supabase Auth (Google, PKCE) plus one small Postgres table protected by Row Level Security.

**Status:** live. The site uses the CodeGuessr Supabase project, so one account works on both.

## Rules

1. **Everything works signed out.** Favourites are always written to `localStorage` first; the database is a copy.
2. **Only favourites leave the browser.** What is sent is the slug of a tool, whether it is starred, and when that changed. Nothing you put into a tool is ever sent.
3. **The last change wins, per tool.** A removed favourite is kept as `starred: false`, so removing it on your laptop also removes it on your phone.
4. **Nothing about you is stored** besides what Supabase Auth keeps from Google (id, email, name). The avatar is not shown, so no image is loaded from Google.

## What is where

| File                                                    | What                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/lib/favorites/logic.ts`                            | Pure functions: `toggle`, `list`, `merge`, `changedSince`, `reconcile`, `parse`, row mapping |
| `src/lib/favorites/storage.ts`                          | `localStorage` (`tools:favorites`, `tools:favorites-owner`)                                  |
| `src/lib/favorites/favorites.svelte.ts`                 | The store the UI reads: `favorites.has(slug)`, `.toggle(slug)`, `.slugs`, `.sync`            |
| `src/lib/cloud/config.ts`                               | Supabase URL and publishable key (empty = sign-in off)                                       |
| `src/lib/cloud/supabase.ts`                             | The lazily loaded client                                                                     |
| `src/lib/cloud/auth.svelte.ts`                          | `auth.status`, `.user`, `.error`, `.signIn()`, `.signOut()`                                  |
| `supabase/migrations/20261002000000_tool_favorites.sql` | Table `public.tool_favorites`, its policies and the trigger                                  |
| `supabase/rls.test.ts`                                  | Runs the migration on an in-memory Postgres and proves the policies and the trigger          |

## The table

`public.tool_favorites (user_id, slug, starred, changed_at)`, primary key `(user_id, slug)`.

- Policies: a signed-in user can select, insert, update and delete rows where `user_id = auth.uid()`. Anonymous visitors have no access.
- A trigger keeps the newest change when an older one arrives late, stores a change dated in the future as made now, and stops at 200 rows per user.
- The slug must look like a tool slug and be at most 64 characters.

## Signing in on a device

`reconcile()` decides what happens with the favourites already on the device:

| The device's favourites belong to | Result                                                            |
| --------------------------------- | ----------------------------------------------------------------- |
| nobody (never signed in here)     | merged with the account, and the missing ones are sent            |
| the same account                  | merged, the newest change per tool wins                           |
| another account                   | replaced by what the account has; nothing from the device is sent |

Signing out leaves the favourites on the device.

## Setup

Done once, outside the code:

- The project is the CodeGuessr Supabase project. The table is named `tool_favorites` so it does not clash with CodeGuessr's tables.
- The migration was run in that project (SQL editor). A later migration is run the same way.
- Authentication → URL configuration → Redirect URLs lists `https://tools.joeyoosenbrug.nl/**`, plus `http://localhost:5173/**` and `http://localhost:4173/**` for local work. Without the first one, Google sends you back to CodeGuessr instead of here.
- The project URL and the publishable key are in `src/lib/cloud/config.ts`. The same host is in `connect-src` in `svelte.config.js`; change both together.

## In the page

- `AuthButton.svelte` in the header: the sign-in panel, or who is signed in, the sync state and sign out.
- `FavoriteStar.svelte` on every row and on a tool's own page; the starred tools are pinned above the list.
- `auth.init()` and `favorites.init()` run once, in the root layout's `onMount`.

## Tests

- `e2e/favorites.spec.ts` runs against a stand-in for Supabase and the Google round trip (`e2e/helpers.ts`); anything it does not answer is aborted, so the tests never reach the real project.
- `e2e/site.spec.ts` checks that a signed-out visitor makes no request to another origin, also while using a tool.

## Still to do

- A short privacy page, in English and Dutch.
