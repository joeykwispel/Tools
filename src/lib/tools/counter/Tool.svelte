<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import { READING_WPM, SPEAKING_WPM, count, duration, frequent } from './logic';
  import text_ from './text';

  const SAMPLE = `The quick brown fox jumps over the lazy dog. It does so every working day, without fail.

Nobody knows why the dog is lazy, or why the fox is in such a hurry. The dog has stopped asking.`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let text = $state(SAMPLE);

  const counts = $derived(count(text, app.locale));
  const top = $derived(frequent(text, 10, app.locale));
  const rows = $derived([
    ['characters', c.characters, String(counts.characters)],
    ['charactersNoSpaces', c.charactersNoSpaces, String(counts.charactersNoSpaces)],
    ['words', c.words, String(counts.words)],
    ['sentences', c.sentences, String(counts.sentences)],
    ['paragraphs', c.paragraphs, String(counts.paragraphs)],
    ['lines', c.lines, String(counts.lines)],
    ['bytes', c.bytes, String(counts.bytes)],
    ['reading', c.reading, duration(counts.readingSeconds)],
    ['speaking', c.speaking, duration(counts.speakingSeconds)]
  ]);
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="counter-text">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (text = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (text = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="counter-text" class="t-input text" rows="16" bind:value={text}></textarea>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="counter-counts">
      <h2 class="t-label" id="counter-counts">{c.counts}</h2>
      <dl class="t-kv" aria-live="polite">
        {#each rows as [id, label, value] (id)}
          <dt>{label}</dt>
          <dd data-testid="counter-{id}">{value}</dd>
        {/each}
      </dl>
      <p class="t-hint">{fill(c.timeHint, { reading: String(READING_WPM), speaking: String(SPEAKING_WPM) })}</p>
    </section>

    {#if top.length}
      <section class="t-field" aria-labelledby="counter-frequent">
        <h2 class="t-label" id="counter-frequent">{c.frequent}</h2>
        <table class="t-table" data-testid="counter-top">
          <thead>
            <tr><th scope="col">{c.word}</th><th scope="col">{c.times}</th></tr>
          </thead>
          <tbody>
            {#each top as item (item.word)}
              <tr><td>{item.word}</td><td>{item.count}</td></tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  </div>
</div>

<style>
  /* prose, not code: the text is read as text */
  .text {
    font-family: var(--font);
  }
  dl {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  dd {
    text-align: right;
  }
</style>
