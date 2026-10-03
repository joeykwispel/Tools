<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import { card, check, judgeImage, read } from './logic';
  import text_ from './text';

  const SAMPLE = `<head>
  <title>How tides work | The Shoreline</title>
  <meta name="description" content="Why the sea comes and goes twice a day.">
  <link rel="canonical" href="https://www.shoreline.example/tides">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="The Shoreline">
  <meta property="og:title" content="How tides work">
  <meta property="og:description" content="The moon pulls, the sea follows. Why the water comes and goes twice a day, explained in five minutes.">
  <meta property="og:url" content="https://www.shoreline.example/tides">
  <meta property="og:image" content="https://www.shoreline.example/og/tides.png">
  <meta name="twitter:card" content="summary_large_image">
</head>
`;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  /** The picture, picked from disk: a page can not load one from another site here. */
  let picked = $state<{ name: string; url: string; width: number; height: number } | null>(null);
  let pickError = $state('');

  const tags = $derived(read(input));
  const made = $derived(card(tags));
  const checks = $derived(check(tags));
  const status = $derived(!input.trim() ? c.empty : !tags.length ? c.none : tags.length === 1 ? c.foundOne : fill(c.found, { count: String(tags.length) }));

  const dataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
      reader.readAsDataURL(file);
    });

  async function pick(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const url = await dataUrl(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      picked = { name: file.name, url, width: image.naturalWidth, height: image.naturalHeight };
      pickError = '';
    } catch {
      picked = null;
      pickError = fill(c.pictureUnreadable, { name: file.name });
    }
  }
</script>

{#snippet picture(shape: 'wide' | 'square')}
  {#if picked}
    <img class="shot {shape}" src={picked.url} alt={made.imageAlt || c.pictureAlt} />
  {:else}
    <div class="shot {shape} absent">{fill(c.pictureAt, { url: made.image })}</div>
  {/if}
{/snippet}

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="og-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="og-input"
        class="t-input"
        rows="12"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="og-status og-input-hint"
        bind:value={input}></textarea>
      <p class="t-status" class:t-good={tags.length > 0} id="og-status" role="status" aria-live="polite">{status}</p>
      <p class="t-hint" id="og-input-hint">{c.inputHint}</p>
    </div>

    <div class="t-field">
      <label class="t-label" for="og-picture">{c.picture}</label>
      <input id="og-picture" class="t-input" type="file" accept="image/*" onchange={pick} aria-describedby="og-picture-verdict og-picture-hint" />
      <p
        class="t-status"
        class:t-bad={!!pickError || (!!picked && judgeImage(picked.width, picked.height) === 'tooSmall')}
        id="og-picture-verdict"
        aria-live="polite"
      >
        {#if pickError}{pickError}
        {:else if picked}{fill(c.pictureSize, {
            name: picked.name,
            width: String(picked.width),
            height: String(picked.height)
          })}{c.verdicts[judgeImage(picked.width, picked.height)]}{/if}
      </p>
      <p class="t-hint" id="og-picture-hint">{c.pictureHint}</p>
    </div>

    <section class="t-field" aria-labelledby="og-checks">
      <h2 class="t-label" id="og-checks">{c.checks}</h2>
      <ul class="checks" data-testid="og-checks">
        {#each checks as item (item.id)}
          <li>
            <span class="level {item.level}">{c.levels[item.level]}</span>
            <span>{fill(c.check[item.id], item.vars)}</span>
          </li>
        {/each}
      </ul>
    </section>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="og-cards">
      <h2 class="t-label" id="og-cards">{c.cards}</h2>

      <figure data-testid="og-facebook">
        <div class="card stacked">
          {#if made.image}{@render picture('wide')}{/if}
          <div class="body">
            <p class="host upper">{made.host || c.noHost}</p>
            <p class="title">{made.title || c.noTitle}</p>
            {#if made.description}<p class="description one">{made.description}</p>{/if}
          </div>
        </div>
        <figcaption class="t-hint">{c.facebook}</figcaption>
      </figure>

      <figure data-testid="og-x">
        {#if made.large && made.image}
          <div class="card stacked over">
            {@render picture('wide')}
            <p class="overlay">{made.title || c.noTitle}</p>
          </div>
          <p class="host from">{made.host || c.noHost}</p>
        {:else}
          <div class="card side">
            {#if made.image}{@render picture('square')}{:else}<div class="shot square absent">{c.noPicture}</div>{/if}
            <div class="body">
              <p class="host">{made.host || c.noHost}</p>
              <p class="title">{made.title || c.noTitle}</p>
              {#if made.description}<p class="description two">{made.description}</p>{/if}
            </div>
          </div>
        {/if}
        <figcaption class="t-hint">{c.x}</figcaption>
      </figure>

      <figure data-testid="og-chat">
        <div class="chat">
          <p class="site">{made.siteName || made.host || c.noHost}</p>
          <p class="title link">{made.title || c.noTitle}</p>
          {#if made.description}<p class="description">{made.description}</p>{/if}
          {#if made.image}{@render picture('wide')}{/if}
        </div>
        <figcaption class="t-hint">{c.chat}</figcaption>
      </figure>
      <p class="t-hint">{c.cardsHint}</p>
    </section>

    {#if tags.length}
      <section class="t-field" aria-labelledby="og-tags">
        <h2 class="t-label" id="og-tags">{c.tags}</h2>
        <table class="t-table" data-testid="og-tags-table">
          <thead>
            <tr><th scope="col">{c.tag}</th><th scope="col">{c.value}</th></tr>
          </thead>
          <tbody>
            {#each tags as tag, i (i)}
              <tr><td class="key">{tag.key}</td><td>{tag.value}</td></tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  </div>
</div>

<style>
  .checks {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
  }
  .checks li {
    display: grid;
    grid-template-columns: 2.4rem minmax(0, 1fr);
    gap: 0.6rem;
    align-items: baseline;
  }
  .level {
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--muted);
  }
  .level.good {
    color: var(--accent-text);
  }
  .level.fix {
    color: var(--syn-num);
  }

  figure {
    display: grid;
    gap: 0.4rem;
    margin: 0 0 0.6rem;
    max-width: 32rem;
  }
  p {
    margin: 0;
    max-width: none;
  }
  .card {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .card.side {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr);
  }
  .card.over {
    position: relative;
    border-radius: 1rem;
  }
  .body {
    display: grid;
    gap: 0.15rem;
    align-content: center;
    padding: 0.6rem 0.8rem;
    min-width: 0;
  }
  .shot {
    display: block;
    width: 100%;
    object-fit: cover;
    background: var(--surface-2);
  }
  .shot.wide {
    aspect-ratio: 1.91;
  }
  .shot.square {
    aspect-ratio: 1;
    height: 100%;
  }
  .shot.absent {
    display: grid;
    place-items: center;
    padding: 0.75rem;
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--muted);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .host {
    font-size: 0.75rem;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .host.upper {
    text-transform: uppercase;
  }
  .host.from {
    padding-left: 0.25rem;
  }
  .title {
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  .title.link {
    color: var(--accent-text);
  }
  .description {
    font-size: 0.82rem;
    line-height: 1.4;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .description.one,
  .description.two {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
  }
  .description.two {
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  .overlay {
    position: absolute;
    left: 0.6rem;
    bottom: 0.6rem;
    max-width: calc(100% - 1.2rem);
    padding: 0.1rem 0.45rem;
    border-radius: 0.3rem;
    background: rgb(0 0 0 / 0.77);
    color: #fff;
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chat {
    display: grid;
    gap: 0.25rem;
    padding-left: 0.75rem;
    border-left: 4px solid var(--border);
  }
  .chat .site {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text);
  }
  .chat .shot {
    margin-top: 0.3rem;
    max-width: 22rem;
    border-radius: var(--radius-sm);
  }
  .key {
    white-space: nowrap;
  }
</style>
