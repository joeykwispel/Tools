<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { parse, toHex } from '../colour/logic';
  import { SHADOWS, gradient, shadow, type Kind, type Shadow, type Stop } from './logic';
  import text_ from './text';

  const KINDS: Kind[] = ['linear', 'radial', 'conic'];
  const MAX_STOPS = 8;
  const MAX_LAYERS = 4;
  const PRESETS = Object.keys(SHADOWS) as (keyof typeof SHADOWS)[];

  const c = $derived(text_[app.locale]);

  let make = $state<'gradient' | 'shadow'>('gradient');
  let kind = $state<Kind>('linear');
  let angle = $state(135);
  let shape = $state<'circle' | 'ellipse'>('circle');
  let oklch = $state(false);
  let repeating = $state(false);
  let stops = $state<Stop[]>([
    { colour: '#7dd3c0', position: 0 },
    { colour: '#b49cff', position: 100 }
  ]);
  let layers = $state<Shadow[]>(SHADOWS.lifted.map((layer) => ({ ...layer })));

  const gradientCss = $derived(gradient({ kind, angle, shape, stops, oklch, repeating }));
  const shadowCss = $derived(shadow(layers));
  const result = $derived(make === 'gradient' ? gradientCss : shadowCss);
  const declaration = $derived(result.ok ? `${make === 'gradient' ? 'background' : 'box-shadow'}: ${result.css};` : '');
  const error = $derived(
    result.ok ? '' : result.error === 'colour' ? fill(make === 'gradient' ? c.invalid : c.invalidLayer, { n: String(result.index + 1) }) : ''
  );

  /** The picker shows the colour without its alpha: it has none. */
  const pickerValue = (text: string) => {
    const read = parse(text);
    return read.ok ? toHex({ ...read.colour, alpha: 1 }) : '#000000';
  };

  function addStop() {
    const last = stops[stops.length - 1];
    stops.push({ colour: last.colour, position: 100 });
    // spread them evenly again, which is what a new colour usually wants
    stops.forEach((stop, i) => (stop.position = Math.round((i / (stops.length - 1)) * 100)));
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.make}</legend>
      <label><input type="radio" name="gradient-make" value="gradient" bind:group={make} /> {c.makes.gradient}</label>
      <label><input type="radio" name="gradient-make" value="shadow" bind:group={make} /> {c.makes.shadow}</label>
    </fieldset>

    {#if make === 'gradient'}
      <fieldset class="t-checks">
        <legend class="t-label">{c.kind}</legend>
        {#each KINDS as option (option)}
          <label><input type="radio" name="gradient-kind" value={option} bind:group={kind} /> {c.kinds[option]}</label>
        {/each}
      </fieldset>
      {#if kind === 'radial'}
        <fieldset class="t-checks">
          <legend class="t-label">{c.shape}</legend>
          <label><input type="radio" name="gradient-shape" value="circle" bind:group={shape} /> {c.shapes.circle}</label>
          <label><input type="radio" name="gradient-shape" value="ellipse" bind:group={shape} /> {c.shapes.ellipse}</label>
        </fieldset>
      {:else}
        <div class="t-field">
          <div class="t-row">
            <label class="t-label" for="gradient-angle">{c.angle}</label>
            <span class="t-hint mono">{fill(c.angleValue, { angle: String(angle) })}</span>
          </div>
          <input id="gradient-angle" class="t-range" type="range" min="0" max="360" step="1" bind:value={angle} />
        </div>
      {/if}
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={oklch} aria-describedby="gradient-oklch-hint" /> {c.oklch}</label>
        <label><input type="checkbox" bind:checked={repeating} /> {c.repeating}</label>
      </div>
      <p class="t-hint" id="gradient-oklch-hint">{c.oklchHint}</p>

      <section class="t-field" aria-labelledby="gradient-stops">
        <h2 class="t-label" id="gradient-stops">{c.stops}</h2>
        <ul class="rows">
          {#each stops as stop, i (i)}
            {@const n = String(i + 1)}
            <li class="stop">
              <input
                class="picker"
                type="color"
                aria-label={fill(c.pickStop, { n })}
                value={pickerValue(stop.colour)}
                oninput={(e) => (stop.colour = e.currentTarget.value)}
              />
              <input
                class="t-input"
                class:t-bad={!parse(stop.colour).ok}
                type="text"
                spellcheck="false"
                aria-label={fill(c.stop, { n })}
                bind:value={stop.colour}
              />
              <input class="t-input position" type="number" min="0" max="100" step="1" aria-label={fill(c.position, { n })} bind:value={stop.position} />
              {#if stops.length > 2}
                <button type="button" class="t-small" aria-label={fill(c.removeStop, { n })} onclick={() => stops.splice(i, 1)}>{c.remove}</button>
              {/if}
            </li>
          {/each}
        </ul>
        {#if stops.length < MAX_STOPS}
          <div class="t-actions"><button type="button" class="t-small" onclick={addStop}>{c.addStop}</button></div>
        {/if}
      </section>
    {:else}
      <div class="t-field">
        <h2 class="t-label" id="gradient-presets">{c.presets}</h2>
        <div class="t-actions" role="group" aria-labelledby="gradient-presets">
          {#each PRESETS as name (name)}
            <button type="button" class="t-small" onclick={() => (layers = SHADOWS[name].map((layer) => ({ ...layer })))}>{c.preset[name]}</button>
          {/each}
        </div>
      </div>

      {#each layers as layer, i (i)}
        {@const n = String(i + 1)}
        <fieldset class="layer">
          <legend class="t-label">{fill(c.layer, { n })}</legend>
          <div class="numbers">
            {#each [['x', c.x], ['y', c.y], ['blur', c.blur], ['spread', c.spread]] as const as [key, label] (key)}
              <div class="t-field">
                <label class="t-label" for="shadow-{i}-{key}">{label}</label>
                <input id="shadow-{i}-{key}" class="t-input" type="number" step="1" bind:value={layer[key]} />
              </div>
            {/each}
          </div>
          <div class="t-field">
            <label class="t-label" for="shadow-{i}-colour">{c.colour}</label>
            <div class="pick">
              <input id="shadow-{i}-colour" class="t-input" class:t-bad={!parse(layer.colour).ok} type="text" spellcheck="false" bind:value={layer.colour} />
              <input
                class="picker"
                type="color"
                aria-label={c.pickColour}
                value={pickerValue(layer.colour)}
                oninput={(e) => (layer.colour = e.currentTarget.value)}
              />
            </div>
          </div>
          <div class="t-row">
            <label class="inset"><input type="checkbox" bind:checked={layer.inset} /> {c.inset}</label>
            {#if layers.length > 1}
              <button type="button" class="t-small" aria-label={fill(c.removeLayer, { n })} onclick={() => layers.splice(i, 1)}>{c.remove}</button>
            {/if}
          </div>
        </fieldset>
      {/each}
      {#if layers.length < MAX_LAYERS}
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => layers.push({ x: 0, y: 4, blur: 12, spread: 0, colour: 'rgb(15 23 42 / 0.2)', inset: false })}
            >{c.addLayer}</button
          >
        </div>
      {/if}
    {/if}
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="gradient-preview">
      <h2 class="t-label" id="gradient-preview">{c.preview}</h2>
      {#if make === 'gradient'}
        <div class="surface" data-testid="gradient-surface" style:background={gradientCss.ok ? gradientCss.css : 'none'}></div>
      {:else}
        <div class="stage">
          <div class="card" data-testid="shadow-card" style:box-shadow={shadowCss.ok ? shadowCss.css : 'none'}>{c.card}</div>
        </div>
      {/if}
    </section>
    <Output id="gradient-css" label={c.css} value={declaration} />
    <p class="t-status" class:t-bad={!!error} role="status" aria-live="polite">{error}</p>
  </div>
</div>

<style>
  .rows {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stop {
    display: grid;
    grid-template-columns: 2.6rem minmax(0, 1fr) 5rem auto;
    gap: 0.5rem;
    align-items: center;
  }
  .picker {
    width: 2.6rem;
    height: 2.6rem;
    padding: 0.2rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    cursor: pointer;
  }
  .pick {
    display: flex;
    gap: 0.5rem;
  }
  .pick .picker {
    flex: none;
    height: auto;
  }
  .layer {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    min-width: 0;
  }
  .numbers {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem 0.75rem;
  }
  .inset {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
  }
  .surface {
    height: 16rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  /* the shadow is shown on a light surface in both themes: that is where shadows are seen */
  .stage {
    display: grid;
    place-items: center;
    height: 16rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: #f1f5f9;
  }
  .card {
    display: grid;
    place-items: center;
    width: 60%;
    height: 50%;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    font-weight: 600;
  }
  @media (max-width: 30rem) {
    .stop {
      grid-template-columns: 2.6rem minmax(0, 1fr) 4.5rem;
    }
    .stop .t-small {
      grid-column: 2 / -1;
      justify-self: end;
    }
  }
</style>
