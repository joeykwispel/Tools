<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import jsonText from '../json/text';
  import { compare, count, hunks, normaliseJson, toText } from './logic';
  import text_ from './text';

  const SAMPLE = {
    before: `function total(items) {\n  let sum = 0;\n  for (const item of items) {\n    sum += item.price;\n  }\n  return sum;\n}\n\nexport default total;\n`,
    after: `function total(items, taxRate = 0.21) {\n  let sum = 0;\n  for (const item of items) {\n    sum += item.price * item.quantity;\n  }\n  return sum * (1 + taxRate);\n}\n\nexport default total;\n`
  };

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let before = $state(SAMPLE.before);
  let after = $state(SAMPLE.after);
  let mode = $state<'text' | 'json'>('text');
  let ignoreWhitespace = $state(false);
  let ignoreCase = $state(false);
  let showAll = $state(false);

  /** In JSON mode both sides are first written the same way, so only real differences are left. */
  const sides = $derived.by(() => {
    if (mode === 'text') return { ok: true as const, before, after };
    for (const side of ['before', 'after'] as const) {
      const normal = normaliseJson(side === 'before' ? before : after);
      if (!normal.ok) return { ok: false as const, side, error: normal.error };
    }
    const a = normaliseJson(before);
    const b = normaliseJson(after);
    return { ok: true as const, before: a.ok ? a.text : '', after: b.ok ? b.text : '' };
  });
  const all = $derived(sides.ok ? compare(sides.before, sides.after, { ignoreWhitespace, ignoreCase }) : []);
  const blocks = $derived(hunks(all, showAll ? Infinity : 3));
  const counts = $derived(count(all));
  const changed = $derived(counts.added + counts.removed > 0);
  const status = $derived.by(() => {
    if (!sides.ok) {
      const { kind, line, column, found } = sides.error;
      const message = fill(jsonText[app.locale].errors[kind], { found });
      return fill(c.invalidJson, { side: c.sides[sides.side], line: String(line), column: String(column), message });
    }
    return changed ? fill(c.summary, { added: String(counts.added), removed: String(counts.removed) }) : c.same;
  });
</script>

<div class="t-col">
  <div class="t-tool">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="diff-before">{c.before}</label>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            onclick={() => {
              before = SAMPLE.before;
              after = SAMPLE.after;
              mode = 'text';
            }}>{common.sample}</button
          >
          <button
            type="button"
            class="t-small"
            onclick={() => {
              before = '';
              after = '';
            }}>{common.clear}</button
          >
        </div>
      </div>
      <textarea id="diff-before" class="t-input" rows="10" spellcheck="false" autocapitalize="off" autocomplete="off" bind:value={before}></textarea>
    </div>
    <div class="t-field">
      <div class="t-row"><label class="t-label" for="diff-after">{c.after}</label></div>
      <textarea id="diff-after" class="t-input" rows="10" spellcheck="false" autocapitalize="off" autocomplete="off" bind:value={after}></textarea>
    </div>
  </div>

  <fieldset class="t-checks">
    <legend class="t-label">{c.compareAs}</legend>
    <label><input type="radio" name="diff-mode" value="text" bind:group={mode} /> {c.text}</label>
    <label><input type="radio" name="diff-mode" value="json" bind:group={mode} /> {c.json}</label>
  </fieldset>
  <div class="t-checks">
    <label><input type="checkbox" bind:checked={ignoreWhitespace} /> {c.ignoreWhitespace}</label>
    <label><input type="checkbox" bind:checked={ignoreCase} /> {c.ignoreCase}</label>
    <label><input type="checkbox" bind:checked={showAll} /> {c.showAll}</label>
  </div>

  <section class="t-field" aria-labelledby="diff-result">
    <div class="t-row">
      <h2 class="t-label" id="diff-result">{c.result}</h2>
      {#if changed}<CopyButton text={toText(all)} />{/if}
    </div>
    <p class="t-status" class:t-bad={!sides.ok} role="status" aria-live="polite">{status}</p>
    {#if changed}
      <table class="mono" data-testid="diff">
        <thead class="sr-only">
          <tr><th scope="col">{c.lineBefore}</th><th scope="col">{c.lineAfter}</th><th scope="col">{c.change}</th><th scope="col">{c.line}</th></tr>
        </thead>
        <tbody>
          {#each blocks as block, i (i)}
            {#if 'skipped' in block}
              <tr class="skip"><td colspan="4">{block.skipped === 1 ? c.skippedOne : fill(c.skipped, { count: String(block.skipped) })}</td></tr>
            {:else}
              {#each block.lines as line, j (j)}
                <tr class={line.type}>
                  <td class="no">{line.before ?? ''}</td>
                  <td class="no">{line.after ?? ''}</td>
                  <td class="sign"
                    >{#if line.type === 'insert'}<span aria-hidden="true">+</span><span class="sr-only">{c.added}</span>{:else if line.type === 'delete'}<span
                        aria-hidden="true">−</span
                      ><span class="sr-only">{c.removed}</span>{/if}</td
                  >
                  <td class="text"
                    >{#if line.parts}{#each line.parts as part, k (k)}{#if part.changed}<mark>{part.text}</mark
                          >{:else}{part.text}{/if}{/each}{:else}{line.text}{/if}</td
                  >
                </tr>
              {/each}
            {/if}
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
</div>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-size: 0.85rem;
    line-height: 1.6;
  }
  td {
    padding: 0 0.6rem;
    vertical-align: top;
  }
  .no {
    width: 1%;
    text-align: right;
    color: var(--muted);
    white-space: nowrap;
    user-select: none;
  }
  .sign {
    width: 1%;
    font-weight: 700;
  }
  .text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  /* an added line is teal, a removed one orange: the + and − say the same without colour */
  tr.insert {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  tr.insert .sign {
    color: var(--accent-text);
  }
  tr.delete {
    background: color-mix(in srgb, var(--syn-num) 14%, transparent);
  }
  tr.delete .sign {
    color: var(--syn-num);
  }
  mark {
    border-radius: 3px;
    color: inherit;
  }
  tr.insert mark {
    background: color-mix(in srgb, var(--accent) 38%, transparent);
  }
  tr.delete mark {
    background: color-mix(in srgb, var(--syn-num) 38%, transparent);
  }
  tr.skip td {
    padding-block: 0.25rem;
    border-block: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.75rem;
    text-align: center;
  }
</style>
