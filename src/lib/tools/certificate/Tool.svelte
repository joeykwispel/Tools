<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import { digest } from '../hash/logic';
  import { RSA } from './fixtures';
  import { fingerprint, formatName, parse, utc, validity, type Certificate } from './logic';
  import text_ from './text';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(RSA);
  /** Milliseconds since 1970 once the page runs in a browser; null on the server, where "now" has no meaning. */
  let now = $state<number | null>(null);
  /** SHA-256 and SHA-1 of each certificate, by the Base64 of its bytes. Made in the browser: WebCrypto works with promises. */
  let prints = $state<Record<string, { sha256: string; sha1: string }>>({});

  const results = $derived(parse(input));
  const key = (certificate: Certificate) => btoa(String.fromCharCode(...certificate.der.subarray(0, 48)));

  onMount(() => {
    now = Date.now();
  });

  $effect(() => {
    const found = results.flatMap((r) => (r.ok ? [r.certificate] : []));
    let stale = false;
    void Promise.all(
      found.map(
        async (certificate) =>
          [
            key(certificate),
            { sha256: fingerprint(await digest('SHA-256', certificate.der)), sha1: fingerprint(await digest('SHA-1', certificate.der)) }
          ] as const
      )
    ).then((all) => {
      if (!stale) prints = Object.fromEntries(all);
    });
    return () => {
      stale = true;
    };
  });

  function status(certificate: Certificate) {
    if (now === null) return null;
    const v = validity(certificate, now);
    const days = String(v.days);
    if (v.state === 'valid') return { text: v.days ? fill(c.valid, { days }) : c.validToday, tone: v.days < 30 ? '' : 't-good' };
    if (v.state === 'expired') return { text: v.days ? fill(c.expired, { days }) : c.expiredToday, tone: 't-bad' };
    return { text: fill(c.notYet, { days }), tone: 't-bad' };
  }

  const title = (certificate: Certificate) => certificate.subject.find((p) => p.type === 'CN')?.value ?? formatName(certificate.subject);
  const keyText = (certificate: Certificate) =>
    [certificate.publicKey.name, certificate.publicKey.curve, certificate.publicKey.bits ? fill(c.bits, { bits: String(certificate.publicKey.bits) }) : '']
      .filter(Boolean)
      .join(', ');
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="certificate-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = RSA)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="certificate-input"
        class="t-input"
        rows="18"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="certificate-hint"
        bind:value={input}></textarea>
      <p class="t-hint" id="certificate-hint">{c.hint}</p>
    </div>
  </div>

  <div class="t-col" aria-live="polite">
    {#if !results.length}<p class="t-status">{c.empty}</p>{/if}
    {#each results as result, i (i)}
      {#if result.ok}
        {@const certificate = result.certificate}
        {@const validityNow = status(certificate)}
        {@const print = prints[key(certificate)]}
        <section class="t-field card" aria-labelledby="certificate-{i}" data-testid="certificate">
          <h2 class="title" id="certificate-{i}">
            {#if results.length > 1}<span class="t-label">{fill(c.certificate, { n: String(i + 1) })}</span>{/if}
            {title(certificate)}
          </h2>
          {#if validityNow}<p class="t-status {validityNow.tone}" data-testid="certificate-validity">{validityNow.text}</p>{/if}
          <dl class="t-kv">
            <dt>{c.subject}</dt>
            <dd>{formatName(certificate.subject)}</dd>
            <dt>{c.issuer}</dt>
            <dd>
              {formatName(certificate.issuer)}{#if certificate.selfSigned}<span class="note">({c.selfSigned})</span>{/if}
            </dd>
            <dt>{c.validFrom}</dt>
            <dd>{utc(certificate.notBefore)}</dd>
            <dt>{c.validUntil}</dt>
            <dd>{utc(certificate.notAfter)}</dd>
            {#if certificate.altNames.length}
              <dt>{c.altNames}</dt>
              <dd>
                {#each certificate.altNames as alt, n (n)}<span class="chip">{alt.type}: {alt.value}</span>{/each}
              </dd>
            {/if}
            <dt>{c.publicKey}</dt>
            <dd>{keyText(certificate)}</dd>
            <dt>{c.signature}</dt>
            <dd>{certificate.signature.name}</dd>
            {#if certificate.isCA !== null}
              <dt>{c.ca}</dt>
              <dd>
                {certificate.isCA ? c.yes : c.no}{#if certificate.pathLength !== null}<span class="note"
                    >({fill(c.pathLength, { count: String(certificate.pathLength) })})</span
                  >{/if}
              </dd>
            {/if}
            {#if certificate.keyUsage.length}
              <dt>{c.keyUsage}</dt>
              <dd>{certificate.keyUsage.join(', ')}</dd>
            {/if}
            {#if certificate.extendedKeyUsage.length}
              <dt>{c.extendedKeyUsage}</dt>
              <dd>{certificate.extendedKeyUsage.join(', ')}</dd>
            {/if}
            <dt>{c.serial}</dt>
            <dd>{certificate.serial}</dd>
            <dt>{c.version}</dt>
            <dd>{certificate.version}</dd>
            {#if print}
              <dt>{c.sha256}</dt>
              <dd data-testid="certificate-sha256">{print.sha256}</dd>
              <dt>{c.sha1}</dt>
              <dd>{print.sha1}</dd>
            {/if}
          </dl>
          {#if certificate.signature.weak}<p class="t-status t-bad">{c.weak}</p>{/if}
          {#if certificate.signature.family !== 'unknown'}
            <p class="t-hint" data-testid="certificate-quantum">{certificate.signature.family === 'post-quantum' ? c.quantumSafe : c.notQuantumSafe}</p>
          {/if}
        </section>
      {:else}
        <p class="t-status t-bad" role="alert">{fill(c.errors[result.error], { label: result.label ?? '' })}</p>
      {/if}
    {/each}
  </div>
</div>

<style>
  .card {
    padding: 0.9rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .title {
    display: grid;
    gap: 0.15rem;
    font-family: var(--mono);
    font-size: 1.05rem;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  dl {
    font-size: 0.82rem;
  }
  .note {
    margin-left: 0.5em;
    font-family: var(--font);
    color: var(--muted);
  }
  .chip {
    display: inline-block;
    margin: 0 0.35rem 0.25rem 0;
    padding: 0 0.4rem;
    border: 1px solid var(--border);
    border-radius: 6px;
  }
</style>
