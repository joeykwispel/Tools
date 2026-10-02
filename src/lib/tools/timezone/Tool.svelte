<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import { advise, clock, offsetLabel, place, slots, type Cell, type Slot } from './logic';
  import text_ from './text';

  /** Who to plan with when the page opens, next to the visitor's own zone. */
  const OTHERS = ['America/New_York', 'Asia/Tokyo', 'Europe/London'];
  const MAX_ZONES = 6;

  const c = $derived(text_[app.locale]);
  /** British English writes a date the way the rest of the page does: day, month, year. */
  const language = $derived(app.locale === 'nl' ? 'nl-NL' : 'en-GB');

  /** Empty until the page runs in a browser: only there is it known which day it is and which zone the visitor is in. */
  let date = $state('');
  let zones = $state<string[]>([]);
  let all = $state<string[]>([]);
  let chosen = $state('');
  /** The hour picked in the table, on the first clock. */
  let picked = $state<number | null>(null);

  function today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  onMount(() => {
    const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
    zones = [own, ...OTHERS.filter((zone) => zone !== own).slice(0, 2)];
    all = [...new Set(['UTC', ...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : OTHERS)])];
    date = today();
  });

  const rows = $derived(slots(date, zones));
  const advice = $derived(advise(rows));
  const available = $derived(all.filter((zone) => !zones.includes(zone)));
  const toAdd = $derived(available.includes(chosen) ? chosen : (available[0] ?? ''));
  const slot = $derived(rows.find((row) => row.hour === picked) ?? null);

  const status = $derived.by(() => {
    if (!rows.length) return c.advice.empty;
    if (advice.kind === 'none') return c.advice.none;
    const times = new Intl.ListFormat(language, { type: 'conjunction' }).format(
      advice.stretches.map(({ from, to }) => fill(c.advice.stretch, { from: clock(from * 60), to: clock(to * 60) }))
    );
    return fill(c.advice[advice.kind], { times, place: place(zones[0]) });
  });

  /** A date in words. A day has no clock here, so it is written as UTC. */
  const words = (ms: number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(ms);
  const dayName = $derived(
    date && rows.length ? words(Date.parse(`${date}T00:00:00Z`), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  );

  /** One clock at the moment picked: "New York: Mon 5 Oct, 09:00 (UTC-4)". */
  function line(row: Slot, cell: Cell): string {
    const local = Date.parse(`${date}T00:00:00Z`) + cell.dayShift * 86_400_000;
    return `${place(cell.zone)}: ${words(local, { weekday: 'short', day: 'numeric', month: 'short' })}, ${clock(cell.minutes)} (${offsetLabel(row.ms, cell.zone)})`;
  }
  const summary = $derived(slot ? slot.cells.map((cell) => line(slot, cell)).join('\n') : '');

  function putFirst(zone: string) {
    zones = [zone, ...zones.filter((other) => other !== zone)];
    picked = null;
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="timezone-date">{c.date}</label>
        <div class="t-actions"><button type="button" class="t-small" onclick={() => (date = today())}>{c.today}</button></div>
      </div>
      <input id="timezone-date" class="t-input" type="date" min="1900-01-01" max="2200-12-31" bind:value={date} />
    </div>

    <section class="t-field" aria-labelledby="timezone-zones">
      <h2 class="t-label" id="timezone-zones">{c.zones}</h2>
      <ul class="zones" data-testid="timezone-zones">
        {#each zones as zone, i (zone)}
          <li>
            <span class="zone mono"
              >{zone}{#if i === 0}<span class="first">({c.first})</span>{/if}</span
            >
            <span class="t-actions">
              {#if i > 0}
                <button type="button" class="t-small" aria-label={fill(c.putFirstLabel, { zone })} onclick={() => putFirst(zone)}>{c.putFirst}</button>
              {/if}
              {#if zones.length > 1}
                <button
                  type="button"
                  class="t-small"
                  aria-label={fill(c.removeLabel, { zone })}
                  onclick={() => {
                    zones = zones.filter((other) => other !== zone);
                    if (i === 0) picked = null;
                  }}>{c.remove}</button
                >
              {/if}
            </span>
          </li>
        {/each}
      </ul>
      <p class="t-hint">{c.zonesHint}</p>
    </section>

    {#if available.length && zones.length < MAX_ZONES}
      <div class="t-field">
        <label class="t-label" for="timezone-add">{c.add}</label>
        <div class="adder">
          <select id="timezone-add" class="t-input" value={toAdd} onchange={(e) => (chosen = e.currentTarget.value)}>
            {#each available as zone (zone)}
              <option value={zone}>{zone}</option>
            {/each}
          </select>
          <button type="button" class="t-small" onclick={() => (zones = [...zones, toAdd])}>{c.addButton}</button>
        </div>
      </div>
    {/if}

    <section class="t-field" aria-labelledby="timezone-chosen">
      <div class="t-row">
        <h2 class="t-label" id="timezone-chosen">{c.chosen}</h2>
        {#if summary}<CopyButton text={summary} label={c.copy} />{/if}
      </div>
      {#if summary}
        <pre class="t-box mono" data-testid="timezone-chosen">{summary}</pre>
      {:else}
        <p class="t-hint">{c.chosenHint}</p>
      {/if}
    </section>
  </div>

  <section class="t-field" aria-labelledby="timezone-table">
    <h2 class="t-label" id="timezone-table">{dayName ? fill(c.table, { date: dayName }) : c.date}</h2>
    <p class="t-status" role="status" aria-live="polite">{status}</p>
    {#if rows.length}
      <table class="t-table hours" data-testid="timezone-hours">
        <thead>
          <tr>
            {#each zones as zone (zone)}
              <th scope="col">{place(zone)}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.hour)}
            <tr class:picked={row.hour === picked} class:best={row.everyoneWorks}>
              {#each row.cells as cell, i (cell.zone)}
                <td class={cell.kind}>
                  {#if i === 0}
                    <button
                      type="button"
                      class="hour mono"
                      aria-pressed={row.hour === picked}
                      aria-label={fill(c.pick, { time: clock(cell.minutes) })}
                      onclick={() => (picked = row.hour)}>{clock(cell.minutes)}</button
                    >
                  {:else}
                    <span class="mono">{clock(cell.minutes)}</span>
                    {#if cell.dayShift}
                      <span class="shift" aria-hidden="true">{cell.dayShift > 0 ? '+1' : '−1'}</span>
                      <span class="sr-only">{cell.dayShift > 0 ? c.dayAfter : c.dayBefore}</span>
                    {/if}
                  {/if}
                  <span class="sr-only">{c.legend[cell.kind]}</span>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <ul class="legend" aria-hidden="true">
        <li class="work">{c.legend.work}</li>
        <li class="edge">{c.legend.edge}</li>
        <li class="weekend">{c.legend.weekend}</li>
        <li class="night">{c.legend.night}</li>
      </ul>
    {/if}
  </section>
</div>

<style>
  .zones {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .zones li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem 0.75rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .zone {
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .first {
    margin-left: 0.5rem;
    color: var(--muted);
  }
  .adder {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .hours th,
  .hours td {
    padding: 0.2rem 0.5rem;
    font-size: 0.82rem;
    text-align: left;
  }
  .hours th {
    overflow-wrap: anywhere;
  }
  .hours td {
    border-left: 3px solid transparent;
    color: var(--text);
  }
  td.work,
  .legend .work {
    border-left-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }
  td.edge,
  .legend .edge {
    border-left-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 5%, transparent);
  }
  td.weekend,
  .legend .weekend {
    border-left-color: var(--accent-2);
    background: color-mix(in srgb, var(--accent-2) 8%, transparent);
  }
  td.night {
    color: var(--muted);
  }
  .hour {
    padding: 0.05rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: inherit;
    font-size: 0.82rem;
  }
  .hour:hover,
  .hour[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--accent-text);
  }
  tr.picked td {
    box-shadow:
      inset 0 1px 0 var(--accent),
      inset 0 -1px 0 var(--accent);
  }
  .shift {
    font-size: 0.7rem;
    color: var(--muted);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.5rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .legend li {
    padding: 0.1rem 0.5rem;
    border-left: 3px solid var(--border);
  }
</style>
