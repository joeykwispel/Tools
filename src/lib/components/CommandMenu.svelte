<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/app.svelte';
  import { favorites } from '$lib/favorites/favorites.svelte';
  import { fill, t } from '$lib/locales';
  import { tools } from '$lib/tools/registry';
  import { search } from '$lib/tools/search';
  import type { Tool } from '$lib/tools/types';

  /**
   * The Ctrl K menu: your favourites first, then every built tool; typing searches all tools in both languages.
   * A dialog with a combobox and a listbox, so arrow keys, Enter and Escape work and screen readers follow along.
   */
  let { open = $bindable(false) }: { open?: boolean } = $props();
  const c = $derived(t(app.locale));

  let dialog: HTMLDialogElement | undefined = $state();
  let list: HTMLElement | undefined = $state();
  let query = $state('');
  let active = $state(0);

  interface Group {
    label: string;
    items: Tool[];
  }

  const groups: Group[] = $derived.by(() => {
    if (query.trim()) return [{ label: c.menu.results, items: search(tools, query, app.locale) }];
    const starred = favorites.slugs.flatMap((slug) => tools.find((tool) => tool.slug === slug) ?? []);
    const built = tools.filter((tool) => tool.status === 'live' && !starred.includes(tool));
    return [
      { label: c.favorites.title, items: starred },
      { label: c.menu.tools, items: built }
    ].filter((group) => group.items.length);
  });
  const items = $derived(groups.flatMap((group) => group.items));

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      query = '';
      active = 0;
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  });

  // keep the highlighted option in view
  $effect(() => {
    void items;
    list?.querySelector(`#menu-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  });

  function choose(tool: Tool | undefined) {
    // a planned tool has no page yet
    if (!tool || tool.status !== 'live') return;
    open = false;
    void goto(app.href(`/${tool.slug}/`));
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      active = e.key === 'Home' ? 0 : Math.max(0, items.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[active]);
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<dialog
  bind:this={dialog}
  aria-label={c.header.search}
  onclose={() => (open = false)}
  onclick={(e) => {
    // a click on the backdrop lands on the dialog itself
    if (e.target === dialog) open = false;
  }}
>
  <div class="frame">
    <div class="search mono">
      <span class="prompt" aria-hidden="true">&gt;</span>
      <input
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="menu-list"
        aria-autocomplete="list"
        aria-activedescendant={items.length ? `menu-option-${active}` : undefined}
        aria-label={c.menu.placeholder}
        placeholder={c.menu.placeholder}
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        bind:value={query}
        oninput={() => (active = 0)}
        {onkeydown}
      />
      <kbd>Esc</kbd>
    </div>

    <div class="list" id="menu-list" role="listbox" aria-label={c.header.search} bind:this={list}>
      {#each groups as group (group.label)}
        <div role="group" aria-label={group.label}>
          <p class="group mono" aria-hidden="true"><span class="com">//</span> {group.label}</p>
          {#each group.items as tool (tool.slug)}
            {@const i = items.indexOf(tool)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              class="option"
              id="menu-option-{i}"
              role="option"
              tabindex="-1"
              aria-selected={i === active}
              aria-disabled={tool.status !== 'live'}
              onclick={() => choose(tool)}
              onpointermove={() => (active = i)}
            >
              <span class="icon mono" aria-hidden="true">{tool.icon}</span>
              <span class="text">
                <span class="title">{tool.title[app.locale]}</span>
                <span class="line">{tool.description[app.locale]}</span>
              </span>
              {#if tool.status !== 'live'}<span class="soon mono">{c.tools.soon}</span>{/if}
              {#if favorites.has(tool.slug)}
                <svg class="star" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
                </svg>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
      {#if !items.length}<p class="none">{fill(c.menu.none, { query: query.trim() })}</p>{/if}
    </div>

    <p class="hint mono" aria-hidden="true">{c.menu.hint}</p>
  </div>
</dialog>

<style>
  dialog {
    width: min(600px, 100% - 1.5rem);
    max-height: min(70vh, 560px);
    margin: 12vh auto auto;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-2);
    color: var(--text);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  dialog::backdrop {
    background: color-mix(in srgb, var(--bg) 70%, transparent);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }
  .frame {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    max-height: min(70vh, 560px);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.2rem 0.9rem;
    border-bottom: 1px solid var(--border);
  }
  .prompt {
    color: var(--accent-text);
    font-weight: 700;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 0.75rem 0;
    border: 0;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 0.95rem;
  }
  /* the dialog is the focus ring: the input fills its top edge */
  input:focus-visible {
    outline: none;
  }
  input::placeholder {
    color: var(--muted);
  }
  kbd {
    padding: 0.05rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--muted);
    font-family: inherit;
    font-size: 0.68rem;
  }
  .list {
    overflow-y: auto;
    padding: 0.4rem;
  }
  .group {
    max-width: none;
    padding: 0.5rem 0.6rem 0.25rem;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.7rem;
    padding: 0.45rem 0.6rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .option[aria-selected='true'] {
    background: var(--surface-2);
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .option[aria-disabled='true'] {
    cursor: default;
  }
  .option[aria-disabled='true'] .title {
    color: var(--muted);
  }
  .icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent-text);
    font-size: 0.66rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .text {
    display: grid;
  }
  .title {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .line {
    overflow: hidden;
    color: var(--muted);
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .soon {
    padding: 0.05rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.6;
  }
  .star {
    fill: var(--accent-text);
  }
  .none {
    padding: 1.2rem 0.6rem;
    color: var(--muted);
    font-size: 0.88rem;
  }
  .hint {
    max-width: none;
    padding: 0.5rem 0.9rem;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.7rem;
  }
</style>
