/**
 * Public, build-time configuration for the optional sign-in. Everything here ships to the browser.
 *
 * The Supabase anon key is safe to expose: it only grants what the Row Level Security policies allow
 * (read and write your own favourites). The service role key must never appear in this repo.
 *
 * Both are empty until a project is connected (see docs/favorites.md). While they are empty there is no sign-in,
 * no request leaves the page, and favourites live in this browser only. The end-to-end build sets them through
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a fake project that the tests answer themselves.
 */
export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
