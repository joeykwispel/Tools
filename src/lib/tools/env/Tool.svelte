<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { parse as parseJson, toValue } from '../json/logic';
  import jsonText from '../json/text';
  import { fromJson, parseEnv, toJson } from './logic';
  import text_ from './text';

  const SAMPLE = `# the database
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD="p@ss word#1"

export API_URL=https://api.example.com/v1 # production
DEBUG=false
`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let mode = $state<'toJson' | 'toEnv'>('toJson');
  let input = $state(SAMPLE);
  let rename = $state(true);

  /** The result, a line that says how it went, and the lines of the input that had something wrong with them. */
  const result = $derived.by((): { output: string; status: string; bad: boolean; notes: string[] } => {
    const counted = (n: number) => (n === 1 ? c.countOne : fill(c.count, { count: String(n) }));
    if (mode === 'toJson') {
      const env = parseEnv(input);
      const notes = env.problems.map((p) => fill(c.problems[p.kind], { line: String(p.line), text: p.text }));
      return { output: toJson(env), status: counted(env.values.size), bad: false, notes };
    }
    const parsed = parseJson(input);
    if (!parsed.ok) {
      const { kind, line, column, found } = parsed.error;
      const errors = jsonText[app.locale].errors;
      const status = kind === 'empty' ? errors.empty : fill(c.at, { line: String(line), column: String(column) }) + fill(errors[kind], { found });
      return { output: '', status, bad: kind !== 'empty', notes: [] };
    }
    const env = fromJson(toValue(parsed.node), rename);
    return env.ok ? { output: env.text, status: counted(env.count), bad: false, notes: [] } : { output: '', status: c.notObject, bad: true, notes: [] };
  });

  function setMode(next: 'toJson' | 'toEnv') {
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
      <label><input type="radio" name="env-mode" checked={mode === 'toJson'} onchange={() => setMode('toJson')} /> {c.toJson}</label>
      <label><input type="radio" name="env-mode" checked={mode === 'toEnv'} onchange={() => setMode('toEnv')} /> {c.toEnv}</label>
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="env-input">{mode === 'toJson' ? c.env : c.json}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = mode === 'toJson' ? SAMPLE : toJson(parseEnv(SAMPLE)))}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="env-input"
        class="t-input"
        class:t-bad={result.bad}
        rows="12"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="env-status"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={result.bad} id="env-status" role="status" aria-live="polite">{result.status}</p>
      {#if result.notes.length}
        <ul class="notes" data-testid="env-notes">
          {#each result.notes as note (note)}<li>{note}</li>{/each}
        </ul>
      {/if}
    </div>

    {#if mode === 'toEnv'}
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={rename} /> {c.rename}</label>
      </div>
    {/if}
  </div>

  <div class="t-col">
    <Output id="env-output" label={c.result} value={result.output} />
  </div>
</div>

<style>
  .notes {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.82rem;
    color: var(--syn-num);
  }
</style>
