<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import FavoriteStar from '$lib/components/dash/FavoriteStar.svelte';
  import Seo from '$lib/components/Seo.svelte';

  let { data } = $props();
  const c = $derived(t(app.locale));
  const tool = $derived(data.tool);
  const Tool = $derived(data.component);
</script>

<Seo
  title={fill(c.meta.toolTitle, { title: tool.title[app.locale] })}
  description={tool.description[app.locale]}
  path={`/${tool.slug}/`}
  imageAlt={c.meta.imageAlt}
/>

<div class="container page">
  <a class="back mono" href={app.href('/')}><span aria-hidden="true">&lt;</span> cd .. <span class="sub">({c.tools.back})</span></a>

  <header>
    <span class="icon mono" aria-hidden="true">{tool.icon}</span>
    <div class="text">
      <h1>{tool.title[app.locale]}</h1>
      <p>{tool.description[app.locale]}</p>
    </div>
    <FavoriteStar {tool} />
  </header>
  <p class="privacy mono"><span class="com">//</span> {c.tools.privacy}</p>

  <Tool />
</div>

<style>
  .page {
    padding-block: clamp(1.25rem, 3vw, 2rem) clamp(2.5rem, 6vw, 4rem);
  }
  .back {
    display: inline-block;
    padding-block: 0.25rem;
    font-size: 0.82rem;
    text-decoration: none;
  }
  .back:hover {
    text-decoration: underline;
  }
  .sub {
    color: var(--muted);
  }
  header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem;
    margin-top: 0.9rem;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent-text);
    font-size: 0.85rem;
    font-weight: 700;
    white-space: nowrap;
  }
  h1 {
    font-size: clamp(1.5rem, 3.5vw, 2.1rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
  }
  header p {
    margin-top: 0.2rem;
    color: var(--muted);
  }
  .privacy {
    max-width: none;
    margin: 0.9rem 0 1.5rem;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
