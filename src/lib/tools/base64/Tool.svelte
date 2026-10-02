<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { decode, encodeBytes, encodeText, size } from './logic';
  import text_ from './text';

  /** Larger files would make the page slow: the result is shown as text. */
  const MAX_FILE = 2_000_000;
  const SAMPLE = 'Hello, wörld! 👋';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let mode = $state<'encode' | 'decode'>('encode');
  let input = $state(SAMPLE);
  let urlSafe = $state(false);
  /** A file picked to encode; it replaces the text until the text is edited again. */
  let file = $state<{ name: string; bytes: Uint8Array } | null>(null);
  let fileError = $state('');

  const decoded = $derived(mode === 'decode' ? decode(input) : null);
  const output = $derived.by(() => {
    if (mode === 'encode') return file ? encodeBytes(file.bytes, urlSafe) : encodeText(input, urlSafe);
    return decoded?.ok ? (decoded.text ?? '') : '';
  });
  const error = $derived(decoded && !decoded.ok ? (decoded.error === 'characters' ? c.badCharacters : c.badLength) : '');
  const binary = $derived(decoded?.ok && decoded.text === null ? decoded.bytes : null);
  const status = $derived.by(() => {
    if (error) return error;
    if (binary) return fill(c.binary, { size: size(binary.length) });
    if (!input && !file) return '';
    const bytes = (s: string) => new TextEncoder().encode(s).length;
    return fill(c.sizes, { input: size(file ? file.bytes.length : bytes(input)), output: size(bytes(output)) });
  });

  function setMode(next: 'encode' | 'decode') {
    if (next === mode) return;
    // carry the result over, so encoding and decoding again is one click
    const carry = error || binary ? '' : output;
    mode = next;
    file = null;
    fileError = '';
    input = carry;
  }

  async function pick(e: Event) {
    const picked = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!picked) return;
    fileError = '';
    if (picked.size > MAX_FILE) {
      file = null;
      fileError = fill(c.fileTooLarge, { name: picked.name, size: size(picked.size), max: size(MAX_FILE) });
      return;
    }
    file = { name: picked.name, bytes: new Uint8Array(await picked.arrayBuffer()) };
    input = '';
  }

  function download() {
    if (!binary) return;
    const url = URL.createObjectURL(new Blob([binary.slice()]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decoded.bin';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.mode}</legend>
      <label><input type="radio" name="base64-mode" checked={mode === 'encode'} onchange={() => setMode('encode')} /> {c.encode}</label>
      <label><input type="radio" name="base64-mode" checked={mode === 'decode'} onchange={() => setMode('decode')} /> {c.decode}</label>
    </fieldset>

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="base64-input">{mode === 'encode' ? c.text : c.base64}</label>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            onclick={() => {
              file = null;
              input = mode === 'encode' ? SAMPLE : encodeText(SAMPLE);
            }}>{common.sample}</button
          >
          <button
            type="button"
            class="t-small"
            onclick={() => {
              file = null;
              input = '';
            }}>{common.clear}</button
          >
        </div>
      </div>
      <textarea
        id="base64-input"
        class="t-input"
        class:t-bad={!!error}
        rows="7"
        spellcheck="false"
        autocapitalize="off"
        aria-describedby="base64-status"
        bind:value={input}
        oninput={() => (file = null)}></textarea>
    </div>

    {#if mode === 'encode'}
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={urlSafe} /> {c.urlSafe}</label>
      </div>

      <div class="t-field">
        <label class="t-label" for="base64-file">{c.file}</label>
        <input id="base64-file" class="t-input" type="file" onchange={pick} aria-describedby="base64-file-hint" />
        <p class="t-hint" class:t-bad={!!fileError} id="base64-file-hint">
          {fileError || (file ? fill(c.fileLoaded, { name: file.name, size: size(file.bytes.length) }) : fill(c.fileHint, { max: size(MAX_FILE) }))}
        </p>
      </div>
    {/if}
  </div>

  <div class="t-col">
    <Output id="base64-output" label={c.result} value={output} />
    <p class="t-status" class:t-bad={!!error} id="base64-status" role="status" aria-live="polite">{status}</p>
    {#if binary}
      <div><button type="button" class="t-small" onclick={download}>{c.download}</button></div>
    {/if}
  </div>
</div>
