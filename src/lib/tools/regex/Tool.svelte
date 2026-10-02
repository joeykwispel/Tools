<script lang="ts">
  import { onDestroy } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { FLAGS, segments, type Flag, type Input, type Output as Evaluated } from './logic';
  import text_ from './text';
  import type { Request, Response } from './worker';

  const SAMPLE = {
    pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
    text: 'Released on 2026-10-02, patched on 2026-10-09.\nThe next one is planned for 2027-01-15.',
    replacement: '$<day>/$<month>/$<year>'
  };
  /** How long a pattern may run before it is stopped. */
  const TIME_LIMIT = 1500;
  /** The list under the text shows this many matches in full; the highlighting shows all of them. */
  const LISTED = 20;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let pattern = $state(SAMPLE.pattern);
  let text = $state(SAMPLE.text);
  let replacement = $state(SAMPLE.replacement);
  let on = $state<Record<Flag, boolean>>({ g: true, i: false, m: false, s: false, u: false });
  const flags = $derived(FLAGS.filter((f) => on[f]).join(''));

  let output = $state<Evaluated | null>(null);
  /** The text the output belongs to: while typing, the highlighting must not be laid over newer text. */
  let outputText = $state('');
  let tooSlow = $state(false);

  let worker: Worker | undefined;
  let busy = false;
  let id = 0;
  let limit: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    clearTimeout(limit);
    worker?.terminate();
    worker = undefined;
    busy = false;
  }

  function evaluate(input: Input) {
    // still working on the previous input: end it, it may never finish
    if (busy) stop();
    worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Response>) => {
      if (e.data.id !== id) return;
      clearTimeout(limit);
      busy = false;
      tooSlow = false;
      output = e.data.output;
      outputText = input.text;
    };
    busy = true;
    limit = setTimeout(() => {
      stop();
      tooSlow = true;
      output = null;
    }, TIME_LIMIT);
    worker.postMessage({ id: ++id, ...input } satisfies Request);
  }

  $effect(() => {
    const input: Input = { pattern, flags, text, replacement };
    const wait = setTimeout(() => evaluate(input), 120);
    return () => clearTimeout(wait);
  });

  onDestroy(stop);

  const result = $derived(output?.result);
  const matches = $derived(result?.ok ? result.matches : []);
  const pieces = $derived(segments(outputText, matches));
  const status = $derived.by(() => {
    if (tooSlow) return c.tooSlow;
    if (!pattern) return c.empty;
    if (!result) return '';
    if (!result.ok) return fill(c.invalid, { message: result.error });
    if (result.truncated) return fill(c.truncated, { count: String(matches.length) });
    return matches.length === 0 ? c.none : matches.length === 1 ? c.one : fill(c.many, { count: String(matches.length) });
  });
  const failed = $derived(tooSlow || (!!result && !result.ok));

  function sample() {
    pattern = SAMPLE.pattern;
    text = SAMPLE.text;
    replacement = SAMPLE.replacement;
    on = { g: true, i: false, m: false, s: false, u: false };
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="regex-pattern">{c.pattern}</label>
        <button type="button" class="t-small" onclick={sample}>{common.sample}</button>
      </div>
      <div class="pattern mono" class:bad={failed}>
        <span aria-hidden="true">/</span>
        <input id="regex-pattern" type="text" bind:value={pattern} spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="regex-status" />
        <span aria-hidden="true">/{flags}</span>
      </div>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.flags}</legend>
      {#each FLAGS as flag (flag)}
        <label><input type="checkbox" bind:checked={on[flag]} /> <code>{flag}</code> {c.flagNames[flag]}</label>
      {/each}
    </fieldset>

    <div class="t-field">
      <label class="t-label" for="regex-text">{c.text}</label>
      <textarea id="regex-text" class="t-input" rows="7" bind:value={text} spellcheck="false"></textarea>
    </div>

    <div class="t-field">
      <label class="t-label" for="regex-replacement">{c.replaceWith}</label>
      <input id="regex-replacement" class="t-input" type="text" bind:value={replacement} spellcheck="false" autocomplete="off" aria-describedby="regex-hint" />
      <p class="t-hint" id="regex-hint">{c.replaceHint}</p>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="regex-matches">
      <h2 class="t-label" id="regex-matches">{c.matches}</h2>
      <p class="t-status" class:t-bad={failed} id="regex-status" role="status" aria-live="polite">{status}</p>
      {#if matches.length}
        <pre class="t-box mono" data-testid="highlight">{#each pieces as piece, i (i)}{#if piece.match === null}{piece.text}{:else}<mark
                class:alt={piece.match % 2 === 1}>{piece.text}</mark
              >{/if}{/each}</pre>
        <ol class="list">
          {#each matches.slice(0, LISTED) as m, i (i)}
            <li>
              <p class="head mono">
                <span class="n">{fill(c.match, { n: String(i + 1) })}</span>
                <span class="at">{fill(c.at, { index: String(m.index) })}</span>
                <code>{m.text}</code>
              </p>
              {#if m.groups.length}
                <dl class="t-kv">
                  {#each m.groups as g (g.name)}
                    <dt>{fill(c.group, { name: g.name })}</dt>
                    <dd>
                      {#if g.value === undefined}<span class="unset">{c.noValue}</span>{:else}<code>{g.value}</code>{/if}
                    </dd>
                  {/each}
                </dl>
              {/if}
            </li>
          {/each}
        </ol>
        {#if matches.length > LISTED}<p class="t-hint">{fill(c.listed, { count: String(LISTED) })}</p>{/if}
      {/if}
    </section>

    {#if output?.replaced != null}<Output id="replaced" label={c.result} value={output.replaced} />{/if}
  </div>
</div>

<style>
  /* the pattern between its slashes: one frame around the input and the flags */
  .pattern {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding-inline: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .pattern input {
    flex: 1;
    min-width: 0;
    padding: 0.6rem 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--text);
  }
  /* the frame shows the focus, so the input inside it does not need its own outline */
  .pattern input:focus-visible {
    outline: none;
  }
  .pattern:focus-within {
    outline: 2px solid var(--accent-text);
    outline-offset: 3px;
  }
  .pattern.bad {
    border-color: var(--syn-num);
  }
  mark {
    border-radius: 3px;
    background: color-mix(in srgb, var(--accent) 30%, transparent);
    color: inherit;
  }
  mark.alt {
    background: color-mix(in srgb, var(--accent-2) 34%, transparent);
  }
  .list {
    list-style: none;
    margin: 0.35rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .list li {
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-size: 0.82rem;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.3rem 0.6rem;
    max-width: none;
  }
  .n {
    color: var(--accent-text);
    font-weight: 700;
  }
  .at,
  .unset {
    color: var(--muted);
  }
  .unset {
    font-style: italic;
  }
  code {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  dl {
    margin-top: 0.4rem;
    font-size: 0.82rem;
  }
</style>
