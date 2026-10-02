<script lang="ts">
  // Self-hosted fonts (no requests to Google, so no visitor IPs shared with third parties)
  import '@fontsource-variable/inter';
  import '@fontsource-variable/jetbrains-mono';
  import '$lib/jo/jo-kit.css';
  import '$lib/jo/jo-header.css';
  import '$lib/tools/tool.css';
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { app } from '$lib/app.svelte';
  import { auth } from '$lib/cloud/auth.svelte';
  import { favorites } from '$lib/favorites/favorites.svelte';
  import { localeOf } from '$lib/i18n';
  import CommandMenu from '$lib/components/CommandMenu.svelte';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let { children } = $props();
  let menuOpen = $state(false);

  // Read the language from the URL during render as well, so the prerendered HTML is already in the right language.
  const sync = () => {
    app.locale = localeOf(page.url.pathname);
  };
  sync();
  $effect.pre(sync);

  $effect(() => {
    document.documentElement.lang = app.locale;
  });

  // After the first render, so neither delays the page. Favourites work without sign-in; sign-in only adds sync.
  onMount(() => {
    favorites.init();
    auth.init();
  });
</script>

<!-- Re-created per page and language, so jo-header.js picks up the new labels. -->
{#key `${page.url.pathname}`}
  <!-- Ctrl K, or the button in the header; pressing it again closes the menu -->
  <Header onSearch={() => (menuOpen = !menuOpen)} />
{/key}

<CommandMenu bind:open={menuOpen} />

<main id="main">
  {@render children()}
</main>

<Footer />
