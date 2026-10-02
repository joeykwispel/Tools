<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { t } from '$lib/locales';
  import Seo from '$lib/components/Seo.svelte';

  const c = $derived(t(app.locale));
</script>

<Seo title={c.meta.title} description={c.meta.description} imageAlt={c.meta.imageAlt} />

<!-- Only the tools belong on this page. Until the first pack lands, it says so in one line. -->
<section class="hero">
  <div class="container">
    <p class="kicker mono"><span class="prop">joey@tools</span>:<span class="dir">~</span>$ ls<span class="caret" aria-hidden="true"></span></p>
    <h1>{c.hero.title} <span class="grad">{c.hero.titleAccent}</span></h1>
    <p class="status mono"><span class="com">//</span> {c.hero.status}</p>
  </div>
</section>

<style>
  .hero {
    min-height: calc(100svh - var(--nav-h) - 5rem);
    display: grid;
    align-content: center;
    padding-block: 2rem;
    text-align: center;
  }
  .kicker {
    font-size: 0.85rem;
    color: var(--muted);
    margin: 0 auto 0.6rem;
  }
  .dir {
    color: var(--syn-fn);
  }
  h1 {
    font-size: clamp(2.1rem, 5vw, 3.4rem);
    line-height: 1;
    letter-spacing: -0.04em;
    animation: fade-up 0.8s var(--ease) both;
  }
  .grad {
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .status {
    margin: 1rem auto 0;
    font-size: 0.85rem;
    color: var(--muted);
  }
</style>
