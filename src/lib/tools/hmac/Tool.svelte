<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { ALGORITHMS, compare, hmac, keyBytes, toBase64, toHex, type Algorithm, type KeyFormat } from './logic';
  import text_ from './text';

  const FORMATS: KeyFormat[] = ['text', 'hex', 'base64'];

  const c = $derived(text_[app.locale]);

  let message = $state('{"event":"push","ref":"refs/heads/main"}');
  let key = $state('my webhook secret');
  let keyFormat = $state<KeyFormat>('text');
  let algorithm = $state<Algorithm>('SHA-256');
  let given = $state('');
  /** Made in the browser: WebCrypto works with promises, and the server does not render them. */
  let signature = $state<Uint8Array | null>(null);

  const bytes = $derived(keyBytes(key, keyFormat));

  $effect(() => {
    const k = bytes;
    const m = new TextEncoder().encode(message);
    const a = algorithm;
    if (!k) {
      signature = null;
      return;
    }
    let stale = false;
    void hmac(a, k, m).then((result) => {
      if (!stale) signature = result;
    });
    return () => {
      stale = true;
    };
  });

  const verdict = $derived(signature ? compare(given, signature) : { kind: 'none' as const });
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="hmac-message">{c.message}</label>
      <textarea id="hmac-message" class="t-input" rows="6" spellcheck="false" autocapitalize="off" bind:value={message}></textarea>
    </div>

    <div class="t-field">
      <label class="t-label" for="hmac-key">{c.key}</label>
      <input
        id="hmac-key"
        class="t-input"
        class:t-bad={!bytes}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="hmac-key-status"
        bind:value={key}
      />
      <p class="t-hint" class:t-bad={!bytes} id="hmac-key-status">{bytes ? c.hint : fill(c.badKey, { format: c.formats[keyFormat] })}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.keyFormat}</legend>
      {#each FORMATS as option (option)}
        <label><input type="radio" name="hmac-key-format" value={option} bind:group={keyFormat} /> {c.formats[option]}</label>
      {/each}
    </fieldset>

    <fieldset class="t-checks">
      <legend class="t-label">{c.algorithm}</legend>
      {#each ALGORITHMS as option (option)}
        <label><input type="radio" name="hmac-algorithm" value={option} bind:group={algorithm} /> HMAC-{option}</label>
      {/each}
    </fieldset>
  </div>

  <div class="t-col">
    {#if signature}
      <Output id="hmac-hex" label={`${c.result} (${c.hex})`} value={toHex(signature)} />
      <Output id="hmac-base64" label={`${c.result} (${c.base64})`} value={toBase64(signature)} />
    {/if}

    <div class="t-field">
      <label class="t-label" for="hmac-given">{c.given}</label>
      <input
        id="hmac-given"
        class="t-input"
        class:t-bad={verdict.kind === 'mismatch' || verdict.kind === 'wrongLength'}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="hmac-verdict hmac-given-hint"
        bind:value={given}
      />
      <p
        class="t-status"
        class:t-good={verdict.kind === 'match'}
        class:t-bad={verdict.kind === 'mismatch' || verdict.kind === 'wrongLength'}
        id="hmac-verdict"
        data-testid="hmac-verdict"
        aria-live="polite"
      >
        {#if verdict.kind === 'match'}{c.match}
        {:else if verdict.kind === 'mismatch'}{c.mismatch}
        {:else if verdict.kind === 'wrongLength'}{fill(c.wrongLength, {
            got: String(verdict.got),
            expected: String(verdict.expected),
            algorithm: `HMAC-${algorithm}`
          })}{/if}
      </p>
      <p class="t-hint" id="hmac-given-hint">{c.givenHint}</p>
    </div>
  </div>
</div>
