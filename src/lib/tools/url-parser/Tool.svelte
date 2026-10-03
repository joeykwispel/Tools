<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { escape, parse, toJson, withParams, type Param, type Parts } from './logic';
  import text_ from './text';

  const SAMPLE = 'https://ada:s%40cret@shop.example.com:8443/products/caf%C3%A9%20table?colour=dark+oak&size=120&size=140&utm_source=newsletter#reviews';
  /** The parts in the order they are written in an address; origin is what a browser makes of the first ones. */
  const ORDER = ['scheme', 'username', 'password', 'host', 'hostUnicode', 'port', 'path', 'query', 'fragment', 'origin'] as const;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);

  const parsed = $derived(parse(input));
  const failed = $derived(!parsed.ok && parsed.error !== 'empty');
  const status = $derived.by(() => {
    if (!parsed.ok) return c.errors[parsed.error];
    if (parsed.relative) return c.relative;
    const read = parsed.params.length === 1 ? c.readOne : fill(c.read, { count: String(parsed.params.length) });
    return (parsed.assumed ? c.assumed : '') + fill(read, { scheme: parsed.parts.scheme });
  });

  /** The parts there are, each with what to show for it. */
  function rows(parts: Parts): [(typeof ORDER)[number], string][] {
    return ORDER.flatMap<[(typeof ORDER)[number], string]>((name) => {
      if (name === 'hostUnicode') return parts.hostUnicode === parts.host ? [] : [[name, parts.hostUnicode]];
      if (name === 'port' && !parts.port)
        return parts.defaultPort === null ? [] : [[name, fill(c.defaultPort, { port: String(parts.defaultPort), scheme: parts.scheme })]];
      return parts[name] ? [[name, parts[name]]] : [];
    });
  }

  /** Writes other parameters into the URL. Only the one that was changed is written anew. */
  function rewrite(change: (params: Pick<Param, 'rawKey' | 'rawValue'>[]) => void) {
    if (!parsed.ok) return;
    const params = parsed.params.map(({ rawKey, rawValue }) => ({ rawKey, rawValue }));
    change(params);
    input = withParams(input, params);
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="url-parser-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="url-parser-input"
        class="t-input"
        class:t-bad={failed}
        rows="4"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="url-parser-status"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={failed} class:t-good={parsed.ok} id="url-parser-status" role="status" aria-live="polite">{status}</p>
    </div>

    {#if parsed.ok}
      <section class="t-field" aria-labelledby="url-parser-params">
        <h2 class="t-label" id="url-parser-params">{c.params}</h2>
        {#if parsed.params.length}
          <ul class="params">
            {#each parsed.params as param, i (i)}
              {@const n = String(i + 1)}
              <li>
                <input
                  class="t-input"
                  type="text"
                  spellcheck="false"
                  autocapitalize="off"
                  autocomplete="off"
                  aria-label={fill(c.keyOf, { n })}
                  value={param.key}
                  oninput={(e) => rewrite((params) => (params[i].rawKey = escape(e.currentTarget.value)))}
                />
                <input
                  class="t-input"
                  type="text"
                  spellcheck="false"
                  autocapitalize="off"
                  autocomplete="off"
                  aria-label={fill(c.valueOf, { n })}
                  value={param.value}
                  oninput={(e) => rewrite((params) => (params[i].rawValue = escape(e.currentTarget.value)))}
                />
                <button type="button" class="t-small" aria-label={fill(c.removeOf, { n })} onclick={() => rewrite((params) => params.splice(i, 1))}
                  >{c.remove}</button
                >
              </li>
            {/each}
          </ul>
        {:else}
          <p class="t-hint">{c.noParams}</p>
        {/if}
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => rewrite((params) => params.push({ rawKey: '', rawValue: '' }))}>{c.add}</button>
        </div>
        <p class="t-hint">{c.paramsHint}</p>
      </section>
    {/if}
  </div>

  <div class="t-col">
    {#if parsed.ok}
      <section class="t-field" aria-labelledby="url-parser-parts">
        <h2 class="t-label" id="url-parser-parts">{c.parts}</h2>
        <dl class="t-kv" data-testid="url-parser-parts">
          {#each rows(parsed.parts) as [name, value] (name)}
            <dt>{c.names[name]}</dt>
            <dd>{value}</dd>
          {/each}
        </dl>
      </section>

      {#if parsed.segments.length}
        <section class="t-field" aria-labelledby="url-parser-segments">
          <h2 class="t-label" id="url-parser-segments">{c.segments}</h2>
          <ol class="segments" data-testid="url-parser-segments">
            {#each parsed.segments as segment, i (i)}
              <li class:blank={!segment}>{segment || c.emptySegment}</li>
            {/each}
          </ol>
        </section>
      {/if}

      {#if parsed.params.length}<Output id="url-parser-json" label={c.json} value={toJson(parsed.params)} />{/if}
      <Output id="url-parser-href" label={c.href} value={parsed.parts.href} />
    {/if}
  </div>
</div>

<style>
  textarea {
    min-height: 0;
  }
  .params {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .params li {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
    gap: 0.5rem;
    align-items: center;
  }
  .segments {
    display: grid;
    gap: 0.3rem;
    margin: 0;
    padding-left: 1.6rem;
    font-family: var(--mono);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .segments ::marker {
    color: var(--muted);
  }
  .blank {
    color: var(--muted);
  }
</style>
