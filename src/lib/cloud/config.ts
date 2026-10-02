/**
 * Public, build-time configuration for the optional sign-in. Everything here ships to the browser.
 *
 * The project is shared with CodeGuessr, so one account works on both. The publishable key is safe to expose:
 * it only grants what the Row Level Security policies allow (read and write your own favourites).
 * The service role key must never appear in this repo.
 *
 * The host is also listed in connect-src in svelte.config.js; change both together.
 * Set either to '' to switch sign-in off: no request then leaves the page, and favourites live in this browser only.
 */
export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://onnbzdrtdpyatfhzkghj.supabase.co';
export const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_8nJ8d9Xct4EUJnU3LmEnAA_7iQfAtVb';
