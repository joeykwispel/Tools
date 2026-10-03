<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import { classOf, findMimes, findStatuses } from './logic';
  import text_ from './text';

  const c = $derived(text_[app.locale]);

  let query = $state('');

  const statuses = $derived(findStatuses(query, (code) => c.status[code]));
  const mimes = $derived(findMimes(query, app.locale));
</script>

<div class="t-col">
  <div class="t-field">
    <label class="t-label" for="http-status-search">{c.search}</label>
    <input
      id="http-status-search"
      class="t-input"
      type="search"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      aria-describedby="http-status-found http-status-hint"
      bind:value={query}
    />
    <p class="t-status" id="http-status-found" role="status" aria-live="polite">
      {fill(c.found, { statuses: String(statuses.length), mimes: String(mimes.length) })}
    </p>
    <p class="t-hint" id="http-status-hint">{c.searchHint}</p>
  </div>

  <div class="t-tool">
    <section class="t-field" aria-labelledby="http-status-codes">
      <h2 class="t-label" id="http-status-codes">{c.statuses}</h2>
      {#if statuses.length}
        <ul class="codes" data-testid="http-status-codes">
          {#each statuses as status, i (status.code)}
            {#if i === 0 || classOf(statuses[i - 1].code) !== classOf(status.code)}
              <li class="group">{c.classes[classOf(status.code)]}</li>
            {/if}
            <li class="status">
              <span class="code c{classOf(status.code)}">{status.code}</span>
              <div>
                <strong>{status.name}</strong>
                <p>{c.status[status.code]}</p>
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="t-hint">{c.noStatuses}</p>
      {/if}
    </section>

    <section class="t-field" aria-labelledby="http-status-mimes">
      <h2 class="t-label" id="http-status-mimes">{c.mimes}</h2>
      {#if mimes.length}
        <table class="t-table" data-testid="http-status-mimes">
          <thead>
            <tr><th scope="col">{c.type}</th><th scope="col">{c.extension}</th><td></td></tr>
          </thead>
          <tbody>
            {#each mimes as mime (mime.type)}
              <tr>
                <th scope="row">
                  <span class="type">{mime.type}</span>
                  <span class="what">{mime[app.locale]}</span>
                </th>
                <td class="extensions">{mime.extensions.map((extension) => `.${extension}`).join(' ')}</td>
                <td class="action"><CopyButton text={mime.type} /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="t-hint">{c.noMimes}</p>
      {/if}
    </section>
  </div>
</div>

<style>
  .codes {
    display: grid;
    gap: 0.7rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .group {
    margin-top: 0.5rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--border);
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted);
  }
  .group:first-child {
    margin-top: 0;
  }
  .status {
    display: grid;
    grid-template-columns: 2.6rem minmax(0, 1fr);
    gap: 0.75rem;
    align-items: baseline;
  }
  .code {
    font-family: var(--mono);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--muted);
  }
  .code.c2 {
    color: var(--accent-text);
  }
  .code.c4,
  .code.c5 {
    color: var(--syn-num);
  }
  .status strong {
    font-size: 0.9rem;
  }
  .status p {
    margin: 0.1rem 0 0;
    max-width: none;
    font-size: 0.85rem;
    color: var(--muted);
  }
  tbody th {
    font-size: 0.82rem;
    color: var(--text);
  }
  .type,
  .what {
    display: block;
  }
  .what {
    margin-top: 0.1rem;
    font-family: var(--font);
    font-weight: 400;
    color: var(--muted);
  }
  .extensions,
  .action {
    white-space: nowrap;
  }
  .action {
    width: 1%;
    text-align: right;
  }
</style>
