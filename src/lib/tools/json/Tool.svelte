<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { duplicateKeys, format, parse, sortKeys } from './logic';
  import Tree from './Tree.svelte';
  import text_ from './text';

  const SAMPLE =
    '{"name":"tools","version":"1.0.0","private":true,"scripts":{"dev":"vite dev","build":"vite build"},"keywords":["json","formatter"],"stars":12345678901234567890,"license":null}';
  const INDENTS = { two: '  ', four: '    ', tab: '\t', minify: null } as const;
  type Layout = keyof typeof INDENTS;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let layout = $state<Layout>('two');
  let sort = $state(false);

  const parsed = $derived(parse(input));
  const node = $derived(parsed.ok ? (sort ? sortKeys(parsed.node) : parsed.node) : null);
  const output = $derived(node ? format(node, INDENTS[layout]) : '');
  const status = $derived.by(() => {
    if (parsed.ok) {
      const twice = duplicateKeys(parsed.node);
      return twice.length ? fill(c.duplicates, { keys: twice.map((key) => `"${key}"`).join(', ') }) : c.valid;
    }
    const { kind, line, column, found } = parsed.error;
    if (kind === 'empty') return c.errors.empty;
    const message = fill(c.errors[kind], { found: found === '\n' ? '⏎' : found });
    return fill(c.at, { line: String(line), column: String(column) }) + message;
  });
  const failed = $derived(!parsed.ok && parsed.error.kind !== 'empty');
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="json-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="json-input"
        class="t-input"
        class:t-bad={failed}
        rows="12"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="json-status"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={failed} class:t-good={parsed.ok} id="json-status" role="status" aria-live="polite">{status}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.indent}</legend>
      <label><input type="radio" name="json-layout" value="two" bind:group={layout} /> {c.two}</label>
      <label><input type="radio" name="json-layout" value="four" bind:group={layout} /> {c.four}</label>
      <label><input type="radio" name="json-layout" value="tab" bind:group={layout} /> {c.tab}</label>
      <label><input type="radio" name="json-layout" value="minify" bind:group={layout} /> {c.minify}</label>
    </fieldset>
    <div class="t-checks">
      <label><input type="checkbox" bind:checked={sort} /> {c.sort}</label>
    </div>
  </div>

  <div class="t-col">
    {#if node}
      <Output id="json-output" label={c.result} value={output} />
      <section class="t-field" aria-labelledby="json-tree">
        <h2 class="t-label" id="json-tree">{c.tree}</h2>
        <div class="t-box mono tree" data-testid="json-tree"><Tree {node} /></div>
      </section>
    {/if}
  </div>
</div>

<style>
  .tree {
    white-space: normal;
    font-size: 0.85rem;
  }
</style>
