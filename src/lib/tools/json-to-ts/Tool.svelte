<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { parse, toValue } from '../json/logic';
  import jsonText from '../json/text';
  import { infer, toTypeScript, toZod } from './logic';
  import text_ from './text';

  const SAMPLE = `{
  "id": 42,
  "name": "Ada Lovelace",
  "email": null,
  "roles": ["admin", "editor"],
  "address": { "city": "Druten", "country": "NL" },
  "orders": [
    { "id": 1, "total": 19.95, "paid": true },
    { "id": 2, "total": 5, "paid": false, "coupon": "WELCOME" }
  ]
}`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let rootName = $state('User');

  const parsed = $derived(parse(input));
  const shape = $derived(parsed.ok ? infer(toValue(parsed.node)) : null);
  const status = $derived.by(() => {
    if (parsed.ok) return '';
    const { kind, line, column, found } = parsed.error;
    const errors = jsonText[app.locale].errors;
    if (kind === 'empty') return errors.empty;
    return fill(c.at, { line: String(line), column: String(column) }) + fill(errors[kind], { found });
  });
  const failed = $derived(!parsed.ok && parsed.error.kind !== 'empty');
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="json-to-ts-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="json-to-ts-input"
        class="t-input"
        class:t-bad={failed}
        rows="14"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="json-to-ts-status"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={failed} id="json-to-ts-status" role="status" aria-live="polite">{status}</p>
    </div>

    <div class="t-field">
      <label class="t-label" for="json-to-ts-name">{c.rootName}</label>
      <input id="json-to-ts-name" class="t-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" bind:value={rootName} />
    </div>
    <p class="t-hint">{c.hint}</p>
  </div>

  <div class="t-col">
    {#if shape}
      <Output id="json-to-ts-typescript" label={c.typescript} value={toTypeScript(shape, rootName || 'Root')} />
      <Output id="json-to-ts-zod" label={c.zod} value={toZod(shape, rootName || 'Root')} />
    {/if}
  </div>
</div>
