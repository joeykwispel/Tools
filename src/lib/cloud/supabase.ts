import type { SupabaseClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { supabaseAnonKey, supabaseUrl } from './config';

/** False when no project is configured, and during prerendering: the site then works fully on its own. */
export const configured = browser && !!supabaseUrl && !!supabaseAnonKey;

let client: Promise<SupabaseClient | null> | undefined;

/**
 * The one Supabase client, with the public anon key: everything it can do is limited by Row Level Security.
 * supabase-js is loaded on first use, so it never weighs on the first page load.
 */
export function supabase(): Promise<SupabaseClient | null> {
  if (!configured) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    )
    .catch(() => {
      // the chunk failed to load (offline on the first visit): behave as if no project is configured
      client = undefined;
      return null;
    });
  return client;
}
