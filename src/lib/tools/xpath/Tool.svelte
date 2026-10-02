<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import { parse } from '../xml/logic';
  import { explain } from '../xml/message';
  import { kindOf, missesDefaultNamespace, namespaces, pathOf, type Kind, type NodeLike } from './logic';
  import text_ from './text';

  const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<order id="1042" xmlns="urn:example:orders" xmlns:pay="urn:example:payments">
  <customer>
    <name>Ada Lovelace</name>
  </customer>
  <lines>
    <line sku="A-1" quantity="2">
      <description>Coffee &amp; tea</description>
      <price currency="EUR">4.50</price>
    </line>
    <line sku="B-7" quantity="1">
      <description>Mug</description>
      <price currency="EUR">9.95</price>
    </line>
  </lines>
  <pay:method>ideal</pay:method>
</order>`;
  const EXAMPLES = [
    '//d:line',
    '//d:line[d:price > 5]/d:description',
    '//d:line/@sku',
    'count(//d:line)',
    'sum(//d:price)',
    'string(//pay:method)',
    '//d:line[last()]/d:price/text()'
  ];
  /** The list shows this many nodes; the count is of all of them. */
  const LISTED = 50;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let xml = $state(SAMPLE);
  let query = $state('//d:line[d:price > 5]/d:description');

  type Result =
    | { kind: 'nodes'; nodes: { kind: Kind; path: string; text: string }[]; total: number }
    | { kind: 'value'; type: 'number' | 'string' | 'boolean'; value: string }
    | { kind: 'error'; error: 'invalid' | 'unknownPrefix' };
  /** Filled in by the browser: the server has no XPath engine to render it with. */
  let result = $state<Result | null>(null);

  // the document is first read by this site's own parser: it explains what is wrong, and knows the namespaces
  const parsed = $derived(parse(xml));
  const bindings = $derived(parsed.ok ? namespaces(parsed.document) : []);
  const defaultPrefix = $derived(bindings.find((n) => n.isDefault)?.prefix);

  function show(node: Node): string {
    if (node.nodeType === Node.ATTRIBUTE_NODE) return `${node.nodeName}="${(node as Attr).value}"`;
    if (node.nodeType === Node.DOCUMENT_NODE) return new XMLSerializer().serializeToString((node as Document).documentElement);
    if (node.nodeType === Node.ELEMENT_NODE) return new XMLSerializer().serializeToString(node);
    return node.nodeValue ?? '';
  }

  $effect(() => {
    const expression = query.trim();
    if (!parsed.ok || !expression) {
      result = null;
      return;
    }
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const lookup = new Map(bindings.map((n) => [n.prefix, n.uri]));
    try {
      const found = document.evaluate(expression, document, (prefix) => lookup.get(prefix ?? '') ?? null, XPathResult.ANY_TYPE, null);
      if (found.resultType === XPathResult.NUMBER_TYPE) result = { kind: 'value', type: 'number', value: String(found.numberValue) };
      else if (found.resultType === XPathResult.STRING_TYPE) result = { kind: 'value', type: 'string', value: found.stringValue };
      else if (found.resultType === XPathResult.BOOLEAN_TYPE) result = { kind: 'value', type: 'boolean', value: String(found.booleanValue) };
      else {
        const nodes: { kind: Kind; path: string; text: string }[] = [];
        let total = 0;
        for (let node = found.iterateNext(); node; node = found.iterateNext()) {
          if (total++ < LISTED) nodes.push({ kind: kindOf(node as unknown as NodeLike), path: pathOf(node as unknown as NodeLike), text: show(node) });
        }
        result = { kind: 'nodes', nodes, total };
      }
    } catch (e) {
      // a prefix that is not bound is a NamespaceError; anything else means the expression itself is wrong
      result = { kind: 'error', error: e instanceof DOMException && e.name === 'NamespaceError' ? 'unknownPrefix' : 'invalid' };
    }
  });

  const status = $derived.by(() => {
    if (!parsed.ok) return '';
    if (!query.trim()) return c.empty;
    if (!result) return '';
    if (result.kind === 'error') return c[result.error];
    if (result.kind === 'value') return fill(c.value, { type: c.types[result.type] });
    if (result.total === 0) return defaultPrefix && missesDefaultNamespace(query, bindings) ? fill(c.noneDefault, { prefix: defaultPrefix }) : c.none;
    return result.total === 1 ? c.one : fill(c.many, { count: String(result.total) });
  });
  const documentError = $derived(parsed.ok ? '' : explain(parsed.error, app.locale));
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="xpath-query">{c.query}</label>
      <input
        id="xpath-query"
        class="t-input"
        class:t-bad={result?.kind === 'error'}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="xpath-status"
        bind:value={query}
      />
    </div>

    <div class="t-field">
      <p class="t-label" id="xpath-examples">{c.examples}</p>
      <div class="t-actions" role="group" aria-labelledby="xpath-examples">
        {#each EXAMPLES as example (example)}
          <button type="button" class="t-small" aria-pressed={query === example} onclick={() => (query = example)}>{example}</button>
        {/each}
      </div>
    </div>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="xpath-document">{c.document}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (xml = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (xml = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="xpath-document"
        class="t-input"
        class:t-bad={!parsed.ok && xml.trim() !== ''}
        rows="14"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="xpath-document-status"
        bind:value={xml}></textarea>
      <p class="t-hint" class:t-bad={xml.trim() !== ''} id="xpath-document-status">{documentError}</p>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="xpath-results">
      <h2 class="t-label" id="xpath-results">{c.results}</h2>
      <p class="t-status" class:t-bad={result?.kind === 'error'} id="xpath-status" role="status" aria-live="polite">{status}</p>
      {#if result?.kind === 'value'}
        <pre class="t-box mono" data-testid="xpath-value">{result.value}</pre>
      {:else if result?.kind === 'nodes' && result.nodes.length}
        <ol class="list mono" data-testid="xpath-list">
          {#each result.nodes as node, i (i)}
            <li>
              <span class="path">{node.path} <span class="kind">{c.kinds[node.kind]}</span></span>
              <span class="value">{node.text}</span>
            </li>
          {/each}
        </ol>
        {#if result.total > LISTED}<p class="t-hint">{fill(c.listed, { count: String(LISTED) })}</p>{/if}
      {/if}
    </section>

    {#if bindings.length}
      <section class="t-field" aria-labelledby="xpath-namespaces">
        <h2 class="t-label" id="xpath-namespaces">{c.namespaces}</h2>
        <table class="t-table" data-testid="xpath-namespaces-table">
          <thead>
            <tr><th scope="col">{c.prefix}</th><th scope="col">{c.uri}</th></tr>
          </thead>
          <tbody>
            {#each bindings as ns (ns.prefix)}
              <tr>
                <th scope="row">{ns.prefix}</th>
                <td
                  >{ns.uri}{#if ns.isDefault}
                    <span class="note">({c.madeUp})</span>{/if}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
        {#if defaultPrefix}<p class="t-hint">{fill(c.namespaceHint, { prefix: defaultPrefix })}</p>{/if}
      </section>
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
  .kind,
  .note {
    color: var(--muted);
    font-family: var(--font);
  }
  /* the space before the note, as a margin: whitespace between the two would be dropped */
  .note {
    margin-left: 0.5em;
  }
  .value {
    white-space: pre-wrap;
  }
</style>
