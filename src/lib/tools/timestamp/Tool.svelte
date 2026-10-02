<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { UNITS, inWords, read, relative, toHttp, toIso, toSeconds, toWeekDate, type Unit } from './logic';
  import text_ from './text';

  const UNIT_CHOICES: (Unit | 'auto')[] = ['auto', ...UNITS];

  const c = $derived(text_[app.locale]);
  /** British English writes a date the way the rest of the page does: day, month, year, 24 hours. */
  const language = $derived(app.locale === 'nl' ? 'nl-NL' : 'en-GB');

  let input = $state('1700000000');
  let unit = $state<Unit | 'auto'>('auto');
  let zone = $state('UTC');
  /** The visitor's own zone and the list of all zones: known once the page runs in a browser. */
  let own = $state('');
  let zones = $state<string[]>(['UTC']);
  /** The time, once the page runs in a browser: the server that renders the page has another moment. */
  let now = $state<number | null>(null);

  onMount(() => {
    own = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    zones = [...new Set([own, 'UTC', ...all])];
    zone = own;
    now = Date.now();
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });

  const result = $derived(read(input, zone, unit));
  const status = $derived(
    !result.ok ? c.errors[result.error] : result.kind === 'timestamp' ? c.read[result.unit] : result.zoned ? c.read.zoned : fill(c.read.local, { zone })
  );

  const rows = $derived.by(() => {
    if (!result.ok) return [];
    const { ms } = result;
    return [
      { id: 'seconds', label: c.rows.seconds, value: toSeconds(ms) },
      { id: 'milliseconds', label: c.rows.milliseconds, value: String(ms) },
      { id: 'iso-utc', label: c.rows.isoUtc, value: toIso(ms) },
      ...(zone === 'UTC' ? [] : [{ id: 'iso-zone', label: fill(c.rows.isoZone, { zone }), value: toIso(ms, zone) }]),
      { id: 'http', label: c.rows.http, value: toHttp(ms) },
      { id: 'week', label: c.rows.week, value: toWeekDate(ms, zone) },
      // these two are written by the browser's own knowledge of the language, which the server may write differently
      ...(now === null
        ? []
        : [
            { id: 'words', label: c.rows.words, value: inWords(ms, zone, language) },
            { id: 'relative', label: c.rows.relative, value: relative(ms, now, language) }
          ])
    ];
  });
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="timestamp-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = toSeconds(Date.now()))}>{c.now}</button>
        </div>
      </div>
      <input
        id="timestamp-input"
        class="t-input"
        class:t-bad={!result.ok && result.error !== 'empty'}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="timestamp-hint timestamp-status"
        bind:value={input}
      />
      <p class="t-status" class:t-bad={!result.ok} id="timestamp-status" role="status" aria-live="polite">{status}</p>
      <p class="t-hint" id="timestamp-hint">{c.inputHint}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.unit}</legend>
      {#each UNIT_CHOICES as option (option)}
        <label><input type="radio" name="timestamp-unit" value={option} bind:group={unit} /> {c.units[option]}</label>
      {/each}
    </fieldset>

    <div class="t-field">
      <label class="t-label" for="timestamp-zone">{c.zone}</label>
      <select id="timestamp-zone" class="t-input" aria-describedby="timestamp-zone-hint" bind:value={zone}>
        {#each zones as option (option)}
          <option value={option}>{option === own ? fill(c.yours, { zone: option }) : option}</option>
        {/each}
      </select>
      <p class="t-hint" id="timestamp-zone-hint">{c.zoneHint}</p>
    </div>

    {#if now !== null}
      <!-- not announced: it changes every second -->
      <p class="t-hint mono" data-testid="timestamp-now">{fill(c.nowIs, { seconds: toSeconds(now) })}</p>
    {/if}
  </div>

  <section class="t-col" aria-labelledby="timestamp-results">
    <h2 class="t-label" id="timestamp-results">{c.results}</h2>
    {#each rows as row (row.id)}
      <Output id="timestamp-{row.id}" label={row.label} value={row.value} />
    {/each}
  </section>
</div>
