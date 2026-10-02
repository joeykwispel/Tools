<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import { detect, filter, parse, sort, table, toJson, type Delimiter } from './logic';
  import text_ from './text';

  const SAMPLE = `name,language,stars,first release
Svelte,JavaScript,84500,2016-11-26
"React, the library",JavaScript,236000,2013-05-29
Vue,TypeScript,48900,2014-02-01
htmx,JavaScript,43100,2020-05-10
Angular,TypeScript,98200,2016-09-14
`;
  const TAB = '\t';
  const MAX_FILE = 5_000_000;
  /** The page shows this many rows; sorting, filtering and copying use all of them. */
  const SHOWN = 300;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let choice = $state<Delimiter | 'auto'>('auto');
  let firstRowIsHeader = $state(true);
  let query = $state('');
  let sorted = $state<{ column: number; direction: 'ascending' | 'descending' } | null>(null);
  let fileError = $state('');

  const delimiter = $derived(choice === 'auto' ? detect(input) : choice);
  const data = $derived(table(parse(input, delimiter), firstRowIsHeader, (n) => fill(c.column, { n: String(n) })));
  const matching = $derived(filter(data.rows, query));
  const rows = $derived(sorted ? sort(matching, sorted.column, sorted.direction) : matching);

  const status = $derived.by(() => {
    if (!data.header.length) return c.empty;
    const base = fill(data.rows.length === 1 ? c.summaryOne : c.summary, {
      rows: String(data.rows.length),
      columns: String(data.header.length),
      delimiter: c.names[delimiter]
    });
    const notes = [
      query.trim() ? fill(c.filtered, { shown: String(matching.length), rows: String(data.rows.length) }) : '',
      data.ragged ? fill(c.ragged, { count: String(data.ragged) }) : ''
    ];
    return [base, ...notes].filter(Boolean).join(' ');
  });

  function sortBy(column: number) {
    // first click sorts up, the second down, the third puts the rows back as they were
    if (sorted?.column !== column) sorted = { column, direction: 'ascending' };
    else sorted = sorted.direction === 'ascending' ? { column, direction: 'descending' } : null;
  }

  async function pick(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    fileError = '';
    if (file.size > MAX_FILE) {
      fileError = fill(c.fileTooLarge, { name: file.name, max: '5 MB' });
      return;
    }
    input = await file.text();
    sorted = null;
    query = '';
  }
</script>

<div class="t-col">
  <div class="t-tool">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="csv-input">{c.input}</label>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            onclick={() => {
              input = SAMPLE;
              sorted = null;
            }}>{common.sample}</button
          >
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="csv-input" class="t-input" rows="8" spellcheck="false" autocapitalize="off" autocomplete="off" bind:value={input}></textarea>
    </div>

    <div class="t-col">
      <div class="t-field">
        <label class="t-label" for="csv-file">{c.file}</label>
        <input id="csv-file" class="t-input" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onchange={pick} aria-describedby="csv-file-hint" />
        <p class="t-hint" class:t-bad={!!fileError} id="csv-file-hint">{fileError || fill(c.fileHint, { max: '5 MB' })}</p>
      </div>
      <div class="t-field">
        <label class="t-label" for="csv-delimiter">{c.delimiter}</label>
        <select id="csv-delimiter" class="t-input" bind:value={choice}>
          <option value="auto">{c.auto}</option>
          <option value=",">{c.comma}</option>
          <option value=";">{c.semicolon}</option>
          <option value={TAB}>{c.tab}</option>
          <option value="|">{c.pipe}</option>
        </select>
      </div>
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={firstRowIsHeader} /> {c.header}</label>
      </div>
    </div>
  </div>

  <section class="t-field" aria-labelledby="csv-table">
    <div class="t-row">
      <h2 class="t-label" id="csv-table">{c.table}</h2>
      {#if data.rows.length}<CopyButton text={toJson({ header: data.header, rows })} label={c.copyJson} />{/if}
    </div>
    <p class="t-status" role="status" aria-live="polite">{status}</p>

    {#if data.header.length}
      <div class="t-field filter">
        <label class="t-label" for="csv-filter">{c.filter}</label>
        <input id="csv-filter" class="t-input" type="search" spellcheck="false" autocomplete="off" bind:value={query} />
      </div>

      <!-- A wide table scrolls sideways inside this region, which the keyboard can reach and scroll. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="scroll" role="region" aria-labelledby="csv-table" tabindex="0">
        <table class="t-table" data-testid="csv-table">
          <thead>
            <tr>
              {#each data.header as name, i (i)}
                <th scope="col" aria-sort={sorted?.column === i ? sorted.direction : 'none'}>
                  <button type="button" onclick={() => sortBy(i)} aria-label={fill(c.sortBy, { name })}>
                    {name}
                    <span class="arrow" aria-hidden="true">{sorted?.column === i ? (sorted.direction === 'ascending' ? '▲' : '▼') : '↕'}</span>
                  </button>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rows.slice(0, SHOWN) as row, r (r)}
              <tr>
                {#each row as cell, i (i)}<td>{cell}</td>{/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if rows.length > SHOWN}<p class="t-hint">{fill(c.listed, { count: String(SHOWN) })}</p>{/if}
    {/if}
  </section>
</div>

<style>
  .filter {
    max-width: 22rem;
  }
  .scroll {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  table {
    white-space: pre-wrap;
  }
  th {
    white-space: nowrap;
  }
  th button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
  }
  th button:hover,
  th[aria-sort='ascending'] button,
  th[aria-sort='descending'] button {
    color: var(--accent-text);
  }
  .arrow {
    font-size: 0.7rem;
  }
  tbody tr:last-child td {
    border-bottom: 0;
  }
</style>
