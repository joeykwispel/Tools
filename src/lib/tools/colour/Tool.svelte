<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { parse, shades, toHex, toHslText, toName, toOklchText, toRgb } from './logic';
  import text_ from './text';

  const EXAMPLES = ['#ff8800', 'rebeccapurple', 'hsl(200 80% 40%)', 'oklch(70% 0.15 160)', 'rgb(0 0 0 / 50%)'];

  const c = $derived(text_[app.locale]);

  let input = $state('#ff8800');
  let commas = $state(false);

  const read = $derived(parse(input));
  const colour = $derived(read.ok ? read.colour : null);
  const status = $derived(read.ok ? c.read[read.notation] : c.errors[read.error]);
  const name = $derived(colour ? toName(colour) : null);
  const scale = $derived(colour ? shades(colour) : []);
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="colour-input">{c.input}</label>
      <div class="pick">
        <input
          id="colour-input"
          class="t-input"
          class:t-bad={!read.ok && read.error === 'invalid'}
          type="text"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          aria-describedby="colour-status colour-hint"
          bind:value={input}
        />
        <input
          class="picker"
          type="color"
          aria-label={c.picker}
          value={colour ? toHex({ ...colour, alpha: 1 }) : '#000000'}
          oninput={(e) => (input = e.currentTarget.value)}
        />
      </div>
      <p class="t-status" class:t-bad={!read.ok} id="colour-status" role="status" aria-live="polite">{status}</p>
      <p class="t-hint" id="colour-hint">{c.inputHint}</p>
      {#if read.ok && read.mapped}<p class="t-hint">{c.mapped}</p>{/if}
    </div>

    <div class="t-field">
      <h2 class="t-label" id="colour-examples">{c.examples}</h2>
      <div class="t-actions" role="group" aria-labelledby="colour-examples">
        {#each EXAMPLES as example (example)}
          <button type="button" class="t-small" aria-pressed={input === example} onclick={() => (input = example)}>{example}</button>
        {/each}
      </div>
    </div>

    <div class="t-checks">
      <label><input type="checkbox" bind:checked={commas} /> {c.commas}</label>
    </div>

    <section class="t-field" aria-labelledby="colour-preview">
      <h2 class="t-label" id="colour-preview">{c.preview}</h2>
      <!-- the checks show through a colour that is not solid -->
      <div class="swatch" data-testid="colour-swatch">
        {#if colour}<div class="fill" style:background-color={toRgb(colour)}></div>{/if}
      </div>
    </section>
  </div>

  <div class="t-col">
    <Output id="colour-hex" label="HEX" value={colour ? toHex(colour) : ''} />
    <Output id="colour-rgb" label="RGB" value={colour ? toRgb(colour, commas) : ''} />
    <Output id="colour-hsl" label="HSL" value={colour ? toHslText(colour, commas) : ''} />
    <Output id="colour-oklch" label="OKLCH" value={colour ? toOklchText(colour) : ''} />
    {#if name}<Output id="colour-name" label={c.name} value={name} />{/if}

    {#if scale.length}
      <section class="t-field" aria-labelledby="colour-shades">
        <h2 class="t-label" id="colour-shades">{c.shades}</h2>
        <div class="scale" data-testid="colour-shades">
          {#each scale as shade, i (i)}
            <button
              type="button"
              class="shade"
              style:background-color={shade}
              title={shade}
              aria-label={fill(c.use, { colour: shade })}
              onclick={() => (input = shade)}
            ></button>
          {/each}
        </div>
        <p class="t-hint">{c.shadesHint}</p>
      </section>
    {/if}
  </div>
</div>

<style>
  .pick {
    display: flex;
    gap: 0.5rem;
  }
  .picker {
    flex: none;
    width: 3rem;
    height: auto;
    padding: 0.2rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    cursor: pointer;
  }
  .swatch {
    height: 7rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background-color: #fff;
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      8px 8px;
  }
  .fill {
    height: 100%;
  }
  .scale {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .shade {
    height: 2.5rem;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .shade:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -4px;
  }
</style>
