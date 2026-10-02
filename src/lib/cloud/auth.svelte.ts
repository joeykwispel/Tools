import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** 'unavailable' when no Supabase project is configured; 'loading' until the stored session has been checked. */
export type AuthStatus = 'unavailable' | 'loading' | 'signed-out' | 'signed-in';

/** Why signing in did not work: the visitor closed Google's consent screen, or something else went wrong. */
export type AuthError = 'cancelled' | 'failed';

/** Only what is needed to say who is signed in. The avatar is left out: showing it would mean loading an image from Google. */
export function toUser(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  return { id: u.id, email: u.email ?? null, name: str(meta['full_name']) ?? str(meta['name']) };
}

/**
 * Optional Google sign-in through Supabase Auth. Nothing waits on it: every tool works the same signed out,
 * and every failure (offline, blocked storage, cancelled consent) just leaves you signed out.
 */
class Auth {
  status = $state<AuthStatus>(configured ? 'loading' : 'unavailable');
  user = $state<AuthUser | null>(null);
  error = $state<AuthError | null>(null);

  #started = false;
  #listeners = new Set<(user: AuthUser | null) => void>();

  /** Starts listening for the session. Call once in the browser, after the first render, so it never delays the page. */
  init(): void {
    if (this.#started || !configured) return;
    this.#started = true;
    this.#readRedirectError();
    void supabase().then((client) => {
      if (!client) return this.#apply(null);
      client.auth.onAuthStateChange((_event, session) => this.#apply(session));
    });
    // if the auth library never answers (offline, storage blocked), stop showing a spinner
    setTimeout(() => {
      if (this.status === 'loading') this.status = 'signed-out';
    }, 8000);
  }

  /** Calls `fn` when another user signs in or the user signs out, and right away when someone is already signed in. */
  onChange(fn: (user: AuthUser | null) => void): () => void {
    this.#listeners.add(fn);
    if (this.user) fn(this.user);
    return () => this.#listeners.delete(fn);
  }

  /** Sends the visitor to Google and back to the page they were on. */
  async signIn(): Promise<void> {
    this.error = null;
    try {
      const client = await supabase();
      if (!client) throw new Error('unavailable');
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
    } catch {
      this.error = 'failed';
    }
  }

  async signOut(): Promise<void> {
    try {
      const client = await supabase();
      // 'local' clears this device even when the server can't be reached
      await client?.auth.signOut({ scope: 'local' });
    } catch {
      // already signed out server-side or offline: the local session is gone either way
    }
    this.#apply(null);
  }

  #apply(session: Session | null): void {
    const previous = this.user?.id ?? null;
    const user = toUser(session);
    this.user = user;
    this.status = user ? 'signed-in' : 'signed-out';
    // a token refresh fires too; only tell the listeners when it is someone else
    if ((user?.id ?? null) !== previous) for (const fn of this.#listeners) fn(user);
  }

  /** Google or Supabase can send the visitor back with ?error=...; remember it and clean the URL. */
  #readRedirectError(): void {
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    if (!params.has('error') && !hash.has('error')) return;
    this.error = params.get('error') === 'access_denied' || hash.get('error') === 'access_denied' ? 'cancelled' : 'failed';
    history.replaceState(history.state, '', location.pathname);
  }
}

export const auth = new Auth();
