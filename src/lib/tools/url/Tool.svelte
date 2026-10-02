<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { decode, encode, type Scope } from './logic';
  import text_ from './text';

  const SAMPLE = 'name=Zoë & Co/search?q=100% sure';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let mode = $state<'encode' | 'decode'>('encode');
  let input = $state(SAMPLE);
  let scope = $state<Scope>('component');
  let plus = $state(false);

  const decoded = $derived(mode === 'decode' ? decode(input, plus) : null);
  const output = $derived(decoded ? decoded.text : encode(input, scope, plus));
  const status = $derived(!decoded?.invalid ? '' : decoded.invalid === 1 ? c.invalidOne : fill(c.invalidMany, { count: String(decoded.invalid) }));

  function setMode(next: 'encode' | 'decode') {
    if (next === mode) return;
    // carry the result over, so encoding and decoding again is one click
    const carry = output;
    mode = next;
    input = carry;
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.mode}</legend>
      <label><input type="radio" name="url-mode" checked={mode === 'encode'} onchange={() => setMode('encode')} /> {c.encode}</label>
      <label><input type="radio" name="url-mode" checked={mode === 'decode'} onchange={() => setMode('decode')} /> {c.decode}</label>
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="url-input">{mode === 'encode' ? c.text : c.encoded}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = mode === 'encode' ? SAMPLE : encode(SAMPLE))}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="url-input" class="t-input" rows="7" spellcheck="false" autocapitalize="off" aria-describedby="url-status" bind:value={input}></textarea>
    </div>

    {#if mode === 'encode'}
      <fieldset class="t-checks">
        <legend class="t-label">{c.scope}</legend>
        <label><input type="radio" name="url-scope" value="component" bind:group={scope} /> {c.component}</label>
        <label><input type="radio" name="url-scope" value="url" bind:group={scope} /> {c.url}</label>
      </fieldset>
    {/if}

    <div class="t-checks">
      <label><input type="checkbox" bind:checked={plus} /> {mode === 'encode' ? c.plusEncode : c.plusDecode}</label>
    </div>
  </div>

  <div class="t-col">
    <Output id="url-output" label={c.result} value={output} />
    <p class="t-status" class:t-bad={!!status} id="url-status" role="status" aria-live="polite">{status}</p>
  </div>
</div>
