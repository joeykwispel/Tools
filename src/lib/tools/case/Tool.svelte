<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import CopyButton from '$lib/components/tool/CopyButton.svelte';
  import { CASES, EXAMPLES, convert, words, type Case } from './logic';
  import text_ from './text';

  const SAMPLE = 'user profile id\nXMLHttpRequest\ndate-of-birth';
  const NAMES = Object.keys(CASES) as Case[];

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  const hasWords = $derived(words(input).length > 0);
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="case-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="case-input" class="t-input" rows="8" spellcheck="false" autocapitalize="off" aria-describedby="case-hint" bind:value={input}></textarea>
      <p class="t-hint" id="case-hint">{c.hint}</p>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="case-results">
      <h2 class="t-label" id="case-results">{c.results}</h2>
      {#if hasWords}
        <ul class="list">
          {#each NAMES as name (name)}
            {@const result = convert(input, name)}
            <li>
              <div class="t-row">
                <span class="name mono">{EXAMPLES[name]}</span>
                <CopyButton text={result} label={fill(c.copyAll, { name: EXAMPLES[name] })} />
              </div>
              <pre class="mono" data-testid="case-{name}">{result}</pre>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="t-status" role="status">{c.empty}</p>
      {/if}
    </section>
  </div>
</div>

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  .list li {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .name {
    color: var(--accent-text);
    font-size: 0.78rem;
    font-weight: 600;
  }
  pre {
    margin: 0.3rem 0 0;
    font-size: 0.9rem;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
