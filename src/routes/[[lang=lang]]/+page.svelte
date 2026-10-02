<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { favorites } from '$lib/favorites/favorites.svelte';
  import { fill, t } from '$lib/locales';
  import { categories, tools, toolsIn } from '$lib/tools/registry';
  import ToolRow from '$lib/components/dash/ToolRow.svelte';
  import Seo from '$lib/components/Seo.svelte';

  const c = $derived(t(app.locale));
  const planned = tools.filter((tool) => tool.status === 'soon').length;
  // a favourite of a tool that no longer exists is simply not shown
  const starred = $derived(favorites.slugs.flatMap((slug) => tools.find((tool) => tool.slug === slug) ?? []));
</script>

<Seo title={c.meta.title} description={c.meta.description} imageAlt={c.meta.imageAlt} />

<!-- Only the tools belong on this page: the title, then the list. -->
<section class="hero">
  <div class="container">
    <p class="kicker mono"><span class="prop">joey@tools</span>:<span class="dir">~</span>$ ls<span class="caret" aria-hidden="true"></span></p>
    <h1>{c.hero.title} <span class="grad">{c.hero.titleAccent}</span></h1>
    {#if planned}<p class="status mono"><span class="com">//</span> {fill(c.hero.status, { count: String(planned) })}</p>{/if}
  </div>
</section>

<div class="container list">
  {#if starred.length}
    <section aria-labelledby="cat-favorites" data-testid="favorites">
      <h2 class="mono" id="cat-favorites">
        <span class="com" aria-hidden="true">//</span>
        {c.favorites.title}
        <span class="n" aria-hidden="true">{starred.length}</span>
      </h2>
      <ul>
        {#each starred as tool (tool.slug)}
          <ToolRow {tool} />
        {/each}
      </ul>
    </section>
  {/if}

  {#each categories as category (category.id)}
    {@const items = toolsIn(category.id)}
    <section aria-labelledby="cat-{category.id}" data-category={category.id}>
      <h2 class="mono" id="cat-{category.id}">
        <span class="com" aria-hidden="true">//</span>
        {category.title[app.locale]}
        <span class="n" aria-hidden="true">{items.length}</span>
      </h2>
      <ul>
        {#each items as tool (tool.slug)}
          <ToolRow {tool} />
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  .hero {
    padding-block: clamp(1.75rem, 5vw, 3rem) clamp(1.25rem, 3vw, 2rem);
    text-align: center;
  }
  .kicker {
    font-size: 0.85rem;
    color: var(--muted);
    margin: 0 auto 0.6rem;
  }
  .dir {
    color: var(--syn-fn);
  }
  h1 {
    font-size: clamp(2.1rem, 5vw, 3.4rem);
    line-height: 1;
    letter-spacing: -0.04em;
    animation: fade-up 0.8s var(--ease) both;
  }
  .grad {
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .status {
    margin: 1rem auto 0;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .list {
    display: grid;
    gap: 1.75rem;
    padding-bottom: clamp(2.5rem, 6vw, 4rem);
  }
  h2 {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.7rem;
    font-size: 0.9rem;
    letter-spacing: 0;
    color: var(--text);
  }
  h2 .com {
    font-style: normal;
  }
  .n {
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 500;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }
  @media (max-width: 980px) {
    ul {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 640px) {
    ul {
      grid-template-columns: 1fr;
    }
  }
</style>
