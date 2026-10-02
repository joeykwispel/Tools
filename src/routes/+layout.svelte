<script lang="ts">
  // Self-hosted fonts (no requests to Google, so no visitor IPs shared with third parties)
  import '@fontsource-variable/inter';
  import '@fontsource-variable/jetbrains-mono';
  import '$lib/jo/jo-kit.css';
  import '$lib/jo/jo-header.css';
  import '../app.css';
  import { page } from '$app/state';
  import { app } from '$lib/app.svelte';
  import { localeOf } from '$lib/i18n';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let { children } = $props();

  // Read the language from the URL during render as well, so the prerendered HTML is already in the right language.
  const sync = () => {
    app.locale = localeOf(page.url.pathname);
  };
  sync();
  $effect.pre(sync);

  $effect(() => {
    document.documentElement.lang = app.locale;
  });
</script>

<!-- Re-created per page and language, so jo-header.js picks up the new labels. -->
{#key `${page.url.pathname}`}
  <Header />
{/key}

<main id="main">
  {@render children()}
</main>

<Footer />
