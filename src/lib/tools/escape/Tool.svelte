<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { escape, unescape, type Target } from './logic';
  import text_ from './text';

  const TARGETS: Target[] = ['json', 'js', 'regex', 'shell'];
  const SAMPLE = `She said "it's 5 o'clock"\nPath: C:\\temp\\café.txt (cost: $5.00)`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let target = $state<Target>('json');
  let mode = $state<'escape' | 'unescape'>('escape');
  let input = $state(SAMPLE);
  let quotes = $state(true);
  let ascii = $state(false);

  /** Quotes and "outside ASCII" only mean something for the two string formats. */
  const isString = $derived(target === 'json' || target === 'js');
  const read = $derived(mode === 'unescape' ? unescape(input, target) : null);
  const output = $derived(read ? (read.ok ? read.text : '') : escape(input, target, { quotes, ascii }));
  const error = $derived(read && !read.ok ? fill(read.error === 'quote' ? c.badQuote : c.badEscape, { at: String(read.at + 1) }) : '');

  function setMode(next: 'escape' | 'unescape') {
    if (next === mode) return;
    // carry the result over, so a round trip is one click
    const carry = error ? '' : output;
    mode = next;
    input = carry;
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.target}</legend>
      {#each TARGETS as option (option)}
        <label><input type="radio" name="escape-target" value={option} bind:group={target} /> {c.targets[option]}</label>
      {/each}
    </fieldset>

    <fieldset class="t-checks">
      <legend class="t-label">{c.mode}</legend>
      <label><input type="radio" name="escape-mode" checked={mode === 'escape'} onchange={() => setMode('escape')} /> {c.escape}</label>
      <label><input type="radio" name="escape-mode" checked={mode === 'unescape'} onchange={() => setMode('unescape')} /> {c.unescape}</label>
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="escape-input">{mode === 'escape' ? c.text : c.escaped}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = mode === 'escape' ? SAMPLE : escape(SAMPLE, target, { quotes: true }))}
            >{common.sample}</button
          >
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="escape-input"
        class="t-input"
        class:t-bad={!!error}
        rows="7"
        spellcheck="false"
        autocapitalize="off"
        aria-describedby="escape-status escape-hint"
        bind:value={input}></textarea>
      <p class="t-hint" id="escape-hint">{c.hints[target]}</p>
    </div>

    {#if mode === 'escape' && isString}
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={quotes} /> {c.quotes}</label>
        <label><input type="checkbox" bind:checked={ascii} /> {c.ascii}</label>
      </div>
    {/if}
  </div>

  <div class="t-col">
    <Output id="escape-output" label={c.result} value={output} />
    <p class="t-status" class:t-bad={!!error} id="escape-status" role="status" aria-live="polite">{error}</p>
  </div>
</div>
