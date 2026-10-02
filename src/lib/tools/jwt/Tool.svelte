<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { TIME_CLAIMS, algorithm, duration, parse, signHs256, utc, validity, verify, type Verdict } from './logic';
  import text_ from './text';

  /** The example token of jwt.io: HS256, secret "your-256-bit-secret", no expiry. */
  const EXAMPLE =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const EXAMPLE_SECRET = 'your-256-bit-secret';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let token = $state(EXAMPLE);
  let key = $state(EXAMPLE_SECRET);
  /** Seconds since 1970, ticking once the page runs in a browser; null on the server, where "now" has no meaning. */
  let now = $state<number | null>(null);
  let verdict = $state<Verdict | null>(null);

  const parsed = $derived(parse(token));
  const jwt = $derived(parsed.ok ? parsed.jwt : null);
  const alg = $derived(jwt ? algorithm(jwt.header.alg) : null);
  const algName = $derived(typeof jwt?.header.alg === 'string' ? jwt.header.alg : '?');

  const error = $derived.by(() => {
    if (parsed.ok) return '';
    if (!token.trim()) return c.empty;
    if (parsed.error === 'parts') return c.badParts;
    return fill(parsed.error === 'base64' ? c.badBase64 : c.badJson, { part: c.parts[parsed.part ?? 'header'] });
  });

  /** The claims in a table: registered names explained, times shown as dates. */
  const claims = $derived(
    Object.entries(jwt?.payload ?? {}).map(([name, value]) => ({
      name,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      meaning: [c.claimNames[name], (TIME_CLAIMS as readonly string[]).includes(name) && typeof value === 'number' ? utc(value) : ''].filter(Boolean).join(': ')
    }))
  );

  const expiry = $derived.by(() => {
    if (!jwt || now === null) return null;
    const v = validity(jwt.payload, now);
    if (v.state === 'no-expiry') return { text: c.noExpiry, tone: '' };
    const time = duration(v.seconds);
    if (v.state === 'valid') return { text: fill(c.valid, { time }), tone: 't-good' };
    return { text: fill(v.state === 'expired' ? c.expired : c.notYet, { time }), tone: 't-bad' };
  });

  const algNote = $derived.by(() => {
    if (!alg) return null;
    if (alg.kind === 'none') return { text: c.algNone, bad: true };
    if (alg.kind === 'unknown') return { text: `${algName}: ${c.algUnknown}`, bad: false };
    return { text: fill(alg.quantumSafe ? c.algSafe : c.algNotSafe, { alg: algName }), bad: !alg.quantumSafe };
  });

  $effect(() => {
    const tick = () => (now = Date.now() / 1000);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  });

  // check the signature whenever the token or the key changes; a slower, older check must not overwrite a newer one
  $effect(() => {
    const current = jwt;
    const currentKey = key;
    if (!current) {
      verdict = null;
      return;
    }
    let stale = false;
    void verify(current, currentKey).then((result) => {
      if (!stale) verdict = result;
    });
    return () => {
      stale = true;
    };
  });

  /** A token made on the spot, so its expiry is an hour from now and the countdown has something to show. */
  async function sample() {
    const issued = Math.floor(Date.now() / 1000);
    key = 'secret';
    token = await signHs256(
      { iss: 'https://tools.joeyoosenbrug.nl', sub: 'ada', name: 'Ada Lovelace', admin: true, iat: issued, exp: issued + 3600 },
      'secret'
    );
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="jwt-token">{c.token}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={sample}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (token = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="jwt-token"
        class="t-input"
        class:t-bad={!!error && !!token.trim()}
        rows="7"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="jwt-status"
        bind:value={token}></textarea>
      <p class="t-status" class:t-bad={!!error && !!token.trim()} id="jwt-status" role="status" aria-live="polite">{error}</p>
    </div>

    {#if jwt}
      <section class="t-field" aria-labelledby="jwt-signature">
        <h2 class="t-label" id="jwt-signature">{c.signature}</h2>
        {#if alg?.kind !== 'none'}
          <label class="t-label" for="jwt-key">{alg?.kind === 'hmac' ? c.secret : c.publicKey}</label>
          <textarea
            id="jwt-key"
            class="t-input key"
            rows={alg?.kind === 'hmac' ? 1 : 5}
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            aria-describedby="jwt-key-hint"
            bind:value={key}></textarea>
          <p class="t-hint" id="jwt-key-hint">{c.keyHint}</p>
        {/if}
        <p
          class="t-status"
          class:t-good={verdict === 'valid'}
          class:t-bad={verdict === 'invalid' || verdict === 'bad-key'}
          data-testid="jwt-verdict"
          aria-live="polite"
        >
          {verdict ? c.verdicts[verdict] : ''}
        </p>
      </section>
    {/if}
  </div>

  {#if jwt}
    <div class="t-col">
      <section class="t-field" aria-labelledby="jwt-claims">
        <h2 class="t-label" id="jwt-claims">{c.claims}</h2>
        {#if expiry}<p class="t-status {expiry.tone}" data-testid="jwt-expiry">{expiry.text}</p>{/if}
        <table class="t-table">
          <thead>
            <tr><th scope="col">{c.claim}</th><th scope="col">{c.value}</th><th scope="col">{c.meaning}</th></tr>
          </thead>
          <tbody>
            {#each claims as claim (claim.name)}
              <tr><th scope="row">{claim.name}</th><td>{claim.value}</td><td class="meaning">{claim.meaning}</td></tr>
            {/each}
          </tbody>
        </table>
      </section>

      <section class="t-field" aria-labelledby="jwt-alg">
        <h2 class="t-label" id="jwt-alg">{c.algorithm}</h2>
        {#if algNote}<p class="t-status" class:t-bad={algNote.bad} data-testid="jwt-algorithm">{algNote.text}</p>{/if}
      </section>

      <Output id="jwt-header" label={c.header} value={JSON.stringify(jwt.header, null, 2)} />
      <Output id="jwt-payload" label={c.payload} value={JSON.stringify(jwt.payload, null, 2)} />
    </div>
  {/if}
</div>

<style>
  .key {
    min-height: 0;
  }
  .meaning {
    font-family: var(--font);
    color: var(--muted);
  }
</style>
