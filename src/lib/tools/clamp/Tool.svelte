<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { WIDTHS, ZOOM_LIMIT, fluid, pxToRem, remToPx, sizeAt, tidy, zoomSafe } from './logic';
  import text_ from './text';

  const c = $derived(text_[app.locale]);

  let minSize = $state<number | null>(16);
  let maxSize = $state<number | null>(24);
  let minViewport = $state<number | null>(320);
  let maxViewport = $state<number | null>(1280);
  let root = $state<number | null>(16);
  let unit = $state<'rem' | 'px'>('rem');
  let width = $state(800);
  let px = $state<number | null>(24);
  let rem = $state<number | null>(1.5);

  const settings = $derived({
    minSize: minSize ?? NaN,
    maxSize: maxSize ?? NaN,
    minViewport: minViewport ?? NaN,
    maxViewport: maxViewport ?? NaN,
    root: root ?? NaN,
    unit
  });
  const result = $derived(fluid(settings));
  const local = (value: number) => (app.locale === 'nl' ? tidy(value).replace('.', ',') : tidy(value));

  // the two fields of the converter follow each other, and the root size
  const base = $derived(root && root > 0 ? root : 16);
  function fromPx() {
    rem = px === null ? null : Number(tidy(pxToRem(px, base)));
  }
  function fromRem() {
    px = rem === null ? null : Number(tidy(remToPx(rem, base)));
  }
  // a new root size converts the px again; typing in either field is handled by its own oninput
  $effect(() => {
    void base;
    untrack(fromPx);
  });
</script>

{#snippet number(id: string, label: string, get: () => number | null, set: (value: number | null) => void, hint?: string)}
  <div class="t-field">
    <label class="t-label" for={id}>{label}</label>
    <input {id} class="t-input" type="number" step="any" bind:value={get, set} aria-describedby={hint ? `${id}-hint` : undefined} />
    {#if hint}<p class="t-hint" id="{id}-hint">{hint}</p>{/if}
  </div>
{/snippet}

<div class="t-tool">
  <div class="t-col">
    <fieldset class="group">
      <legend class="t-label">{c.fluid}</legend>
      <div class="pair">
        {@render number(
          'clamp-min-size',
          c.minSize,
          () => minSize,
          (value) => (minSize = value)
        )}
        {@render number(
          'clamp-max-size',
          c.maxSize,
          () => maxSize,
          (value) => (maxSize = value)
        )}
        {@render number(
          'clamp-min-viewport',
          c.minViewport,
          () => minViewport,
          (value) => (minViewport = value)
        )}
        {@render number(
          'clamp-max-viewport',
          c.maxViewport,
          () => maxViewport,
          (value) => (maxViewport = value)
        )}
      </div>
    </fieldset>
    {@render number(
      'clamp-root',
      c.root,
      () => root,
      (value) => (root = value),
      c.rootHint
    )}
    <fieldset class="t-checks">
      <legend class="t-label">{c.unit}</legend>
      <label><input type="radio" name="clamp-unit" value="rem" bind:group={unit} /> {c.units.rem}</label>
      <label><input type="radio" name="clamp-unit" value="px" bind:group={unit} /> {c.units.px}</label>
    </fieldset>
    <p class="t-hint">{c.remHint}</p>

    <fieldset class="group">
      <legend class="t-label">{c.converter}</legend>
      <div class="pair">
        <div class="t-field">
          <label class="t-label" for="clamp-px">{c.px}</label>
          <input id="clamp-px" class="t-input" type="number" step="any" bind:value={px} oninput={fromPx} />
        </div>
        <div class="t-field">
          <label class="t-label" for="clamp-rem">{c.rem}</label>
          <input id="clamp-rem" class="t-input" type="number" step="any" bind:value={rem} oninput={fromRem} />
        </div>
      </div>
      <p class="t-hint">{c.converterHint}</p>
    </fieldset>
  </div>

  <div class="t-col">
    <Output id="clamp-result" label={c.result} value={result.ok ? result.css : ''} />
    <p class="t-status" class:t-bad={!result.ok} role="status" aria-live="polite">
      {#if !result.ok}{c.errors[result.error]}{/if}
    </p>
    {#if result.ok}
      <Output id="clamp-declaration" label={c.declaration} value="font-size: {result.css};" />
      {#if !zoomSafe(settings)}<p class="t-hint t-bad" data-testid="clamp-zoom">{fill(c.zoom, { limit: local(ZOOM_LIMIT) })}</p>{/if}

      <section class="t-field" aria-labelledby="clamp-sizes">
        <h2 class="t-label" id="clamp-sizes">{c.sizes}</h2>
        <table class="t-table" data-testid="clamp-sizes">
          <thead>
            <tr><th scope="col">{c.width}</th><th scope="col">{c.size}</th></tr>
          </thead>
          <tbody>
            {#each WIDTHS as screen (screen)}
              <tr><td>{screen} px</td><td>{local(sizeAt(settings, screen))} px</td></tr>
            {/each}
          </tbody>
        </table>
      </section>

      <div class="t-field">
        <label class="t-label" for="clamp-try">{c.try}</label>
        <input id="clamp-try" class="t-range" type="range" min="280" max="2000" step="10" bind:value={width} aria-describedby="clamp-try-value" />
        <p class="t-hint" id="clamp-try-value" data-testid="clamp-try">{fill(c.tryValue, { width: String(width), size: local(sizeAt(settings, width)) })}</p>
        <p class="sample" style:font-size="{sizeAt(settings, width)}px">{c.sample}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .group {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  .pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    /* a label that wraps to two lines keeps its field level with the one next to it */
    align-items: end;
  }
  .sample {
    margin: 0;
    max-width: none;
    line-height: 1.2;
    color: var(--text);
    overflow-wrap: anywhere;
  }
</style>
