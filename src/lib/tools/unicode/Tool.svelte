<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { HIDDEN, clean, inspect, summarise } from './logic';
  import text_ from './text';

  /** Looks innocent; holds a zero-width space, a soft hyphen and a no-break space. */
  const SAMPLE = 'pass\u200Bword: café\u00A0→ “co\u00ADop” 👩‍💻';
  /** The table lists this many code points; the summary counts all of them. */
  const LISTED = 150;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let text = $state(SAMPLE);

  const chars = $derived(inspect(text));
  const summary = $derived(summarise(text, chars));
  const status = $derived(
    !text ? '' : summary.hidden === 0 ? c.noneHidden : summary.hidden === 1 ? c.hiddenOne : fill(c.hiddenMany, { count: String(summary.hidden) })
  );
  /** What to show for a character that has no shape of its own. */
  const shown = (char: string, kind: string) => (kind === 'visible' || kind === 'combining' ? (kind === 'combining' ? `◌${char}` : char) : '·');
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="unicode-text">{c.text}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (text = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (text = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="unicode-text" class="t-input" rows="6" spellcheck="false" autocapitalize="off" aria-describedby="unicode-status" bind:value={text}
      ></textarea>
      <p class="t-status" class:t-bad={summary.hidden > 0} id="unicode-status" role="status" aria-live="polite">{status}</p>
    </div>

    <section class="t-field" aria-labelledby="unicode-summary">
      <h2 class="t-label" id="unicode-summary">{c.summary}</h2>
      <dl class="t-kv">
        <dt>{c.graphemes}</dt>
        <dd data-testid="unicode-graphemes">{summary.graphemes}</dd>
        <dt>{c.codePoints}</dt>
        <dd data-testid="unicode-codepoints">{summary.codePoints}</dd>
        <dt>{c.utf16}</dt>
        <dd data-testid="unicode-utf16">{summary.utf16}</dd>
        <dt>{c.utf8}</dt>
        <dd data-testid="unicode-utf8">{summary.utf8}</dd>
        <dt>{c.hidden}</dt>
        <dd data-testid="unicode-hidden">{summary.hidden}</dd>
      </dl>
    </section>

    {#if summary.hidden > 0}<Output id="unicode-cleaned" label={c.cleaned} value={clean(text)} />{/if}
  </div>

  <div class="t-col">
    {#if chars.length}
      <section class="t-field" aria-labelledby="unicode-chars">
        <h2 class="t-label" id="unicode-chars">{c.characters}</h2>
        <table class="t-table">
          <thead>
            <tr><th scope="col">{c.char}</th><th scope="col">{c.codePoint}</th><th scope="col">{c.bytes}</th><th scope="col">{c.what}</th></tr>
          </thead>
          <tbody>
            {#each chars.slice(0, LISTED) as char, i (i)}
              <tr class:flag={HIDDEN.includes(char.kind)}>
                <td class="glyph">{shown(char.char, char.kind)}</td>
                <td>{char.label}</td>
                <td>{char.utf8}</td>
                <td class="what">{[c.kinds[char.kind], char.name].filter(Boolean).join(': ')}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if chars.length > LISTED}<p class="t-hint">{fill(c.listed, { count: String(LISTED) })}</p>{/if}
      </section>
    {/if}
  </div>
</div>

<style>
  .glyph {
    width: 3rem;
    font-size: 1.05rem;
    line-height: 1.2;
  }
  .what {
    font-family: var(--font);
    color: var(--muted);
  }
  tr.flag {
    background: color-mix(in srgb, var(--syn-num) 12%, transparent);
  }
  tr.flag .what {
    color: var(--text);
  }
</style>
