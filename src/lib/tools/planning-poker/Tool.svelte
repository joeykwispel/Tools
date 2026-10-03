<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import { DECKS, deckOf, summarise } from './logic';
  import text_ from './text';

  /** Where the deck that was last used is kept, on this device. */
  const DECK_KEY = 'tools:poker-deck';

  const c = $derived(text_[app.locale]);

  let deckId = $state(DECKS[0].id);
  let mode = $state<'pick' | 'tally'>('pick');
  let card = $state<string | null>(null);
  let shown = $state(false);
  let votes = $state<string[]>([]);

  const deck = $derived(deckOf(deckId));
  const summary = $derived(summarise(votes, deck));
  /** What a card is called for someone who hears it: the two without a number have a name. */
  const nameOf = (value: string) => c.cardNames[value] ?? value;

  $effect(() => {
    try {
      deckId = deckOf(localStorage.getItem(DECK_KEY)).id;
    } catch {
      /* storage unavailable: the first deck it is */
    }
  });

  function setDeck(id: string) {
    deckId = id;
    // a card of another deck is not a card any more
    card = null;
    shown = false;
    votes = [];
    try {
      localStorage.setItem(DECK_KEY, id);
    } catch {
      /* storage unavailable: the deck then lasts until the tab closes */
    }
  }

  function choose(value: string) {
    card = value;
    shown = false;
  }

  const verdict = $derived.by(() => {
    if (!summary.votes) return c.noVotes;
    if (!summary.low || !summary.high) return c.noEstimates;
    if (summary.consensus) return fill(c.consensus, { card: summary.low });
    if (summary.low === summary.high) return c.one;
    return fill(c.spread, { low: summary.low, high: summary.high });
  });
</script>

<div class="t-col">
  <fieldset class="t-checks">
    <legend class="t-label">{c.deck}</legend>
    {#each DECKS as option (option.id)}
      <label>
        <input type="radio" name="poker-deck" value={option.id} checked={deckId === option.id} onchange={() => setDeck(option.id)} />
        {c.decks[option.id as keyof typeof c.decks]}
      </label>
    {/each}
  </fieldset>
  <fieldset class="t-checks">
    <legend class="t-label">{c.mode}</legend>
    <label><input type="radio" name="poker-mode" value="pick" bind:group={mode} /> {c.modes.pick}</label>
    <label><input type="radio" name="poker-mode" value="tally" bind:group={mode} /> {c.modes.tally}</label>
  </fieldset>

  <div class="t-tool">
    <section class="t-field" aria-labelledby="poker-cards">
      <h2 class="t-label" id="poker-cards">{c.cards}</h2>
      <div class="cards" role="group" aria-labelledby="poker-cards" data-testid="poker-cards">
        {#each deck.cards as value (value)}
          {@const times = votes.filter((vote) => vote === value).length}
          {#if mode === 'pick'}
            <button type="button" class="card" aria-label={nameOf(value)} aria-pressed={shown && card === value} onclick={() => choose(value)}>{value}</button>
          {:else}
            <button type="button" class="card" aria-label={fill(c.times, { card: nameOf(value), times: String(times) })} onclick={() => votes.push(value)}>
              {value}
              {#if times}<span class="times">{times}</span>{/if}
            </button>
          {/if}
        {/each}
      </div>
      <p class="t-hint">{mode === 'pick' ? c.pickHint : c.tallyHint}</p>
    </section>

    {#if mode === 'pick'}
      <section class="t-field" aria-labelledby="poker-yours">
        <h2 class="t-label" id="poker-yours">{c.yours}</h2>
        <div class="table">
          <div class="big" class:back={card !== null && !shown} class:empty={card === null} data-testid="poker-card">
            {#if card !== null && shown}{card}{/if}
          </div>
        </div>
        <p class="t-status" role="status" aria-live="polite">
          {card === null ? c.none : shown ? fill(c.shown, { card: nameOf(card) }) : c.hidden}
        </p>
        <div class="t-actions">
          <button type="button" class="t-small" disabled={card === null} aria-pressed={shown} onclick={() => (shown = !shown)}
            >{shown ? c.hide : c.reveal}</button
          >
          <button type="button" class="t-small" disabled={card === null} onclick={() => (card = null)}>{c.again}</button>
        </div>
      </section>
    {:else}
      <section class="t-field" aria-labelledby="poker-round">
        <h2 class="t-label" id="poker-round">{c.round}</h2>
        <p class="t-status" class:t-good={summary.consensus} role="status" aria-live="polite">{verdict}</p>
        {#if summary.votes}
          <dl class="t-kv" data-testid="poker-summary">
            <dt>{c.names.votes}</dt>
            <dd>{summary.counts.map(([value, times]) => `${times} × ${value}`).join(', ')}</dd>
            {#if summary.low && summary.high}
              <dt>{c.names.low}</dt>
              <dd>{summary.low}</dd>
              <dt>{c.names.high}</dt>
              <dd>{summary.high}</dd>
            {/if}
            {#if summary.average !== null}
              <dt>{c.names.average}</dt>
              <dd>{summary.average}</dd>
            {/if}
          </dl>
        {/if}
        <div class="t-actions">
          <button type="button" class="t-small" disabled={!votes.length} onclick={() => votes.pop()}>{c.undo}</button>
          <button type="button" class="t-small" disabled={!votes.length} onclick={() => (votes = [])}>{c.clear}</button>
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr));
    gap: 0.6rem;
  }
  .card {
    position: relative;
    aspect-ratio: 5 / 7;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    font-family: var(--mono);
    font-size: 1.4rem;
    font-weight: 700;
    transition:
      border-color 0.2s,
      transform 0.2s;
  }
  .card:hover {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
    transform: translateY(-2px);
  }
  .card[aria-pressed='true'] {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent-text);
  }
  .times {
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
    min-width: 1.3rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--bg);
    font-size: 0.72rem;
    line-height: 1.3rem;
  }
  .table {
    display: grid;
    place-items: center;
    padding: 1rem 0;
  }
  .big {
    display: grid;
    place-items: center;
    width: min(100%, 13rem);
    aspect-ratio: 5 / 7;
    border: 2px solid var(--accent);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent-text);
    font-family: var(--mono);
    font-size: 4.5rem;
    font-weight: 700;
  }
  .big.empty {
    border-style: dashed;
    border-color: var(--border);
  }
  /* the back of a card: stripes, so it is clear at a glance that there is one and that it is closed */
  .big.back {
    background: repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--accent) 22%, transparent) 0 0.6rem,
      color-mix(in srgb, var(--accent) 8%, transparent) 0.6rem 1.2rem
    );
  }
  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }
    .card:hover {
      transform: none;
    }
  }
</style>
