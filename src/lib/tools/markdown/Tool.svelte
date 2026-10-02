<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { outline, toHtml } from './logic';
  import text_ from './text';

  const SAMPLE = `# Release notes

A **small** release with one _important_ fix.

## What changed

- The export no longer drops the last row
- Faster start-up: \`config\` is read once
- [x] Tests added
- [ ] Docs updated

| Version | Date       |
| ------- | ---------- |
| 1.4.2   | 2026-10-02 |

\`\`\`ts
const total = rows.reduce((sum, row) => sum + row.price, 0);
\`\`\`

> Thanks to everyone who reported it.

See the [changelog](https://example.com/changelog) for more.
`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  /** The cleaned HTML. Made in the browser: DOMPurify needs a DOM, and the server has none. */
  let safe = $state('');

  const headings = $derived(outline(input));

  $effect(() => {
    const html = toHtml(input);
    let stale = false;
    void import('dompurify').then(({ default: purify }) => {
      if (stale) return;
      const clean = purify.sanitize(html, { USE_PROFILES: { html: true } });
      // worked on in a document of its own: there nothing is loaded while it is being changed
      const body = new DOMParser().parseFromString(clean, 'text/html').body;
      // a link opens in a new tab and tells the other site nothing about this page
      for (const a of body.querySelectorAll('a[href]')) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
      // an image from another site would be a request to that site: show what it is instead
      for (const img of body.querySelectorAll('img')) {
        if (img.getAttribute('src')?.startsWith('data:')) continue;
        const note = body.ownerDocument.createElement('span');
        note.className = 'image-note';
        note.textContent = fill(c.image, { alt: img.getAttribute('alt') || img.getAttribute('src') || '' });
        img.replaceWith(note);
      }
      // the checkbox of a task list has no label of its own: the text of its item is its name
      for (const box of body.querySelectorAll('input[type="checkbox"]')) box.setAttribute('aria-label', box.closest('li')?.textContent?.trim() ?? '');
      safe = body.innerHTML;
    });
    return () => {
      stale = true;
    };
  });
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="markdown-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="markdown-input" class="t-input" rows="22" spellcheck="false" aria-describedby="markdown-hint" bind:value={input}></textarea>
      <p class="t-hint" id="markdown-hint">{c.hint}</p>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="markdown-preview">
      <h2 class="t-label" id="markdown-preview">{c.preview}</h2>
      <div class="t-box preview" data-testid="markdown-preview">
        {#if safe}
          <!-- cleaned by DOMPurify above: no scripts, no event handlers -->
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html safe}
        {:else}
          <p class="empty">{c.empty}</p>
        {/if}
      </div>
    </section>

    {#if headings.length}
      <section class="t-field" aria-labelledby="markdown-outline">
        <h2 class="t-label" id="markdown-outline">{c.outline}</h2>
        <ul class="outline" data-testid="markdown-outline">
          {#each headings as heading, i (i)}
            <li style:padding-left="{(heading.level - 1) * 0.9}rem"><span class="level mono">h{heading.level}</span> {heading.text}</li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if safe}<Output id="markdown-html" label={c.html} value={safe} />{/if}
  </div>
</div>

<style>
  /* the preview is prose: the site's own text styles, not code */
  .preview {
    white-space: normal;
    font-family: var(--font);
    font-size: 0.95rem;
    line-height: 1.6;
    padding: 0.9rem 1.1rem;
  }
  .empty {
    color: var(--muted);
  }
  .preview :global(:is(h1, h2, h3, h4, h5, h6)) {
    margin: 1.1em 0 0.4em;
    font-family: var(--font);
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: var(--text);
  }
  .preview :global(h1) {
    font-size: 1.6rem;
  }
  .preview :global(h2) {
    font-size: 1.3rem;
  }
  .preview :global(h3) {
    font-size: 1.1rem;
  }
  .preview :global(:is(h4, h5, h6)) {
    font-size: 1rem;
  }
  .preview :global(> :first-child) {
    margin-top: 0;
  }
  .preview :global(> :last-child) {
    margin-bottom: 0;
  }
  .preview :global(:is(p, ul, ol, blockquote, pre, table)) {
    max-width: none;
    margin: 0 0 0.8em;
  }
  .preview :global(:is(ul, ol)) {
    padding-left: 1.4rem;
  }
  .preview :global(li:has(> input[type='checkbox'])) {
    list-style: none;
    margin-left: -1.3rem;
  }
  .preview :global(input[type='checkbox']) {
    accent-color: var(--accent);
    margin-right: 0.3rem;
  }
  .preview :global(blockquote) {
    padding-left: 0.9rem;
    border-left: 3px solid var(--border);
    color: var(--muted);
  }
  .preview :global(code) {
    padding: 0.1em 0.35em;
    border-radius: 5px;
    background: var(--surface-2);
    font-family: var(--mono);
    font-size: 0.88em;
  }
  .preview :global(pre) {
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .preview :global(pre code) {
    padding: 0;
    background: none;
  }
  .preview :global(table) {
    border-collapse: collapse;
  }
  .preview :global(:is(th, td)) {
    padding: 0.35rem 0.7rem;
    border: 1px solid var(--border);
    text-align: left;
  }
  .preview :global(hr) {
    margin: 1em 0;
    border: 0;
    border-top: 1px solid var(--border);
  }
  .preview :global(img) {
    max-width: 100%;
  }
  .preview :global(.image-note) {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 0.85em;
  }
  .outline {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.88rem;
  }
  .level {
    color: var(--accent-text);
    font-size: 0.72rem;
    font-weight: 700;
    margin-right: 0.3rem;
  }
</style>
