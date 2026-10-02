<script lang="ts">
  import { app } from '$lib/app.svelte';
  import Output from '$lib/components/tool/Output.svelte';
  import { lorem, slugify, type Unit } from './logic';
  import text_ from './text';

  const UNITS: Unit[] = ['words', 'sentences', 'paragraphs'];

  const c = $derived(text_[app.locale]);

  let title = $state('10 Tips & Tricks: Crème brûlée à la carte!');
  let separator = $state<'-' | '_'>('-');
  let lowercase = $state(true);
  let maxLength = $state(0);

  let amount = $state(3);
  let unit = $state<Unit>('paragraphs');
  let classic = $state(true);
  /** Starts at 1, so the page is the same on the server and in the browser; "Another one" moves it on. */
  let seed = $state(1);
</script>

<div class="t-tool">
  <section class="t-col" aria-labelledby="slug-heading">
    <h2 class="heading mono" id="slug-heading"><span class="com" aria-hidden="true">//</span> {c.slug}</h2>
    <div class="t-field">
      <label class="t-label" for="slug-title">{c.title}</label>
      <textarea id="slug-title" class="t-input title" rows="3" bind:value={title}></textarea>
    </div>
    <fieldset class="t-checks">
      <legend class="t-label">{c.separator}</legend>
      <label><input type="radio" name="slug-separator" value="-" bind:group={separator} /> {c.dash}</label>
      <label><input type="radio" name="slug-separator" value="_" bind:group={separator} /> {c.underscore}</label>
    </fieldset>
    <div class="t-checks">
      <label><input type="checkbox" bind:checked={lowercase} /> {c.lowercase}</label>
    </div>
    <div class="t-field narrow">
      <label class="t-label" for="slug-max">{c.maxLength}</label>
      <input id="slug-max" class="t-input" type="number" min="0" max="500" step="1" bind:value={maxLength} />
    </div>
    <Output id="slug-output" label={c.slugResult} value={slugify(title, { separator, lowercase, maxLength: Number(maxLength) || 0 })} />
  </section>

  <section class="t-col" aria-labelledby="lorem-heading">
    <h2 class="heading mono" id="lorem-heading"><span class="com" aria-hidden="true">//</span> {c.lorem}</h2>
    <div class="t-field narrow">
      <label class="t-label" for="lorem-amount">{c.amount}</label>
      <input id="lorem-amount" class="t-input" type="number" min="1" max="5000" step="1" bind:value={amount} />
    </div>
    <fieldset class="t-checks">
      <legend class="t-label">{c.unit}</legend>
      {#each UNITS as option (option)}
        <label><input type="radio" name="lorem-unit" value={option} bind:group={unit} /> {c[option]}</label>
      {/each}
    </fieldset>
    <div class="t-checks">
      <label><input type="checkbox" bind:checked={classic} /> {c.classic}</label>
    </div>
    <div><button type="button" class="t-small" onclick={() => seed++}>{c.another}</button></div>
    <Output id="lorem-output" label={c.loremResult} value={lorem(Number(amount) || 0, unit, { classic, seed })} />
  </section>
</div>

<style>
  .heading {
    font-size: 0.95rem;
    letter-spacing: 0;
  }
  .heading .com {
    font-style: normal;
  }
  .title {
    min-height: 0;
    font-family: var(--font);
  }
  .narrow {
    max-width: 16rem;
  }
  /* filler text is prose */
  section:last-child :global(.t-box) {
    font-family: var(--font);
  }
</style>
