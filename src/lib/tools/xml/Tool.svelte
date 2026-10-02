<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { format, parse, stats } from './logic';
  import { explain } from './message';
  import text_ from './text';

  const SAMPLE =
    '<?xml version="1.0" encoding="UTF-8"?><order id="1042" xmlns="urn:example:orders"><customer><name>Ada Lovelace</name><email>ada@example.com</email></customer><lines><line sku="A-1" quantity="2"><description>Coffee &amp; tea</description><price currency="EUR">4.50</price></line><line sku="B-7" quantity="1"><description>Mug</description><price currency="EUR">9.95</price></line></lines><note/></order>';
  const INDENTS = { two: '  ', four: '    ', tab: '\t', minify: null } as const;
  type Layout = keyof typeof INDENTS;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let layout = $state<Layout>('two');

  const parsed = $derived(parse(input));
  const output = $derived(parsed.ok ? format(parsed.document, INDENTS[layout]) : '');
  const status = $derived.by(() => {
    if (!parsed.ok) return explain(parsed.error, app.locale);
    const s = stats(parsed.document);
    return fill(c.valid, { elements: String(s.elements), attributes: String(s.attributes), depth: String(s.depth) });
  });
  const failed = $derived(!parsed.ok && parsed.error.kind !== 'empty');
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="xml-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="xml-input"
        class="t-input"
        class:t-bad={failed}
        rows="12"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="xml-status xml-hint"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={failed} class:t-good={parsed.ok} id="xml-status" role="status" aria-live="polite">{status}</p>
      <p class="t-hint" id="xml-hint">{c.hint}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.layout}</legend>
      <label><input type="radio" name="xml-layout" value="two" bind:group={layout} /> {c.two}</label>
      <label><input type="radio" name="xml-layout" value="four" bind:group={layout} /> {c.four}</label>
      <label><input type="radio" name="xml-layout" value="tab" bind:group={layout} /> {c.tab}</label>
      <label><input type="radio" name="xml-layout" value="minify" bind:group={layout} /> {c.minify}</label>
    </fieldset>
  </div>

  <div class="t-col">
    {#if parsed.ok}<Output id="xml-output" label={c.result} value={output} />{/if}
  </div>
</div>
