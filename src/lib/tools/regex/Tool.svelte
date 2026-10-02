<script lang="ts">
  import { onDestroy } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import { FLAGS, segments, type Flag, type Input, type Output } from './logic';
  import type { Request, Response } from './worker';

  const SAMPLE = {
    pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
    text: 'Released on 2026-10-02, patched on 2026-10-09.\nThe next one is planned for 2027-01-15.',
    replacement: '$<day>/$<month>/$<year>'
  };
  /** How long a pattern may run before it is stopped. */
  const TIME_LIMIT = 1500;
  /** The list under the text shows this many matches in full; the highlighting shows all of them. */
  const LISTED = 50;

  const c = $derived(t(app.locale).regex);

  let pattern = $state(SAMPLE.pattern);
  let text = $state(SAMPLE.text);
  let replacement = $state(SAMPLE.replacement);
  let on = $state<Record<Flag, boolean>>({ g: true, i: false, m: false, s: false, u: false });
  const flags = $derived(FLAGS.filter((f) => on[f]).join(''));

  let output = $state<Output | null>(null);
  /** The text the output belongs to: while typing, the highlighting must not be laid over newer text. */
  let outputText = $state('');
  let tooSlow = $state(false);
  let copied = $state(false);

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

  async function copy() {
    try {
      await navigator.clipboard.writeText(output?.replaced ?? '');
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* clipboard not available: the result can still be selected by hand */
    }
  }
</script>

<div class="tool">
  <div class="in">
    <div class="field">
      <div class="label-row">
        <label for="regex-pattern">{c.pattern}</label>
        <button type="button" class="small mono" onclick={sample}>{c.sample}</button>
      </div>
      <div class="pattern mono" class:bad={failed}>
        <span aria-hidden="true">/</span>
        <input id="regex-pattern" type="text" bind:value={pattern} spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="regex-status" />
        <span aria-hidden="true">/{flags}</span>
      </div>
    </div>

    <fieldset class="flags">
      <legend>{c.flags}</legend>
      {#each FLAGS as flag (flag)}
        <label><input type="checkbox" bind:checked={on[flag]} /> <code class="mono">{flag}</code> {c.flagNames[flag]}</label>
      {/each}
    </fieldset>

    <div class="field">
      <label for="regex-text">{c.text}</label>
      <textarea id="regex-text" class="mono" rows="7" bind:value={text} spellcheck="false"></textarea>
    </div>

    <div class="field">
      <label for="regex-replacement">{c.replaceWith}</label>
      <input id="regex-replacement" class="mono" type="text" bind:value={replacement} spellcheck="false" autocomplete="off" aria-describedby="regex-hint" />
      <p class="hint" id="regex-hint">{c.replaceHint}</p>
    </div>
  </div>

  <div class="out">
    <section aria-labelledby="regex-matches">
      <h2 id="regex-matches">{c.matches}</h2>
      <p class="status" class:bad={failed} id="regex-status" role="status" aria-live="polite">{status}</p>
      {#if matches.length}
        <pre class="box mono" data-testid="highlight">{#each pieces as piece, i (i)}{#if piece.match === null}{piece.text}{:else}<mark
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
                <dl class="mono">
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
      {/if}
    </section>

    {#if output?.replaced != null}
      <section aria-labelledby="regex-result">
        <div class="label-row">
          <h2 id="regex-result">{c.result}</h2>
          <button type="button" class="small mono" onclick={copy}>{copied ? c.copied : c.copy}</button>
        </div>
        <pre class="box mono" data-testid="replaced">{output.replaced}</pre>
      </section>
    {/if}
  </div>
</div>

<style>
  .tool {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
    align-items: start;
  }
  .in,
  .out {
    display: grid;
    gap: 1.1rem;
  }
  .field {
    display: grid;
    gap: 0.4rem;
  }
  label,
  legend,
  h2 {
    font-family: var(--mono);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0;
    color: var(--muted);
  }
  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  input[type='text'],
  textarea,
  .pattern,
  .box {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  input[type='text'],
  textarea,
  .box {
    padding: 0.6rem 0.75rem;
  }
  textarea {
    resize: vertical;
    min-height: 6rem;
  }
  .pattern {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding-inline: 0.75rem;
    color: var(--muted);
  }
  .pattern input {
    flex: 1;
    min-width: 0;
    padding-inline: 0;
    border: 0;
    border-radius: 0;
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
  .flags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .flags legend {
    padding: 0;
    margin-bottom: 0.4rem;
  }
  .flags label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-family: var(--font);
    font-weight: 400;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .flags input {
    accent-color: var(--accent);
  }
  .flags code {
    color: var(--accent-text);
    font-weight: 700;
  }
  .hint,
  .status {
    font-size: 0.82rem;
    color: var(--muted);
  }
  .status {
    min-height: 1.3rem;
    margin: 0.35rem 0 0.6rem;
  }
  .status.bad {
    color: var(--syn-num);
  }
  .small {
    padding: 0.15rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--muted);
    font-size: 0.72rem;
    transition:
      color 0.2s,
      border-color 0.2s;
  }
  .small:hover {
    color: var(--accent-text);
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  }
  .box {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 16rem;
    overflow: auto;
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
    margin: 0.75rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
    max-height: 22rem;
    overflow: auto;
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
  dt,
  .unset {
    color: var(--muted);
  }
  code {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  dl {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.15rem 0.75rem;
    margin: 0.4rem 0 0;
  }
  dd {
    margin: 0;
  }
  .unset {
    font-style: italic;
  }
  @media (max-width: 860px) {
    .tool {
      grid-template-columns: 1fr;
    }
  }
</style>
