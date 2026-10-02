<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { fromBase32, fromHex, toBase32, toHex, toText, type Separator } from './logic';
  import text_ from './text';

  const SAMPLE = 'Hello, wörld!';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let format = $state<'hex' | 'base32'>('hex');
  let mode = $state<'encode' | 'decode'>('encode');
  let input = $state(SAMPLE);
  let separator = $state<Separator>(' ');
  let upper = $state(false);
  let padding = $state(true);

  const formatName = $derived(format === 'hex' ? c.hex : c.base32);
  const encodeBytes = (bytes: Uint8Array) => (format === 'hex' ? toHex(bytes, separator, upper) : toBase32(bytes, padding));
  const encodeText = (text: string) => encodeBytes(new TextEncoder().encode(text));

  const decoded = $derived(mode === 'decode' ? (format === 'hex' ? fromHex(input) : fromBase32(input)) : null);
  const decodedText = $derived(decoded?.ok ? toText(decoded.bytes) : null);
  const binary = $derived(decoded?.ok && decodedText === null ? decoded.bytes : null);
  const output = $derived.by(() => {
    if (mode === 'encode') return encodeText(input);
    if (binary) return toHex(binary, ' ');
    return decodedText ?? '';
  });
  const error = $derived.by(() => {
    if (!decoded || decoded.ok) return '';
    if (format === 'hex') return decoded.error === 'characters' ? c.badHexCharacters : c.badHexLength;
    return decoded.error === 'characters' ? c.badBase32Characters : c.badBase32Length;
  });
  const status = $derived.by(() => {
    if (error) return error;
    if (binary) return fill(c.binary, { count: String(binary.length) });
    const count = mode === 'encode' ? new TextEncoder().encode(input).length : decoded?.ok ? decoded.bytes.length : 0;
    return count ? fill(c.bytes, { count: String(count) }) : '';
  });

  function setMode(next: 'encode' | 'decode') {
    if (next === mode) return;
    // carry the result over, so a round trip is one click
    const carry = error || binary ? '' : output;
    mode = next;
    input = carry;
  }

  function setFormat(next: 'hex' | 'base32') {
    if (next === format) return;
    // text stays text; encoded input is rewritten in the other format when it can be read
    const bytes = decoded?.ok ? decoded.bytes : null;
    format = next;
    if (mode === 'decode') input = bytes ? encodeBytes(bytes) : '';
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.format}</legend>
      <label><input type="radio" name="hex-format" checked={format === 'hex'} onchange={() => setFormat('hex')} /> {c.hex}</label>
      <label><input type="radio" name="hex-format" checked={format === 'base32'} onchange={() => setFormat('base32')} /> {c.base32}</label>
    </fieldset>

    <fieldset class="t-checks">
      <legend class="t-label">{c.mode}</legend>
      <label
        ><input type="radio" name="hex-mode" checked={mode === 'encode'} onchange={() => setMode('encode')} />
        {fill(c.encode, { format: formatName })}</label
      >
      <label
        ><input type="radio" name="hex-mode" checked={mode === 'decode'} onchange={() => setMode('decode')} />
        {fill(c.decode, { format: formatName })}</label
      >
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="hex-input">{mode === 'encode' ? c.text : formatName}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = mode === 'encode' ? SAMPLE : encodeText(SAMPLE))}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="hex-input"
        class="t-input"
        class:t-bad={!!error}
        rows="6"
        spellcheck="false"
        autocapitalize="off"
        aria-describedby="hex-status"
        bind:value={input}></textarea>
    </div>

    {#if mode === 'encode' && format === 'hex'}
      <fieldset class="t-checks">
        <legend class="t-label">{c.separator}</legend>
        <label><input type="radio" name="hex-separator" value="" bind:group={separator} /> {c.none}</label>
        <label><input type="radio" name="hex-separator" value=" " bind:group={separator} /> {c.space}</label>
        <label><input type="radio" name="hex-separator" value=":" bind:group={separator} /> {c.colon}</label>
      </fieldset>
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={upper} /> {c.upper}</label>
      </div>
    {:else if mode === 'encode'}
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={padding} /> {c.padding}</label>
      </div>
    {/if}
  </div>

  <div class="t-col">
    <Output id="hex-output" label={c.result} value={output} />
    <p class="t-status" class:t-bad={!!error} id="hex-status" role="status" aria-live="polite">{status}</p>
  </div>
</div>
