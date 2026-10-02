<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { parse as parseJson, toValue } from '../json/logic';
  import jsonText from '../json/text';
  import { parse as parseXml } from '../xml/logic';
  import { explain } from '../xml/message';
  import { jsonToXml, xmlToJson, type Json } from './logic';
  import text_ from './text';

  const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<order id="1042">
  <customer>
    <name>Ada Lovelace</name>
  </customer>
  <line sku="A-1" quantity="2">
    <price currency="EUR">4.50</price>
  </line>
  <line sku="B-7" quantity="1">
    <price currency="EUR">9.95</price>
  </line>
  <paid>true</paid>
  <note/>
</order>`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let mode = $state<'toJson' | 'toXml'>('toJson');
  let input = $state(SAMPLE);
  let types = $state(false);
  let declaration = $state(true);
  let indent = $state(2);

  const result = $derived.by((): { output: string; status: string; bad: boolean } => {
    const pad = ' '.repeat(indent);
    if (mode === 'toJson') {
      const parsed = parseXml(input);
      if (!parsed.ok) return { output: '', status: explain(parsed.error, app.locale), bad: parsed.error.kind !== 'empty' };
      return { output: JSON.stringify(xmlToJson(parsed.document, { types }), null, pad), status: '', bad: false };
    }
    const parsed = parseJson(input);
    if (!parsed.ok) {
      const { kind, line, column, found } = parsed.error;
      const errors = jsonText[app.locale].errors;
      const status = kind === 'empty' ? errors.empty : fill(c.jsonAt, { line: String(line), column: String(column) }) + fill(errors[kind], { found });
      return { output: '', status, bad: kind !== 'empty' };
    }
    const output = jsonToXml(toValue(parsed.node) as Json, { indent: pad, declaration });
    return { output, status: /^(<\?xml[^>]*>\n)?<root[ >/]/.test(output) && !/"root"\s*:/.test(input) ? c.wrapped : '', bad: false };
  });

  function setMode(next: 'toJson' | 'toXml') {
    if (next === mode) return;
    // carry the result over, so converting back is one click
    const carry = result.output;
    mode = next;
    input = carry;
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.mode}</legend>
      <label><input type="radio" name="xml-json-mode" checked={mode === 'toJson'} onchange={() => setMode('toJson')} /> {c.toJson}</label>
      <label><input type="radio" name="xml-json-mode" checked={mode === 'toXml'} onchange={() => setMode('toXml')} /> {c.toXml}</label>
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="xml-json-input">{mode === 'toJson' ? c.xml : c.json}</label>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            onclick={() => {
              const parsed = parseXml(SAMPLE);
              input = mode === 'toJson' ? SAMPLE : parsed.ok ? JSON.stringify(xmlToJson(parsed.document), null, 2) : '';
            }}>{common.sample}</button
          >
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="xml-json-input"
        class="t-input"
        class:t-bad={result.bad}
        rows="14"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="xml-json-status xml-json-hint"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={result.bad} id="xml-json-status" role="status" aria-live="polite">{result.status}</p>
      <p class="t-hint" id="xml-json-hint">{c.convention}</p>
    </div>

    <div class="t-checks">
      {#if mode === 'toJson'}
        <label><input type="checkbox" bind:checked={types} /> {c.types}</label>
      {:else}
        <label><input type="checkbox" bind:checked={declaration} /> {c.declaration}</label>
      {/if}
    </div>
    <fieldset class="t-checks">
      <legend class="t-label">{c.indent}</legend>
      <label><input type="radio" name="xml-json-indent" value={2} bind:group={indent} /> {c.two}</label>
      <label><input type="radio" name="xml-json-indent" value={4} bind:group={indent} /> {c.four}</label>
    </fieldset>
  </div>

  <div class="t-col">
    <Output id="xml-json-output" label={c.result} value={result.output} />
  </div>
</div>
