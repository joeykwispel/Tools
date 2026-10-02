<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { t } from '$lib/locales';
  import type { Tool } from '$lib/tools/types';

  /** One tool in the list. A tool that is not built yet has no page, so its row is not a link. */
  let { tool }: { tool: Tool } = $props();
</script>

<li class="row glass" data-status={tool.status}>
  <span class="icon mono" aria-hidden="true">{tool.icon}</span>
  <div class="text">
    <h3>{tool.title[app.locale]}</h3>
    <p>{tool.description[app.locale]}</p>
  </div>
  {#if tool.status === 'soon'}<span class="soon mono">{t(app.locale).tools.soon}</span>{/if}
</li>

<style>
  .row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.75rem;
    padding: 0.8rem 0.9rem;
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
  p {
    margin-top: 0.15rem;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.45;
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
