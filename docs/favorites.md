# Favourites and sign-in

Star a tool and it is pinned for you. Without an account the favourites live in this browser. Sign in with Google and they follow you to your other devices. It works the way CodeGuessr syncs its stats: Supabase Auth (Google, PKCE) plus one small Postgres table protected by Row Level Security.

**Status:** the logic, the table and their tests are in the repo. No Supabase project is connected and there is no star or sign-in button yet, so the site behaves exactly as before.

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
| `src/lib/cloud/config.ts`                               | Supabase URL and anon key (empty = sign-in off)                                              |
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

## Still to do

1. **Connect a project** (one time, outside the code):
   - Use the CodeGuessr Supabase project, so there is one account for every joeyoosenbrug.nl app and Google sign-in is already set up. The table is named `tool_favorites` so it does not clash.
   - Run the migration in that project (SQL editor, or `supabase db push`).
   - Authentication → URL configuration: add `https://tools.joeyoosenbrug.nl/**` and `http://localhost:5173/**` to the redirect URLs.
   - Put the project URL and the publishable (anon) key in `src/lib/cloud/config.ts`.
2. **Content Security Policy:** add the project's own host to `connect-src` in `svelte.config.js` (`https://<ref>.supabase.co`, not a wildcard). This is the one exception to `connect-src 'self'`; the end-to-end test that checks the page only talks to its own origin gets the same exception.
3. **UI:** a star on each tool row, a pinned row above the list, and a sign-in button in the header with a panel that says what signing in does. Call `auth.init()` and `favorites.init()` once in the root layout, in `onMount`.
4. **Text:** the sign-in panel and a short privacy page, in English and Dutch.
5. **End-to-end tests** against a mocked Supabase and Google round trip, as in CodeGuessr's `e2e/auth.spec.ts`: star signed out, sign in, see it sent; a removal on one device reaches the other.
