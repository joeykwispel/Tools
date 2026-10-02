<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { auth } from '$lib/cloud/auth.svelte';
  import { favorites } from '$lib/favorites/favorites.svelte';
  import { fill, t } from '$lib/locales';

  /**
   * Header control for the optional Google sign-in: a button with a small panel that says what signing in does
   * (sync favourites, nothing else), or, when signed in, who you are, the sync state and a sign-out button.
   * Not rendered when no Supabase project is configured.
   */
  const a = $derived(t(app.locale).auth);
  const user = $derived(auth.user);
  const name = $derived(user?.name ?? user?.email ?? '');
  const initial = $derived((name.trim().charAt(0) || '?').toUpperCase());

  // The prerendered page can't know whether sign-in is available, so the button is added after hydration.
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  let open = $state(false);
  let root: HTMLElement | undefined = $state();
  let trigger: HTMLButtonElement | undefined = $state();

  function close(restoreFocus = false) {
    if (!open) return;
    open = false;
    if (restoreFocus) trigger?.focus();
  }

  async function signOut() {
    await auth.signOut();
    close(true);
  }
</script>

<svelte:document
  onkeydown={(e) => e.key === 'Escape' && close(true)}
  onpointerdown={(e) => open && e.target instanceof Node && !root?.contains(e.target) && close()}
/>

{#if mounted && auth.status !== 'unavailable'}
  <div class="auth" bind:this={root}>
    <button
      bind:this={trigger}
      type="button"
      class="jo-nav__icon trigger"
      class:wide={!user}
      aria-controls="auth-panel"
      aria-expanded={open}
      aria-label={user ? `${a.account}: ${name}` : a.signIn}
      aria-busy={auth.status === 'loading' ? 'true' : undefined}
      onclick={() => (open = !open)}
    >
      {#if user}
        <span class="initial mono" aria-hidden="true">{initial}</span>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        <span class="label mono">{a.signIn}</span>
      {/if}
    </button>

    <div id="auth-panel" class="panel" hidden={!open}>
      {#if user}
        <p class="who">{fill(a.signedInAs, { name })}</p>
        {#if user.email && user.name}<p class="muted">{user.email}</p>{/if}
        <p class="sync" class:bad={favorites.sync === 'error'} role="status">
          {favorites.sync === 'error' ? a.syncError : favorites.sync === 'synced' ? a.synced : a.syncing}
        </p>
        <button type="button" class="btn" onclick={signOut}>{a.signOut}</button>
      {:else}
        <h2 class="mono">{a.title}</h2>
        <p>{a.why}</p>
        {#if auth.error}<p class="bad" role="alert">{auth.error === 'cancelled' ? a.cancelled : a.failed}</p>{/if}
        <button type="button" class="btn" disabled={auth.status === 'loading'} onclick={() => auth.signIn()}>
          <!-- Google's own logo, in its own colours -->
          <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          {auth.status === 'loading' ? a.loading : a.google}
        </button>
        <p class="muted">{a.privacy}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .auth {
    position: relative;
  }
  /* The kit's icon button keeps the browser's 6px padding, which leaves 22px: the 24px circle then sits 1px to the right. */
  .trigger {
    padding: 0;
  }
  .trigger.wide {
    width: auto;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding-inline: 0.6rem;
  }
  .label {
    font-size: 0.75rem;
  }
  .initial {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 0.8rem;
    font-weight: 800;
  }
  .panel {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 30;
    width: min(100vw - 1.5rem, 320px);
    padding: 1rem;
    display: grid;
    gap: 0.6rem;
    /* solid panel, like the kit's dropdowns */
    background: var(--bg-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    font-size: 0.875rem;
    white-space: normal;
  }
  .panel[hidden] {
    display: none;
  }
  h2 {
    font-size: 1rem;
    letter-spacing: -0.02em;
  }
  .who {
    font-weight: 700;
  }
  .muted,
  .sync {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .bad {
    color: var(--syn-num);
  }
  .btn {
    width: 100%;
    justify-content: center;
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
  /* on a phone: icon only, and the panel spans the screen below the header */
  @media (max-width: 520px) {
    .label {
      display: none;
    }
    .trigger.wide {
      width: 36px;
      padding-inline: 0;
      justify-content: center;
    }
    .panel {
      position: fixed;
      top: calc(var(--nav-h) + 4px);
      left: 0.75rem;
      right: 0.75rem;
      width: auto;
    }
  }
</style>
