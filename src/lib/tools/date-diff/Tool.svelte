<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import { MAX_WORKING, UNITS, add, difference, formatDay, parseDay, type Day, type Unit } from './logic';
  import text_ from './text';

  const c = $derived(text_[app.locale]);
  /** British English writes a date the way the rest of the page does: day, month, year. */
  const language = $derived(app.locale === 'nl' ? 'nl-NL' : 'en-GB');

  /** Both empty until the page runs in a browser: the server that renders the page does not know what day it is here. */
  let first = $state('');
  let second = $state('');
  let includeEnd = $state(false);
  let skipHolidays = $state(false);
  let amount = $state<number | null>(30);
  let unit = $state<Unit>('days');

  /** Today on the visitor's own calendar, not the one of UTC. */
  function today(): string {
    const now = new Date();
    return formatDay(Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000));
  }

  onMount(() => {
    first = today();
    second = formatDay(add(parseDay(first)!, 1, 'months'));
  });

  const from = $derived(parseDay(first));
  const to = $derived(parseDay(second));
  const result = $derived(from !== null && to !== null ? difference(from, to, { includeEnd, skipHolidays }) : null);

  const count = (n: number, forms: { one: string; other: string }) => (n === 1 ? forms.one : fill(forms.other, { n: n.toLocaleString(language) }));
  const list = (items: string[]) => new Intl.ListFormat(language, { type: 'conjunction' }).format(items);
  /** A date in words, with the day of the week. Dates have no clock here, so they are written as UTC. */
  const words = (day: Day) =>
    new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(day * 86_400_000);
  const short = (day: Day) =>
    new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(day * 86_400_000);

  const status = $derived.by(() => {
    if (!result || from === null || to === null) return c.pick;
    const [start, end] = result.backwards ? [to, from] : [from, to];
    const line = fill(includeEnd ? c.countedIncluding : c.counted, { from: words(start), to: words(end) });
    return result.backwards ? `${c.backwards} ${line}` : line;
  });

  const weeks = $derived.by(() => {
    if (!result) return '';
    const parts = [
      ...(result.weeks ? [count(result.weeks, c.units.week)] : []),
      ...(result.weekDays || !result.weeks ? [count(result.weekDays, c.units.day)] : [])
    ];
    return list(parts);
  });
  const calendar = $derived.by(() => {
    if (!result) return '';
    const { years, months, days } = result.calendar;
    const parts = [
      ...(years ? [count(years, c.units.year)] : []),
      ...(months ? [count(months, c.units.month)] : []),
      ...(days || (!years && !months) ? [count(days, c.units.day)] : [])
    ];
    return list(parts);
  });

  const amountOk = $derived(amount !== null && Number.isInteger(amount) && Math.abs(amount) <= MAX_WORKING);
  const added = $derived(from !== null && amountOk && amount !== null ? add(from, amount, unit, skipHolidays) : null);
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="date-first">{c.first}</label>
        <div class="t-actions"><button type="button" class="t-small" onclick={() => (first = today())}>{c.today}</button></div>
      </div>
      <input id="date-first" class="t-input" type="date" min="0001-01-01" max="9999-12-31" bind:value={first} />
    </div>
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="date-second">{c.second}</label>
        <div class="t-actions"><button type="button" class="t-small" onclick={() => (second = today())}>{c.today}</button></div>
      </div>
      <input id="date-second" class="t-input" type="date" min="0001-01-01" max="9999-12-31" bind:value={second} />
    </div>

    <div class="t-checks">
      <label><input type="checkbox" bind:checked={includeEnd} /> {c.includeEnd}</label>
      <label><input type="checkbox" bind:checked={skipHolidays} aria-describedby="date-holidays-hint" /> {c.skipHolidays}</label>
    </div>
    <p class="t-hint" id="date-holidays-hint">{c.holidaysHint}</p>

    <fieldset class="adder">
      <legend class="t-label">{c.add}</legend>
      <div class="t-field">
        <label class="t-label" for="date-amount">{c.amount}</label>
        <input id="date-amount" class="t-input" class:t-bad={!amountOk} type="number" step="1" min={-MAX_WORKING} max={MAX_WORKING} bind:value={amount} />
      </div>
      <div class="t-field">
        <label class="t-label" for="date-unit">{c.unit}</label>
        <select id="date-unit" class="t-input" bind:value={unit}>
          {#each UNITS as option (option)}
            <option value={option}>{c.addUnits[option]}</option>
          {/each}
        </select>
      </div>
    </fieldset>
    <p class="t-hint">{c.addHint}</p>
    <section class="t-field" aria-labelledby="date-added-label">
      <h2 class="t-label" id="date-added-label">{c.fallsOn}</h2>
      <p class="t-box mono" class:t-bad={!amountOk} data-testid="date-added">
        {#if !amountOk}{c.amountError}{:else if added !== null}{formatDay(added)} · {words(added)}{/if}
      </p>
    </section>
  </div>

  <section class="t-field" aria-labelledby="date-results">
    <h2 class="t-label" id="date-results">{c.results}</h2>
    <p class="t-status" role="status" aria-live="polite">{status}</p>
    {#if result}
      <dl class="t-kv results">
        <dt>{c.rows.days}</dt>
        <dd data-testid="date-days">{count(result.days, c.units.day)}</dd>
        <dt>{c.rows.weeks}</dt>
        <dd data-testid="date-weeks">{weeks}</dd>
        <dt>{c.rows.calendar}</dt>
        <dd data-testid="date-calendar">{calendar}</dd>
        <dt>{c.rows.working}</dt>
        <dd data-testid="date-working">{result.working.toLocaleString(language)}</dd>
        <dt>{c.rows.weekend}</dt>
        <dd data-testid="date-weekend">{result.weekend.toLocaleString(language)}</dd>
        {#if skipHolidays}
          <dt>{c.rows.holidays}</dt>
          <dd data-testid="date-holidays">{result.holidays.length.toLocaleString(language)}</dd>
        {/if}
      </dl>
      {#if result.holidays.length && result.holidays.length <= 40}
        <ul class="holidays" data-testid="date-holiday-list">
          {#each result.holidays as holiday (holiday.day)}
            <li><span>{c.holiday[holiday.name]}</span> <span class="mono when">{short(holiday.day)}</span></li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>
</div>

<style>
  .adder {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 0.4rem 0.75rem;
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  .adder legend {
    margin-bottom: 0.5rem;
  }
  p.t-box {
    max-width: none;
  }
  p.t-box.t-bad {
    color: var(--syn-num);
  }
  .results {
    gap: 0.55rem 1.25rem;
    font-size: 0.95rem;
  }
  .holidays {
    display: grid;
    gap: 0.3rem;
    margin: 0.5rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
  }
  .holidays li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.1rem 0.75rem;
  }
  .when {
    color: var(--muted);
  }
</style>
