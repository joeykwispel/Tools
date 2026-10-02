<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import Output from '$lib/components/tool/Output.svelte';
  import { MARGIN, make, path } from '../qr/logic';
  import { ALGORITHMS, DEFAULTS, counterAt, newSecret, parseUri, remaining, secretBytes, toUri, totp, type Algorithm } from './logic';
  import text_ from './text';

  /** The secret every TOTP example uses: the bytes of "Hello!" and four more. */
  const SAMPLE = 'JBSWY3DPEHPK3PXP';
  const DIGITS = [6, 7, 8];
  const MAX_PERIOD = 3600;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let secret = $state(SAMPLE);
  let issuer = $state('Tools');
  let account = $state('test@example.com');
  let algorithm = $state<Algorithm>(DEFAULTS.algorithm);
  let digits = $state(DEFAULTS.digits);
  let period = $state<number | null>(DEFAULTS.period);
  /** What went wrong with a pasted link, or what was read from it. */
  let pasted = $state<{ error: keyof (typeof text_)['en']['errors'] } | { account: string } | null>(null);
  /** The time, once the page runs in a browser: the server that renders the page has another moment. */
  let now = $state<number | null>(null);
  let codes = $state<{ current: string; next: string } | null>(null);

  onMount(() => {
    now = Date.now();
    const timer = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(timer);
  });

  const key = $derived(secretBytes(secret));
  const periodOk = $derived(period !== null && Number.isInteger(period) && period >= 1 && period <= MAX_PERIOD);
  const settings = $derived(periodOk && period !== null ? { algorithm, digits, period } : null);
  const counter = $derived(now !== null && settings ? counterAt(now, settings.period) : null);
  const left = $derived(now !== null && settings ? remaining(now, settings.period) : null);

  $effect(() => {
    // read through the counter, so a new code is made once per period and not on every tick of the clock
    const [k, s, at] = [key, settings, counter];
    if (!k.ok || !s || at === null) {
      codes = null;
      return;
    }
    let stale = false;
    const time = at * s.period * 1000;
    void Promise.all([totp(k.bytes, time, s), totp(k.bytes, time, s, 1)]).then(([current, next]) => {
      if (!stale) codes = { current, next };
    });
    return () => {
      stale = true;
    };
  });

  const uri = $derived(key.ok && settings ? toUri({ secret, issuer: issuer.trim(), account: account.trim(), ...settings }) : '');
  const qr = $derived(uri ? make(uri, 'M') : null);

  const secretBad = $derived(!key.ok || (pasted !== null && 'error' in pasted));
  const error = $derived(pasted && 'error' in pasted ? c.errors[pasted.error] : !key.ok ? c.errors[key.error] : !periodOk ? c.errors.period : '');
  const status = $derived(error || (pasted && 'account' in pasted ? fill(c.read, { account: pasted.account || c.noName }) : ''));

  /** A whole otpauth:// link pasted into the secret field fills in every field. */
  function onSecret() {
    pasted = null;
    if (!/^\s*otpauth:/i.test(secret)) return;
    const parsed = parseUri(secret);
    if (!parsed.ok) {
      pasted = { error: parsed.error };
      return;
    }
    ({ secret, issuer, account, algorithm, digits, period } = parsed.account);
    pasted = { account: [parsed.account.issuer, parsed.account.account].filter(Boolean).join(': ') };
  }

  function fresh() {
    secret = newSecret();
    pasted = null;
  }

  function sample() {
    secret = SAMPLE;
    pasted = null;
  }

  /** In groups, the way an app shows a code: 123 456 or 1234 5678. */
  const grouped = (code: string) => `${code.slice(0, Math.ceil(code.length / 2))} ${code.slice(Math.ceil(code.length / 2))}`;
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="totp-secret">{c.secret}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={fresh}>{c.newSecret}</button>
          <button type="button" class="t-small" onclick={sample}>{common.sample}</button>
        </div>
      </div>
      <input
        id="totp-secret"
        class="t-input"
        class:t-bad={secretBad}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="totp-secret-hint totp-status"
        bind:value={secret}
        oninput={onSecret}
      />
      <p class="t-hint" id="totp-secret-hint">{c.secretHint}</p>
      <p class="t-status" class:t-bad={!!error} id="totp-status" role="status" aria-live="polite">{status}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.algorithm}</legend>
      {#each ALGORITHMS as option (option)}
        <label><input type="radio" name="totp-algorithm" value={option} bind:group={algorithm} /> {option}</label>
      {/each}
    </fieldset>

    <fieldset class="t-checks">
      <legend class="t-label">{c.digits}</legend>
      {#each DIGITS as option (option)}
        <label><input type="radio" name="totp-digits" value={option} bind:group={digits} /> {option}</label>
      {/each}
    </fieldset>

    <div class="t-field">
      <label class="t-label" for="totp-period">{c.period}</label>
      <input id="totp-period" class="t-input period" class:t-bad={!periodOk} type="number" min="1" max={MAX_PERIOD} step="1" bind:value={period} />
    </div>
    <p class="t-hint">{c.defaults}</p>

    <div class="t-field">
      <label class="t-label" for="totp-issuer">{c.issuer}</label>
      <input id="totp-issuer" class="t-input" type="text" spellcheck="false" autocomplete="off" bind:value={issuer} />
    </div>
    <div class="t-field">
      <label class="t-label" for="totp-account">{c.account}</label>
      <input id="totp-account" class="t-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" bind:value={account} />
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="totp-code-label">
      <div class="t-row">
        <h2 class="t-label" id="totp-code-label">{c.code}</h2>
        {#if codes}<CopyButton text={codes.current} />{/if}
      </div>
      <p class="code mono" data-testid="totp-code">{codes ? grouped(codes.current) : '··· ···'}</p>
      {#if codes && left !== null && settings}
        <div class="bar" aria-hidden="true"><span style:width="{(left / settings.period) * 100}%"></span></div>
        <p class="t-hint" data-testid="totp-left">{left === 1 ? c.left.one : fill(c.left.other, { seconds: String(left) })}</p>
      {:else if !error}
        <p class="t-hint">{c.waiting}</p>
      {/if}
    </section>

    <section class="t-field" aria-labelledby="totp-next-label">
      <div class="t-row">
        <h2 class="t-label" id="totp-next-label">{c.next}</h2>
        {#if codes}<CopyButton text={codes.next} />{/if}
      </div>
      <p class="t-box mono" data-testid="totp-next">{codes ? grouped(codes.next) : ''}</p>
    </section>

    <Output id="totp-uri" label={c.uri} value={uri} />

    {#if qr?.ok}
      {@const size = qr.matrix.length + MARGIN * 2}
      <section class="t-field" aria-labelledby="totp-qr-label">
        <h2 class="t-label" id="totp-qr-label">{c.qr}</h2>
        <!-- dark on white, whatever the theme: that is what a scanner reads -->
        <svg class="qr" viewBox="0 0 {size} {size}" shape-rendering="crispEdges" role="img" aria-label={c.qrAlt} data-testid="totp-qr">
          <rect width={size} height={size} fill="#fff" />
          <path d={path(qr.matrix)} fill="#000" />
        </svg>
      </section>
    {/if}

    <p class="t-hint">{c.hint}</p>
  </div>
</div>

<style>
  .code {
    margin: 0;
    max-width: none;
    font-size: clamp(2rem, 8vw, 3rem);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.04em;
    color: var(--accent-text);
    font-variant-numeric: tabular-nums;
  }
  .bar {
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.25s linear;
  }
  .period {
    max-width: 8rem;
  }
  .qr {
    width: min(100%, 220px);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  @media (prefers-reduced-motion: reduce) {
    .bar span {
      transition: none;
    }
  }
</style>
