<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { checkBsn, checkIban, checkPostcode, makeBsn, makeIban, makePostcode, type Pick } from './logic';
  import text_ from './text';

  const KINDS = ['bsn', 'iban', 'postcode'] as const;
  type Kind = (typeof KINDS)[number];
  const MAKERS: Record<Kind, (pick: Pick) => string> = { bsn: makeBsn, iban: makeIban, postcode: makePostcode };
  const MAX = 100;

  /** A whole number below `below` from the browser's own randomness, without favouring the low ones. */
  const pick: Pick = (below) => {
    const limit = Math.floor(0x100000000 / below) * below;
    const one = new Uint32Array(1);
    do crypto.getRandomValues(one);
    while (one[0] >= limit);
    return one[0] % below;
  };

  const c = $derived(text_[app.locale]);

  let given = $state<Record<Kind, string>>({ bsn: '111222333', iban: 'NL91 ABNA 0417 1643 00', postcode: '1012 AB' });
  let count = $state(5);
  /** Made in the browser: what is random can not be the same on the page as it was built. */
  let made = $state<Record<Kind, string[]>>({ bsn: [], iban: [], postcode: [] });

  function make(kind: Kind) {
    const amount = Math.min(MAX, Math.max(1, Math.round(count) || 1));
    made[kind] = Array.from({ length: amount }, () => MAKERS[kind](pick));
  }

  $effect(() => {
    // again for every kind whenever the number asked for changes, and once at the start
    void count;
    for (const kind of KINDS) make(kind);
  });

  const verdicts = $derived({
    bsn: (() => {
      const verdict = checkBsn(given.bsn);
      return {
        ok: verdict.ok,
        empty: !verdict.ok && verdict.error === 'empty',
        text: verdict.ok ? fill(c.bsn.ok, { bsn: verdict.bsn }) : c.bsn.errors[verdict.error]
      };
    })(),
    iban: (() => {
      const verdict = checkIban(given.iban);
      if (verdict.ok) return { ok: true, empty: false, text: fill(verdict.bank ? c.iban.okBank : c.iban.ok, { iban: verdict.iban, bank: verdict.bank }) };
      const vars: Record<string, string> =
        verdict.error === 'length' ? { country: verdict.country, expected: String(verdict.expected), length: String(verdict.length) } : {};
      return { ok: false, empty: verdict.error === 'empty', text: fill(c.iban.errors[verdict.error], vars) };
    })(),
    postcode: (() => {
      const verdict = checkPostcode(given.postcode);
      return {
        ok: verdict.ok,
        empty: !verdict.ok && verdict.error === 'empty',
        text: verdict.ok ? fill(c.postcode.ok, { postcode: verdict.postcode }) : c.postcode.errors[verdict.error]
      };
    })()
  });
</script>

<div class="t-col">
  <div class="t-field count">
    <label class="t-label" for="dutch-count">{c.count}</label>
    <input id="dutch-count" class="t-input" type="number" min="1" max={MAX} step="1" bind:value={count} />
  </div>
  <p class="t-hint">{c.warning}</p>

  {#each KINDS as kind (kind)}
    {@const verdict = verdicts[kind]}
    <section class="kind" aria-labelledby="dutch-{kind}">
      <h2 class="t-label title" id="dutch-{kind}">{c[kind].title}</h2>
      <div class="t-tool">
        <div class="t-field">
          <label class="t-label" for="dutch-{kind}-input">{c[kind].input}</label>
          <input
            id="dutch-{kind}-input"
            class="t-input"
            class:t-bad={!verdict.ok && !verdict.empty}
            type="text"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="characters"
            aria-describedby="dutch-{kind}-verdict dutch-{kind}-hint"
            bind:value={given[kind]}
          />
          <p
            class="t-status"
            class:t-good={verdict.ok}
            class:t-bad={!verdict.ok}
            id="dutch-{kind}-verdict"
            data-testid="dutch-{kind}-verdict"
            aria-live="polite"
          >
            {verdict.text}
          </p>
          <p class="t-hint" id="dutch-{kind}-hint">{c[kind].hint}</p>
        </div>
        <div class="t-field">
          <Output id="dutch-{kind}-made" label={c.made} value={made[kind].join('\n')} />
          <div class="t-actions">
            <button type="button" class="t-small" onclick={() => make(kind)}>{c.again}</button>
          </div>
        </div>
      </div>
    </section>
  {/each}
</div>

<style>
  .count {
    max-width: 10rem;
  }
  .kind {
    display: grid;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .title {
    font-size: 0.95rem;
    color: var(--text);
  }
</style>
