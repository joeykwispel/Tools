<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { decode, encode, type Level } from './logic';
  import text_ from './text';

  const SAMPLE = '<a href="/menu?size=L&extra=crème">Café “Zoë” — €5</a>';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let mode = $state<'encode' | 'decode'>('encode');
  let input = $state(SAMPLE);
  let level = $state<Level>('special');

  const decoded = $derived(mode === 'decode' ? decode(input) : null);
  const output = $derived(decoded ? decoded.text : encode(input, level));
  const status = $derived(!decoded?.unknown ? '' : decoded.unknown === 1 ? c.unknownOne : fill(c.unknownMany, { count: String(decoded.unknown) }));

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
      <label><input type="radio" name="entities-mode" checked={mode === 'encode'} onchange={() => setMode('encode')} /> {c.encode}</label>
      <label><input type="radio" name="entities-mode" checked={mode === 'decode'} onchange={() => setMode('decode')} /> {c.decode}</label>
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="entities-input">{mode === 'encode' ? c.text : c.html}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = mode === 'encode' ? SAMPLE : encode(SAMPLE, 'named'))}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="entities-input" class="t-input" rows="7" spellcheck="false" autocapitalize="off" aria-describedby="entities-status" bind:value={input}
      ></textarea>
    </div>

    {#if mode === 'encode'}
      <fieldset class="t-checks">
        <legend class="t-label">{c.level}</legend>
        <label><input type="radio" name="entities-level" value="special" bind:group={level} /> {c.special}</label>
        <label><input type="radio" name="entities-level" value="named" bind:group={level} /> {c.named}</label>
        <label><input type="radio" name="entities-level" value="numeric" bind:group={level} /> {c.numeric}</label>
      </fieldset>
    {/if}
  </div>

  <div class="t-col">
    <Output id="entities-output" label={c.result} value={output} />
    <p class="t-status" class:t-bad={!!status} id="entities-status" role="status" aria-live="polite">{status}</p>
  </div>
</div>
