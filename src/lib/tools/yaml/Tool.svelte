<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import jsonText from '../json/text';
  import { jsonToYaml, yamlToJson } from './logic';
  import text_ from './text';

  const SAMPLE = `# a pipeline
name: PR check
on:
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm ci
      - run: npm run lint
`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let mode = $state<'toJson' | 'toYaml'>('toJson');
  let input = $state(SAMPLE);
  let indent = $state(2);

  const result = $derived(mode === 'toJson' ? yamlToJson(input, indent) : jsonToYaml(input, indent));
  const output = $derived(result.ok ? result.text : '');
  const status = $derived.by(() => {
    if (result.ok) return result.documents > 1 ? fill(c.documents, { count: String(result.documents) }) : '';
    if (result.kind === 'empty') return c.empty;
    // invalid JSON is explained the way the JSON formatter does; for YAML the library's own message is the best there is
    const errors = jsonText[app.locale].errors as Record<string, string>;
    const message = result.kind ? fill(errors[result.kind], { found: result.message }) : result.message;
    return (result.line ? fill(c.at, { line: String(result.line), column: String(result.column) }) : '') + message;
  });
  const failed = $derived(!result.ok && result.kind !== 'empty');

  function setMode(next: 'toJson' | 'toYaml') {
    if (next === mode) return;
    // carry the result over, so converting back is one click
    const carry = output;
    mode = next;
    input = carry;
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.mode}</legend>
      <label><input type="radio" name="yaml-mode" checked={mode === 'toJson'} onchange={() => setMode('toJson')} /> {c.toJson}</label>
      <label><input type="radio" name="yaml-mode" checked={mode === 'toYaml'} onchange={() => setMode('toYaml')} /> {c.toYaml}</label>
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="yaml-input">{mode === 'toJson' ? c.yaml : c.json}</label>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            onclick={() => {
              const json = yamlToJson(SAMPLE);
              input = mode === 'toJson' ? SAMPLE : json.ok ? json.text : '';
            }}>{common.sample}</button
          >
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="yaml-input"
        class="t-input"
        class:t-bad={failed}
        rows="14"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="yaml-status"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={failed} id="yaml-status" role="status" aria-live="polite">{status}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.indent}</legend>
      <label><input type="radio" name="yaml-indent" value={2} bind:group={indent} /> {c.two}</label>
      <label><input type="radio" name="yaml-indent" value={4} bind:group={indent} /> {c.four}</label>
    </fieldset>
  </div>

  <div class="t-col">
    <Output id="yaml-output" label={c.result} value={output} />
  </div>
</div>
