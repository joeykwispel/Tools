<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { parse, toFetch, type Reading } from './logic';
  import text_ from './text';

  const SAMPLE = `curl -X POST 'https://api.example.com/v1/orders?expand=lines' \\
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.e30.abc' \\
  -H 'Content-Type: application/json' \\
  --data-raw '{"customer":"ada@example.com","lines":[{"sku":"A-1","quantity":2}]}' \\
  --compressed`;
  const READINGS: Reading[] = ['json', 'text', 'none'];

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let reading = $state<Reading>('json');

  const parsed = $derived(parse(input));
  const failed = $derived(!parsed.ok && parsed.error !== 'empty');
  const status = $derived.by(() => {
    if (!parsed.ok) return fill(c.errors[parsed.error], parsed.vars);
    const { method, headers } = parsed.request;
    return fill(headers.length === 1 ? c.readOne : c.read, { method, count: String(headers.length) });
  });
  /** The body as it is sent, to read back. */
  const body = $derived.by(() => {
    if (!parsed.ok || !parsed.request.body) return '';
    const sent = parsed.request.body;
    if (sent.kind === 'text') return sent.text;
    if (sent.kind === 'file') return fill(c.bodyFile, { name: sent.name });
    return sent.fields.map((field) => `${field.name} = ${field.file ? fill(c.formFile, { name: field.value }) : field.value}`).join('\n');
  });
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="curl-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="curl-input"
        class="t-input"
        class:t-bad={failed}
        rows="9"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="curl-status curl-hint"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={failed} class:t-good={parsed.ok} id="curl-status" role="status" aria-live="polite">{status}</p>
      <p class="t-hint" id="curl-hint">{c.inputHint}</p>
    </div>

    {#if parsed.ok}
      <section class="t-field" aria-labelledby="curl-request">
        <h2 class="t-label" id="curl-request">{c.request}</h2>
        <dl class="t-kv" data-testid="curl-request">
          <dt>{c.method}</dt>
          <dd>{parsed.request.method}</dd>
          <dt>{c.url}</dt>
          <dd>{parsed.request.url}</dd>
        </dl>
      </section>
      {#if parsed.request.headers.length}
        <section class="t-field" aria-labelledby="curl-headers">
          <h2 class="t-label" id="curl-headers">{c.headers}</h2>
          <dl class="t-kv" data-testid="curl-headers">
            {#each parsed.request.headers as [name, value], i (i)}
              <dt>{name}</dt>
              <dd>{value}</dd>
            {/each}
          </dl>
        </section>
      {/if}
      {#if body}<Output id="curl-body" label={c.body} value={body} copy={false} />{/if}
    {/if}
  </div>

  <div class="t-col">
    {#if parsed.ok}
      <fieldset class="t-checks">
        <legend class="t-label">{c.reading}</legend>
        {#each READINGS as option (option)}
          <label><input type="radio" name="curl-reading" value={option} bind:group={reading} /> {c.readings[option]}</label>
        {/each}
      </fieldset>
      <Output id="curl-code" label={c.code} value={toFetch(parsed.request, reading)} />

      {#if parsed.notes.length}
        <section class="t-field" aria-labelledby="curl-notes">
          <h2 class="t-label" id="curl-notes">{c.notes}</h2>
          <ul class="notes" data-testid="curl-notes">
            {#each parsed.notes as note, i (i)}
              <li>{fill(c.note[note.id], note.vars)}</li>
            {/each}
          </ul>
        </section>
      {/if}
    {/if}
  </div>
</div>

<style>
  .notes {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.85rem;
    color: var(--muted);
  }
</style>
