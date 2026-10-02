<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { t } from '$lib/locales';
  import type { Tool } from '$lib/tools/types';
  import FavoriteStar from './FavoriteStar.svelte';

  /** One tool in the list. A built tool links to its page; one that is not built yet has no page, so it is not a link. */
  let { tool }: { tool: Tool } = $props();
  const live = $derived(tool.status === 'live');
</script>

<li class="row glass" class:ring={live} data-status={tool.status}>
  <span class="icon mono" aria-hidden="true">{tool.icon}</span>
  <div class="text">
    <h3>
      {#if live}<a href={app.href(`/${tool.slug}/`)}>{tool.title[app.locale]}</a>{:else}{tool.title[app.locale]}{/if}
    </h3>
    <p>{tool.description[app.locale]}</p>
  </div>
  <div class="side">
    {#if !live}<span class="soon mono">{t(app.locale).tools.soon}</span>{/if}
    <FavoriteStar {tool} />
  </div>
</li>

<style>
  .row {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.75rem;
    padding: 0.8rem 0.6rem 0.8rem 0.9rem;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent-text);
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }
  h3 {
    font-size: 0.95rem;
    line-height: 1.3;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  /* the whole row opens the tool; the star stays on top of it */
  a::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--radius);
  }
  a:focus-visible {
    outline: none;
  }
  a:focus-visible::before {
    outline: 2px solid var(--accent-text);
    outline-offset: 3px;
  }
  p {
    margin-top: 0.15rem;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }
  .side {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .soon {
    padding: 0.05rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.6;
    white-space: nowrap;
  }
</style>
