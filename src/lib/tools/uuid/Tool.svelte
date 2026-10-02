<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { generate, inspect, type Kind } from './logic';
  import text_ from './text';

  const KINDS: Kind[] = ['uuid4', 'uuid7', 'ulid', 'nanoid'];

  const c = $derived(text_[app.locale]);

  let kind = $state<Kind>('uuid4');
  let count = $state(5);
  let uppercase = $state(false);
  let size = $state(21);
  /** Made in the browser: a random identifier in the prerendered page would be the same for everyone. */
  let ids = $state<string[]>([]);
  let pasted = $state('');

  const make = () => (ids = generate(kind, Number(count), Date.now(), { uppercase, size: Number(size) }));
  // a new batch whenever a choice changes
  $effect(() => {
    make();
  });

  /** "2022-02-22 19:22:22.000 UTC": the moment an identifier holds, the same in every time zone. */
  const moment = (time: number) => {
    const date = new Date(time);
    return Number.isNaN(date.getTime()) ? String(time) : `${date.toISOString().replace('T', ' ').replace('Z', '')} UTC`;
  };

  const verdict = $derived.by(() => {
    if (!pasted.trim()) return { text: c.inspectEmpty, bad: false };
    const found = inspect(pasted);
    if (found.kind === 'unknown') return { text: c.unknown, bad: true };
    if (found.kind === 'nil') return { text: c.nil, bad: false };
    if (found.kind === 'max') return { text: c.max, bad: false };
    const made = found.time === null ? '' : ` ${fill(c.made, { time: moment(found.time) })}`;
    if (found.kind === 'ulid') return { text: c.ulid + made, bad: false };
    const meaning = c.versions[found.version];
    const head = fill(c.uuid, { version: String(found.version) }).replace(/\.$/, meaning ? `: ${meaning}.` : '.');
    return { text: head + made + (found.variant === 'rfc' ? '' : ` ${c.variantOther}`), bad: false };
  });
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.kind}</legend>
      {#each KINDS as option (option)}
        <label><input type="radio" name="uuid-kind" value={option} bind:group={kind} /> {c.kinds[option]}</label>
      {/each}
    </fieldset>

    <div class="row">
      <div class="t-field">
        <label class="t-label" for="uuid-count">{c.count}</label>
        <input id="uuid-count" class="t-input" type="number" min="1" max="1000" step="1" bind:value={count} />
      </div>
      {#if kind === 'nanoid'}
        <div class="t-field">
          <label class="t-label" for="uuid-size">{c.size}</label>
          <input id="uuid-size" class="t-input" type="number" min="2" max="128" step="1" bind:value={size} />
        </div>
      {/if}
    </div>

    {#if kind === 'uuid4' || kind === 'uuid7'}
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={uppercase} /> {c.uppercase}</label>
      </div>
    {/if}

    <div><button type="button" class="btn" onclick={make}>{c.generate}</button></div>
    <p class="t-hint">{c.hint}</p>

    <section class="t-field" aria-labelledby="uuid-inspect">
      <h2 class="t-label" id="uuid-inspect">{c.inspect}</h2>
      <input
        class="t-input"
        type="text"
        aria-label={c.inspectLabel}
        aria-describedby="uuid-verdict"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        bind:value={pasted}
      />
      <p class="t-status" class:t-bad={verdict.bad} id="uuid-verdict" role="status" aria-live="polite">{verdict.text}</p>
    </section>
  </div>

  <div class="t-col">
    <Output id="uuid-output" label={c.result} value={ids.join('\n')} />
  </div>
</div>

<style>
  .row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .row .t-field {
    width: 9rem;
  }
</style>
