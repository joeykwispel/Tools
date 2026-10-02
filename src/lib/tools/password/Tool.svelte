<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import { SETS, crackTime, passphrase, passphraseBits, password, passwordBits, strength, type SetName } from './logic';
  import text_ from './text';

  const SET_NAMES = Object.keys(SETS) as SetName[];
  const SEPARATORS = ['-', ' ', '.', '_'] as const;

  const c = $derived(text_[app.locale]);

  let kind = $state<'password' | 'passphrase'>('password');
  let length = $state(20);
  let on = $state<Record<SetName, boolean>>({ lower: true, upper: true, digits: true, symbols: true });
  let readable = $state(false);
  let words = $state(6);
  let separator = $state<(typeof SEPARATORS)[number]>('-');
  let capitalize = $state(false);
  let digit = $state(false);
  /** Made in the browser: a password in the prerendered page would be the same for everyone. */
  let made = $state('');

  const sets = $derived(SET_NAMES.filter((name) => on[name]));
  const passwordOptions = $derived({ length: Number(length), sets, readable });
  const passphraseOptions = $derived({ words: Number(words), separator, capitalize, digit });

  const make = () => (made = kind === 'password' ? password(passwordOptions) : passphrase(passphraseOptions));
  // a new one whenever a choice changes
  $effect(() => {
    make();
  });

  const bits = $derived(kind === 'password' ? passwordBits(passwordOptions) : passphraseBits(passphraseOptions));
  const label = $derived(strength(bits));
  const time = $derived.by(() => {
    const { unit, amount } = crackTime(bits);
    return fill(c.times[unit], { n: amount.toLocaleString(app.locale) });
  });
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.kind}</legend>
      <label><input type="radio" name="password-kind" value="password" bind:group={kind} /> {c.password}</label>
      <label><input type="radio" name="password-kind" value="passphrase" bind:group={kind} /> {c.passphrase}</label>
    </fieldset>

    {#if kind === 'password'}
      <div class="t-field">
        <label class="t-label" for="password-length">{c.length}: {length}</label>
        <input id="password-length" class="t-range" type="range" min="4" max="64" step="1" bind:value={length} />
      </div>
      <fieldset class="t-checks">
        <legend class="t-label">{c.sets}</legend>
        {#each SET_NAMES as name (name)}
          <label><input type="checkbox" bind:checked={on[name]} /> {c.setNames[name]}</label>
        {/each}
      </fieldset>
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={readable} /> {c.readable}</label>
      </div>
    {:else}
      <div class="t-field">
        <label class="t-label" for="password-words">{c.words}: {words}</label>
        <input id="password-words" class="t-range" type="range" min="3" max="12" step="1" bind:value={words} />
      </div>
      <fieldset class="t-checks">
        <legend class="t-label">{c.separator}</legend>
        {#each SEPARATORS as option (option)}
          <label><input type="radio" name="password-separator" value={option} bind:group={separator} /> {c.separators[option]}</label>
        {/each}
      </fieldset>
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={capitalize} /> {c.capitalize}</label>
        <label><input type="checkbox" bind:checked={digit} /> {c.digit}</label>
      </div>
    {/if}
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="password-result">
      <div class="t-row">
        <h2 class="t-label" id="password-result">{fill(c.result, { kind: c.kinds[kind] })}</h2>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={make}>{c.generate}</button>
          {#if made}<CopyButton text={made} />{/if}
        </div>
      </div>
      <pre class="t-box mono made" data-testid="password-output">{made}</pre>
      {#if kind === 'password' && !sets.length}
        <p class="t-status t-bad" role="status">{c.noSets}</p>
      {:else}
        <p class="t-status" class:t-bad={label === 'weak'} class:t-good={label === 'strong' || label === 'veryStrong'} role="status" aria-live="polite">
          {fill(c.strength, { label: c.labels[label], bits: String(Math.round(bits)) })}
          {fill(c.crack, { time })}
        </p>
      {/if}
      <p class="t-hint">{c.hint}</p>
    </section>
  </div>
</div>

<style>
  .made {
    font-size: 1.15rem;
    letter-spacing: 0.02em;
    padding-block: 0.9rem;
  }
</style>
