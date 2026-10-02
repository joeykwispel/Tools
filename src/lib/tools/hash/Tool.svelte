<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import { ALGORITHMS, BROKEN, compare, hashAll, size, toBase64, toHex, type Hashes } from './logic';
  import text_ from './text';

  /** A file is read into memory in one go; beyond this the tab would run out of it. */
  const MAX_FILE = 500_000_000;
  type Format = 'hex' | 'hexUpper' | 'base64';
  const FORMATS: Format[] = ['hex', 'hexUpper', 'base64'];

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let text = $state('The quick brown fox jumps over the lazy dog');
  /** A file picked to hash; it replaces the text until the text is edited again. */
  let file = $state<{ name: string; bytes: Uint8Array } | null>(null);
  let fileNote = $state('');
  let fileError = $state(false);
  let format = $state<Format>('hex');
  let expected = $state('');
  /** Computed in the browser: WebCrypto works with promises, and the server does not render them. */
  let hashes = $state<Hashes | null>(null);
  let hashedSize = $state(0);

  $effect(() => {
    const bytes = file ? file.bytes : new TextEncoder().encode(text);
    let stale = false;
    void hashAll(bytes).then((result) => {
      if (stale) return;
      hashes = result;
      hashedSize = bytes.length;
    });
    return () => {
      stale = true;
    };
  });

  const write = (bytes: Uint8Array) => (format === 'base64' ? toBase64(bytes) : toHex(bytes, format === 'hexUpper'));
  const verdict = $derived(hashes ? compare(expected, hashes) : { kind: 'none' as const });
  const status = $derived.by(() => {
    if (!hashes) return '';
    return file ? fill(c.hashed, { name: file.name, size: size(hashedSize) }) : fill(c.hashedText, { size: size(hashedSize) });
  });

  async function pick(e: Event) {
    const picked = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!picked) return;
    if (picked.size > MAX_FILE) {
      file = null;
      fileError = true;
      fileNote = fill(c.fileTooLarge, { name: picked.name, size: size(picked.size), max: size(MAX_FILE) });
      return;
    }
    fileError = false;
    fileNote = fill(c.hashing, { name: picked.name });
    file = { name: picked.name, bytes: new Uint8Array(await picked.arrayBuffer()) };
    fileNote = '';
  }
</script>

<div class="t-col">
  <div class="t-tool">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="hash-text">{c.text}</label>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            onclick={() => {
              file = null;
              text = '';
            }}>{common.clear}</button
          >
        </div>
      </div>
      <textarea id="hash-text" class="t-input" rows="5" spellcheck="false" autocapitalize="off" bind:value={text} oninput={() => (file = null)}></textarea>
    </div>

    <div class="t-col">
      <div class="t-field">
        <label class="t-label" for="hash-file">{c.file}</label>
        <input id="hash-file" class="t-input" type="file" onchange={pick} aria-describedby="hash-file-hint" />
        <p class="t-hint" class:t-bad={fileError} id="hash-file-hint">{fileNote || fill(c.fileHint, { max: size(MAX_FILE) })}</p>
      </div>
      <fieldset class="t-checks">
        <legend class="t-label">{c.format}</legend>
        {#each FORMATS as option (option)}
          <label><input type="radio" name="hash-format" value={option} bind:group={format} /> {c[option]}</label>
        {/each}
      </fieldset>
    </div>
  </div>

  <section class="t-field" aria-labelledby="hash-results">
    <h2 class="t-label" id="hash-results">{c.results}</h2>
    <p class="t-status" role="status" aria-live="polite">{status}</p>
    {#if hashes}
      <table class="t-table">
        <thead>
          <tr><th scope="col">{c.algorithm}</th><th scope="col">{c.checksum}</th><th scope="col"><span class="sr-only">{common.copy}</span></th></tr>
        </thead>
        <tbody>
          {#each ALGORITHMS as algorithm (algorithm)}
            {@const written = write(hashes[algorithm])}
            <tr class:hit={verdict.kind === 'match' && verdict.algorithm === algorithm}>
              <th scope="row">
                {algorithm}
                {#if BROKEN.includes(algorithm)}<span class="note">{c.broken}</span>{/if}
              </th>
              <td data-testid="hash-{algorithm}">{written}</td>
              <td class="action"><CopyButton text={written} label={fill(c.copy, { algorithm })} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <div class="t-field">
    <label class="t-label" for="hash-expected">{c.expected}</label>
    <input
      id="hash-expected"
      class="t-input"
      class:t-bad={verdict.kind === 'mismatch'}
      type="text"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      aria-describedby="hash-verdict hash-expected-hint"
      bind:value={expected}
    />
    <p
      class="t-status"
      class:t-good={verdict.kind === 'match'}
      class:t-bad={verdict.kind === 'mismatch' || verdict.kind === 'unknown'}
      id="hash-verdict"
      data-testid="hash-verdict"
      aria-live="polite"
    >
      {#if verdict.kind === 'match'}{fill(c.match, { algorithm: verdict.algorithm })}
      {:else if verdict.kind === 'mismatch'}{fill(c.mismatch, { algorithm: verdict.algorithm })}
      {:else if verdict.kind === 'unknown'}{c.unknown}{/if}
    </p>
    <p class="t-hint" id="hash-expected-hint">{c.expectedHint}</p>
  </div>
</div>

<style>
  th[scope='row'] {
    white-space: nowrap;
    vertical-align: top;
  }
  .note {
    display: block;
    max-width: 14rem;
    font-family: var(--font);
    font-size: 0.72rem;
    font-weight: 400;
    white-space: normal;
  }
  .action {
    width: 1%;
    white-space: nowrap;
  }
  tr.hit {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
</style>
