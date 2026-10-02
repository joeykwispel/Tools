<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { size } from '../hash/logic';
  import { ALGORITHMS, check, hashAll, integrity, tag, type Algorithm, type Hashes, type Kind } from './logic';
  import text_ from './text';

  /** A file is read into memory in one go; scripts and stylesheets are far below this. */
  const MAX_FILE = 100_000_000;
  const KINDS: Kind[] = ['script', 'module', 'style'];
  /** What nearly every example and CDN uses. */
  const USUAL: Algorithm = 'sha384';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let text = $state("alert('Hello, world.');");
  /** A file picked to hash; it replaces the text until the text is edited again. */
  let file = $state<{ name: string; bytes: Uint8Array } | null>(null);
  let fileError = $state('');
  let url = $state('https://cdn.example.com/hello.js');
  let kind = $state<Kind>('script');
  let algorithm = $state<Algorithm>(USUAL);
  let given = $state('');
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

  const value = $derived(hashes ? integrity(hashes, algorithm) : '');
  const status = $derived(
    !hashes ? '' : file ? fill(c.hashedFile, { name: file.name, size: size(hashedSize) }) : fill(c.hashedText, { size: size(hashedSize) })
  );
  const verdict = $derived(hashes ? check(given, hashes) : { kind: 'none' as const });

  async function pick(e: Event) {
    const picked = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!picked) return;
    if (picked.size > MAX_FILE) {
      file = null;
      fileError = fill(c.fileTooLarge, { name: picked.name, size: size(picked.size), max: size(MAX_FILE) });
      return;
    }
    fileError = '';
    file = { name: picked.name, bytes: new Uint8Array(await picked.arrayBuffer()) };
    if (/\.css$/i.test(picked.name)) kind = 'style';
    else if (/\.mjs$/i.test(picked.name)) kind = 'module';
    else if (/\.js$/i.test(picked.name) && kind === 'style') kind = 'script';
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="sri-text">{c.content}</label>
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
      <textarea id="sri-text" class="t-input" rows="6" spellcheck="false" autocapitalize="off" bind:value={text} oninput={() => (file = null)}></textarea>
    </div>

    <div class="t-field">
      <label class="t-label" for="sri-file">{c.file}</label>
      <input id="sri-file" class="t-input" type="file" accept=".js,.mjs,.css,text/javascript,text/css" onchange={pick} aria-describedby="sri-file-hint" />
      <p class="t-hint" class:t-bad={!!fileError} id="sri-file-hint">{fileError || fill(c.fileHint, { max: size(MAX_FILE) })}</p>
    </div>

    <div class="t-field">
      <label class="t-label" for="sri-url">{c.url}</label>
      <input
        id="sri-url"
        class="t-input"
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="sri-url-hint"
        bind:value={url}
      />
      <p class="t-hint" id="sri-url-hint">{c.urlHint}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.kind}</legend>
      {#each KINDS as option (option)}
        <label><input type="radio" name="sri-kind" value={option} bind:group={kind} /> {c.kinds[option]}</label>
      {/each}
    </fieldset>

    <fieldset class="t-checks">
      <legend class="t-label">{c.algorithm}</legend>
      {#each ALGORITHMS as option (option)}
        <label>
          <input type="radio" name="sri-algorithm" value={option} bind:group={algorithm} />
          {option === USUAL ? fill(c.recommended, { algorithm: option }) : option}
        </label>
      {/each}
    </fieldset>
  </div>

  <div class="t-col">
    <Output id="sri-integrity" label={c.integrity} {value} />
    <p class="t-status" role="status" aria-live="polite">{status}</p>
    <Output id="sri-tag" label={c.tag} value={value ? tag(kind, url.trim(), value) : ''} />
    <p class="t-hint">{c.note}</p>

    <div class="t-field">
      <label class="t-label" for="sri-given">{c.verify}</label>
      <textarea
        id="sri-given"
        class="t-input given"
        class:t-bad={verdict.kind === 'mismatch'}
        rows="2"
        spellcheck="false"
        autocapitalize="off"
        aria-describedby="sri-verdict sri-given-hint"
        bind:value={given}></textarea>
      <p
        class="t-status"
        class:t-good={verdict.kind === 'match'}
        class:t-bad={verdict.kind === 'mismatch' || verdict.kind === 'unchecked'}
        id="sri-verdict"
        data-testid="sri-verdict"
        aria-live="polite"
      >
        {#if verdict.kind === 'match'}{fill(c.match, { algorithm: verdict.algorithm })}
        {:else if verdict.kind === 'mismatch'}{fill(verdict.malformed ? c.malformed : c.mismatch, { algorithm: verdict.algorithm })}
        {:else if verdict.kind === 'unchecked'}{c.unchecked}{/if}
      </p>
      <p class="t-hint" id="sri-given-hint">{c.verifyHint}</p>
    </div>
  </div>
</div>

<style>
  textarea.given {
    min-height: 3.6rem;
  }
</style>
