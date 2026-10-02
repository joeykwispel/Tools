<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { t } from '$lib/locales';
  import { reveal } from '$lib/utils/actions';
  import SectionHead from '$lib/components/SectionHead.svelte';
  import Seo from '$lib/components/Seo.svelte';

  const c = $derived(t(app.locale));
</script>

<Seo title={c.meta.title} description={c.meta.description} imageAlt={c.meta.imageAlt} />

<section class="hero" id="tools">
  <div class="container">
    <p class="kicker mono"><span class="prop">joey@tools</span>:<span class="dir">~</span>$ ls<span class="caret" aria-hidden="true"></span></p>
    <h1>{c.hero.title} <span class="grad">{c.hero.titleAccent}</span></h1>
    <p class="intro">{c.hero.intro}</p>
    <p class="status mono"><span class="com">//</span> {c.hero.status}</p>
  </div>
</section>

<section class="section" id="how">
  <div class="container">
    <SectionHead slug="how-it-works" ext=".md" title={c.how.title} intro={c.how.intro} />
    <ol class="steps">
      {#each c.how.steps as step, i (step.title)}
        <li class="step glass" use:reveal={{ delay: i * 90 }}>
          <span class="idx mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}.</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>
      {/each}
    </ol>
  </div>
</section>

<style>
  .hero {
    padding-block: clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem);
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
  .intro {
    margin: 0.8rem auto 1.2rem;
    color: var(--muted);
    font-size: 1.05rem;
    animation: fade-up 0.8s var(--ease) 0.1s both;
  }
  .status {
    margin-inline: auto;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .step {
    padding: 1.2rem;
    display: grid;
    align-content: start;
    gap: 0.5rem;
  }
  .step p {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .idx {
    color: var(--accent-text);
    font-size: 0.8rem;
    font-weight: 700;
  }
  @media (max-width: 760px) {
    .steps {
      grid-template-columns: 1fr;
    }
  }
</style>
