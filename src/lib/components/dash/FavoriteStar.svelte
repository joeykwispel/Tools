<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { favorites } from '$lib/favorites/favorites.svelte';
  import { fill, t } from '$lib/locales';
  import type { Tool } from '$lib/tools/types';

  /** The star that adds a tool to, or removes it from, the favourites. */
  let { tool }: { tool: Tool } = $props();
  const starred = $derived(favorites.has(tool.slug));
  const f = $derived(t(app.locale).favorites);
</script>

<button
  type="button"
  class="star"
  aria-pressed={starred}
  aria-label={fill(starred ? f.remove : f.add, { title: tool.title[app.locale] })}
  onclick={() => favorites.toggle(tool.slug)}
>
  <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
  </svg>
</button>

<style>
  .star {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--muted);
    transition:
      color 0.2s,
      background 0.2s,
      transform 0.2s;
  }
  .star:hover {
    color: var(--accent-text);
    background: var(--surface-2);
  }
  .star:active {
    transform: scale(0.92);
  }
  svg {
    fill: none;
  }
  .star[aria-pressed='true'] {
    color: var(--accent-text);
  }
  .star[aria-pressed='true'] svg {
    fill: currentColor;
  }
</style>
