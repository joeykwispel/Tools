<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import { groups, namesOf, pickOne, shuffle, waiting, type Pick } from './logic';
  import text_ from './text';

  /** Where the names are kept, on this device. */
  const NAMES_KEY = 'tools:picker-names';

  /** A whole number below `below` from the browser's own randomness, without favouring the low ones. */
  const pick: Pick = (below) => {
    const limit = Math.floor(0x100000000 / below) * below;
    const one = new Uint32Array(1);
    do crypto.getRandomValues(one);
    while (one[0] >= limit);
    return one[0] % below;
  };

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let text = $state('');
  let fair = $state(true);
  let chosen = $state<string | null>(null);
  let picked = $state<string[]>([]);
  let order = $state<string[]>([]);
  let groupCount = $state(2);
  let made = $state<string[][]>([]);

  const names = $derived(namesOf(text));
  const left = $derived(waiting(names, picked).length);

  $effect(() => {
    try {
      text = localStorage.getItem(NAMES_KEY) ?? '';
    } catch {
      /* storage unavailable: the list starts empty */
    }
  });

  function setNames(value: string) {
    text = value;
    try {
      localStorage.setItem(NAMES_KEY, value);
    } catch {
      /* storage unavailable: the names then last until the tab closes */
    }
  }

  function choose() {
    const result = pickOne(names, picked, pick, fair);
    if (!result) return;
    chosen = result.name;
    picked = result.picked;
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="picker-names">{c.names}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => setNames(c.sample)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => setNames('')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="picker-names"
        class="t-input"
        rows="10"
        spellcheck="false"
        autocomplete="off"
        aria-describedby="picker-count picker-names-hint"
        value={text}
        oninput={(e) => setNames(e.currentTarget.value)}></textarea>
      <p class="t-status" id="picker-count" data-testid="picker-count">
        {names.length === 0 ? c.none : names.length === 1 ? c.countOne : fill(c.count, { count: String(names.length) })}
      </p>
      <p class="t-hint" id="picker-names-hint">{c.namesHint}</p>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="picker-pick">
      <h2 class="t-label" id="picker-pick">{c.pick}</h2>
      <p class="chosen" class:empty={chosen === null} role="status" aria-live="polite" data-testid="picker-chosen">{chosen ?? c.nobody}</p>
      <div class="t-actions">
        <button type="button" class="t-small main" disabled={!names.length} onclick={choose}>{c.pickButton}</button>
        {#if fair && picked.length}
          <button type="button" class="t-small" onclick={() => (picked = [])}>{c.startOver}</button>
        {/if}
      </div>
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={fair} onchange={() => (picked = [])} /> {c.fair}</label>
      </div>
      {#if fair && picked.length}
        <p class="t-hint" data-testid="picker-waiting">{left ? fill(c.waiting, { count: String(left) }) : c.round}</p>
      {/if}
    </section>

    <section class="t-field" aria-labelledby="picker-order">
      <h2 class="t-label" id="picker-order">{c.order}</h2>
      <div class="t-actions">
        <button type="button" class="t-small main" disabled={!names.length} onclick={() => (order = shuffle(names, pick))}>{c.orderButton}</button>
      </div>
      {#if order.length}
        <ol class="list" data-testid="picker-order">
          {#each order as name, i (i)}<li>{name}</li>{/each}
        </ol>
      {/if}
    </section>

    <section class="t-field" aria-labelledby="picker-groups">
      <h2 class="t-label" id="picker-groups">{c.groups}</h2>
      <div class="split">
        <div class="t-field">
          <label class="t-label" for="picker-group-count">{c.groupCount}</label>
          <input id="picker-group-count" class="t-input" type="number" min="1" max="50" step="1" bind:value={groupCount} />
        </div>
        <button type="button" class="t-small main" disabled={!names.length} onclick={() => (made = groups(names, groupCount, pick))}>{c.groupsButton}</button>
      </div>
      {#if made.length}
        <div class="groups" data-testid="picker-groups">
          {#each made as group, i (i)}
            <div>
              <h3 class="t-label">{fill(c.group, { n: String(i + 1) })}</h3>
              <ul class="list">
                {#each group as name, j (j)}<li>{name}</li>{/each}
              </ul>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .chosen {
    margin: 0;
    max-width: none;
    padding: 1.25rem 1rem;
    border: 1px solid color-mix(in srgb, var(--accent) 60%, var(--border));
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent-text);
    font-size: clamp(1.6rem, 6vw, 2.6rem);
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .chosen.empty {
    border-color: var(--border);
    color: var(--muted);
    font-size: 1rem;
    font-weight: 400;
  }
  .main {
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
  }
  .split {
    display: flex;
    align-items: end;
    gap: 0.75rem;
  }
  .split .t-field {
    max-width: 10rem;
  }
  .list {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding-left: 1.6rem;
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }
  ol.list {
    list-style: decimal;
  }
  ul.list {
    list-style: disc;
  }
  .list ::marker {
    color: var(--muted);
  }
  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 1rem;
  }
  h3 {
    margin: 0 0 0.3rem;
  }
</style>
