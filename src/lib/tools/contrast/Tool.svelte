<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import { parse, toHex, toRgb } from '../colour/logic';
  import { CHECKS, nearest, ratio, written } from './logic';
  import text_ from './text';

  const TARGETS = { aa: 4.5, large: 3, aaa: 7 } as const;
  type Target = keyof typeof TARGETS;

  const c = $derived(text_[app.locale]);

  /** A pair that passes AA and not AAA: the page itself has to pass the checks it explains. */
  let fg = $state('#2563eb');
  let bg = $state('#ffffff');
  let target = $state<Target>('aa');

  const fgRead = $derived(parse(fg));
  const bgRead = $derived(parse(bg));
  const fgColour = $derived(fgRead.ok ? fgRead.colour : null);
  const bgColour = $derived(bgRead.ok ? bgRead.colour : null);
  const value = $derived(fgColour && bgColour ? ratio(fgColour, bgColour) : null);
  const suggestions = $derived(
    fgColour && bgColour && value !== null && value < TARGETS[target]
      ? { text: nearest(fgColour, bgColour, TARGETS[target]), background: nearest(bgColour, fgColour, TARGETS[target], false) }
      : null
  );
  /** Ratios are written the way the language writes a decimal. */
  const local = (text: string) => (app.locale === 'nl' ? text.replace('.', ',') : text);

  function swap() {
    [fg, bg] = [bg, fg];
  }
</script>

{#snippet colourField(id: string, label: string, pickLabel: string, read: ReturnType<typeof parse>, get: () => string, set: (value: string) => void)}
  <div class="t-field">
    <label class="t-label" for={id}>{label}</label>
    <div class="pick">
      <input
        {id}
        class="t-input"
        class:t-bad={!read.ok}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="{id}-status"
        bind:value={get, set}
      />
      <input
        class="picker"
        type="color"
        aria-label={pickLabel}
        value={read.ok ? toHex({ ...read.colour, alpha: 1 }) : '#000000'}
        oninput={(e) => set(e.currentTarget.value)}
      />
    </div>
    <p class="t-hint" class:t-bad={!read.ok} id="{id}-status">{read.ok ? c.colourHint : c.invalid}</p>
  </div>
{/snippet}

<div class="t-tool">
  <div class="t-col">
    {@render colourField(
      'contrast-text',
      c.text,
      c.pickText,
      fgRead,
      () => fg,
      (value) => (fg = value)
    )}
    {@render colourField(
      'contrast-background',
      c.background,
      c.pickBackground,
      bgRead,
      () => bg,
      (value) => (bg = value)
    )}
    <div class="t-actions"><button type="button" class="t-small" onclick={swap}>{c.swap}</button></div>

    <section class="t-field" aria-labelledby="contrast-preview">
      <h2 class="t-label" id="contrast-preview">{c.preview}</h2>
      {#if fgColour && bgColour}
        <div class="preview" style:color={toRgb(fgColour)} style:background-color={toRgb(bgColour)} data-testid="contrast-preview">
          <p class="large">{c.sampleLarge}</p>
          <p>{c.sample}</p>
          <span class="button" style:border-color={toRgb(fgColour)}>{c.sampleButton}</span>
        </div>
      {/if}
    </section>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="contrast-ratio">
      <h2 class="t-label" id="contrast-ratio">{c.ratio}</h2>
      <p class="ratio mono" role="status" aria-live="polite" data-testid="contrast-ratio">
        {value === null ? '–' : fill(c.ratioLine, { ratio: local(written(value)) })}
      </p>
    </section>

    {#if value !== null}
      <section class="t-field" aria-labelledby="contrast-checks">
        <h2 class="t-label" id="contrast-checks">{c.checks}</h2>
        <ul class="checks" data-testid="contrast-checks">
          {#each CHECKS as check (check.id)}
            {@const pass = value >= check.min}
            <li class:pass>
              <span>{c.check[check.id]} <span class="needs">({fill(c.needs, { min: local(String(check.min)) })})</span></span>
              <strong class="verdict mono">{pass ? c.pass : c.fail}</strong>
            </li>
          {/each}
        </ul>
        <p class="t-hint">{c.largeHint}</p>
      </section>

      <fieldset class="t-checks">
        <legend class="t-label">{c.target}</legend>
        {#each Object.keys(TARGETS) as Target[] as option (option)}
          <label><input type="radio" name="contrast-target" value={option} bind:group={target} /> {c.targets[option]}</label>
        {/each}
      </fieldset>

      <section class="t-field" aria-labelledby="contrast-suggest">
        <h2 class="t-label" id="contrast-suggest">{c.suggest}</h2>
        {#if !suggestions}
          <p class="t-hint t-good" data-testid="contrast-already">{c.already}</p>
        {:else}
          <dl class="t-kv suggestions">
            {#each [['text', c.newText, suggestions.text] as const, ['background', c.newBackground, suggestions.background] as const] as [which, label, suggestion] (which)}
              <dt>{label}</dt>
              <dd data-testid="contrast-suggest-{which}">
                {#if suggestion}
                  <span class="chip" style:background-color={suggestion.hex} aria-hidden="true"></span>
                  <span>{suggestion.hex} ({fill(c.ratioLine, { ratio: local(written(suggestion.ratio)) })})</span>
                  <button
                    type="button"
                    class="t-small"
                    aria-label={fill(c.useLabel, { colour: suggestion.hex, which: c.which[which] })}
                    onclick={() => (which === 'text' ? (fg = suggestion.hex) : (bg = suggestion.hex))}>{c.use}</button
                  >
                {:else}
                  {c.none}
                {/if}
              </dd>
            {/each}
          </dl>
          <p class="t-hint">{c.suggestHint}</p>
        {/if}
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
  .preview {
    display: grid;
    gap: 0.6rem;
    justify-items: start;
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .preview p {
    margin: 0;
    max-width: none;
    color: inherit;
    font-size: 16px;
  }
  .preview .large {
    font-size: 24px;
    font-weight: 600;
  }
  .button {
    padding: 0.3rem 0.9rem;
    border: 2px solid;
    border-radius: 6px;
    font-size: 14px;
  }
  .ratio {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
    color: var(--text);
  }
  .checks {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.88rem;
  }
  .checks li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.35rem 0.6rem;
    border-left: 3px solid var(--syn-num);
    background: var(--surface);
  }
  .checks li.pass {
    border-left-color: var(--accent);
  }
  .needs {
    color: var(--muted);
  }
  .verdict {
    color: var(--syn-num);
  }
  .pass .verdict {
    color: var(--accent-text);
  }
  .suggestions dd {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .chip {
    width: 1.1rem;
    height: 1.1rem;
    border: 1px solid var(--border);
    border-radius: 4px;
  }
</style>
