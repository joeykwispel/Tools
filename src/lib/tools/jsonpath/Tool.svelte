<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { parse as parseJson, toValue } from '../json/logic';
  import jsonText from '../json/text';
  import { PathError, evaluate, normalPath, parse, type Match } from './logic';
  import text_ from './text';

  const SAMPLE = `{
  "store": {
    "book": [
      { "category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95 },
      { "category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99 },
      { "category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "isbn": "0-553-21311-3", "price": 8.99 },
      { "category": "fiction", "author": "J. R. R. Tolkien", "title": "The Lord of the Rings", "isbn": "0-395-19395-8", "price": 22.99 }
    ],
    "bicycle": { "color": "red", "price": 399 }
  }
}`;
  const EXAMPLES = [
    '$.store.book[*].author',
    '$..price',
    '$..book[-1]',
    '$..book[:2].title',
    '$..book[?@.price < 10]',
    "$..book[?@.isbn && @.category == 'fiction'].title"
  ];
  /** The list shows this many matches; the values under it hold all of them. */
  const LISTED = 50;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let document_ = $state(SAMPLE);
  let query = $state('$..book[?@.price < 10].title');

  const parsed = $derived(parseJson(document_));
  const result = $derived.by((): { matches: Match[]; error: string } => {
    if (!parsed.ok) return { matches: [], error: '' };
    try {
      return { matches: evaluate(parse(query), toValue(parsed.node)), error: '' };
    } catch (e) {
      if (!(e instanceof PathError)) throw e;
      return { matches: [], error: fill(c.errors[e.kind], { found: e.found, position: String(e.position + 1) }) };
    }
  });
  const documentError = $derived.by(() => {
    if (parsed.ok) return '';
    const { kind, line, column, found } = parsed.error;
    if (kind === 'empty') return c.documentEmpty;
    return fill(c.documentError, { line: String(line), column: String(column), message: fill(jsonText[app.locale].errors[kind], { found }) });
  });
  const status = $derived.by(() => {
    if (documentError) return '';
    if (result.error) return result.error;
    const n = result.matches.length;
    return n === 0 ? c.none : n === 1 ? c.one : fill(c.many, { count: String(n) });
  });
  const show = (value: unknown) => JSON.stringify(value);
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="jsonpath-query">{c.query}</label>
      <input
        id="jsonpath-query"
        class="t-input"
        class:t-bad={!!result.error}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="jsonpath-status"
        bind:value={query}
      />
    </div>

    <div class="t-field">
      <p class="t-label" id="jsonpath-examples">{c.examples}</p>
      <div class="t-actions" role="group" aria-labelledby="jsonpath-examples">
        {#each EXAMPLES as example (example)}
          <button type="button" class="t-small" aria-pressed={query === example} onclick={() => (query = example)}>{example}</button>
        {/each}
      </div>
    </div>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="jsonpath-document">{c.document}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (document_ = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (document_ = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="jsonpath-document"
        class="t-input"
        class:t-bad={!!documentError && document_.trim() !== ''}
        rows="14"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="jsonpath-document-status"
        bind:value={document_}></textarea>
      <p class="t-hint" class:t-bad={document_.trim() !== ''} id="jsonpath-document-status">{documentError}</p>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="jsonpath-matches">
      <h2 class="t-label" id="jsonpath-matches">{c.matches}</h2>
      <p class="t-status" class:t-bad={!!result.error} id="jsonpath-status" role="status" aria-live="polite">{status}</p>
      {#if result.matches.length}
        <ol class="list mono" data-testid="jsonpath-list">
          {#each result.matches.slice(0, LISTED) as match, i (i)}
            <li><span class="path">{normalPath(match.path)}</span><span class="value">{show(match.value)}</span></li>
          {/each}
        </ol>
        {#if result.matches.length > LISTED}<p class="t-hint">{fill(c.listed, { count: String(LISTED) })}</p>{/if}
      {/if}
    </section>

    {#if result.matches.length}
      <Output
        id="jsonpath-values"
        label={c.values}
        value={JSON.stringify(
          result.matches.map((m) => m.value),
          null,
          2
        )}
      />
    {/if}
  </div>
</div>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;
    font-size: 0.82rem;
  }
  .list li {
    display: grid;
    gap: 0.15rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    overflow-wrap: anywhere;
  }
  .path {
    color: var(--accent-text);
  }
  .value {
    white-space: pre-wrap;
  }
</style>
