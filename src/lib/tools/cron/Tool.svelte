<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import { inWords, relative } from '../timestamp/logic';
  import { FIELDS, compact, describe, fullSize, next, parse, type CronError } from './logic';
  import text_ from './text';

  const EXAMPLES = ['*/15 * * * *', '0 9 * * 1-5', '30 2 * * 0', '0 0 1 * *', '0 8-18/2 * * *', '@daily'];
  const RUNS = 5;

  const c = $derived(text_[app.locale]);
  /** British English writes a date the way the rest of the page does: day, month, year, 24 hours. */
  const language = $derived(app.locale === 'nl' ? 'nl-NL' : 'en-GB');

  let expression = $state('0 9 * * 1-5');
  let zone = $state('UTC');
  /** The visitor's own time zone and the time: known once the page runs in a browser. */
  let own = $state('');
  let now = $state<number | null>(null);

  onMount(() => {
    own = Intl.DateTimeFormat().resolvedOptions().timeZone;
    now = Date.now();
    // the list only changes when a minute has gone by
    const timer = setInterval(() => (now = Date.now()), 15_000);
    return () => clearInterval(timer);
  });

  const cron = $derived(parse(expression));
  const meaning = $derived(cron.ok ? describe(cron.fields, c.words, language) : '');
  const runs = $derived(cron.ok && now !== null ? next(cron.fields, now, zone, RUNS) : null);

  function explain(error: CronError): string {
    if (error.kind === 'fields') {
      const message = error.count === 0 ? c.errors.fields.zero : error.count < FIELDS.length ? c.errors.fields.few : c.errors.fields.many;
      return fill(message, { count: String(error.count) });
    }
    if (error.kind === 'reboot') return c.errors.reboot;
    if (error.kind === 'macro') return fill(c.errors.macro, { token: error.token });
    const vars = { field: c.field[error.field], token: error.token };
    return error.kind === 'value' ? fill(c.errors.value, { ...vars, min: String(error.min), max: String(error.max) }) : fill(c.errors[error.kind], vars);
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="cron-expression">{c.expression}</label>
      <input
        id="cron-expression"
        class="t-input expression"
        class:t-bad={!cron.ok && !(cron.error.kind === 'fields' && cron.error.count === 0)}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="cron-hint cron-meaning"
        bind:value={expression}
      />
      <p class="t-hint" id="cron-hint">{c.hint}</p>
    </div>

    <div class="t-field">
      <h2 class="t-label" id="cron-examples">{c.examples}</h2>
      <div class="t-actions" role="group" aria-labelledby="cron-examples">
        {#each EXAMPLES as example (example)}
          <button type="button" class="t-small" aria-pressed={expression.trim() === example} onclick={() => (expression = example)}>{example}</button>
        {/each}
      </div>
    </div>

    <section class="t-field" aria-labelledby="cron-meaning-label">
      <h2 class="t-label" id="cron-meaning-label">{c.meaning}</h2>
      <p class="meaning" class:t-bad={!cron.ok} id="cron-meaning" role="status" aria-live="polite">{cron.ok ? meaning : explain(cron.error)}</p>
      {#if cron.ok && cron.expanded}<p class="t-hint">{fill(c.shorthand, { expression: cron.expanded })}</p>{/if}
    </section>
  </div>

  <div class="t-col">
    {#if cron.ok}
      <section class="t-field" aria-labelledby="cron-fields">
        <h2 class="t-label" id="cron-fields">{c.fields}</h2>
        <table class="t-table" data-testid="cron-fields">
          <tbody>
            {#each FIELDS as name (name)}
              {@const field = cron.fields[name]}
              <tr>
                <th scope="row">{c.field[name]}</th>
                <td class="typed">{field.text}</td>
                <td>
                  {field.values.length === fullSize(name) ? fill(c.all, { values: compact(field.values) }) : compact(field.values)}
                  {#if name === 'dayOfWeek' && field.values.length < 7}<span class="note">({c.sunday})</span>{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>

      <section class="t-field" aria-labelledby="cron-next">
        <h2 class="t-label" id="cron-next">{c.next}</h2>
        <fieldset class="t-checks">
          <legend class="sr-only">{c.zone}</legend>
          <label><input type="radio" name="cron-zone" value="UTC" bind:group={zone} /> {c.utc}</label>
          {#if own && own !== 'UTC'}
            <label><input type="radio" name="cron-zone" value={own} bind:group={zone} /> {fill(c.own, { zone: own })}</label>
          {/if}
        </fieldset>
        {#if runs && now !== null}
          {#if runs.length}
            <ol class="runs" data-testid="cron-runs">
              {#each runs as run (run)}
                <li><span class="mono">{inWords(run, zone, language)}</span> <span class="when">{relative(run, now, language)}</span></li>
              {/each}
            </ol>
          {:else}
            <p class="t-hint" data-testid="cron-runs">{c.never}</p>
          {/if}
        {/if}
      </section>
    {/if}
  </div>
</div>

<style>
  .expression {
    font-size: 1.1rem;
    letter-spacing: 0.05em;
  }
  .meaning {
    margin: 0;
    max-width: none;
    font-size: 1.15rem;
    line-height: 1.5;
    color: var(--text);
  }
  .meaning.t-bad {
    font-size: 0.9rem;
    color: var(--syn-num);
  }
  th[scope='row'] {
    font-weight: 500;
  }
  .typed {
    font-family: var(--mono);
    color: var(--accent-text);
    white-space: nowrap;
  }
  td {
    overflow-wrap: anywhere;
  }
  .note {
    color: var(--muted);
    white-space: nowrap;
  }
  .runs {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
  }
  .runs li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem 0.75rem;
    justify-content: space-between;
  }
  .when {
    color: var(--muted);
  }
</style>
