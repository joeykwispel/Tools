<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import { EXAMPLES, parse, type Named } from './logic';
  import text_ from './text';

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state('');
  /** Until something is typed or picked, the string of this browser is shown: it is only known in the browser. */
  let touched = $state(false);

  $effect(() => {
    if (!touched && !input) input = navigator.userAgent;
  });

  const result = $derived(parse(input));
  const named = (item: Named) => (item.version ? `${item.name} ${item.version}` : item.name);
  /** The parts there are, each with what to show for it. */
  const rows = $derived.by(() => {
    const out: [string, string][] = [];
    if (result.bot) out.push([c.names[result.bot.kind === 'tool' ? 'tool' : 'bot'], result.bot.name ? named(result.bot) : c.unnamed]);
    if (result.browser) out.push([c.names.browser, named(result.browser)]);
    if (result.app) out.push([c.names.app, result.app]);
    if (result.engine) out.push([c.names.engine, named(result.engine)]);
    if (result.os) out.push([c.names.os, named(result.os)]);
    if (result.device.kind !== 'unknown' || result.os)
      out.push([c.names.device, result.device.model ? `${c.kinds[result.device.kind]}, ${result.device.model}` : c.kinds[result.device.kind]]);
    return out;
  });
  const status = $derived.by(() => {
    if (!input.trim()) return c.empty;
    if (!rows.length) return c.nothing;
    const main = result.bot?.name || result.browser?.name || result.app;
    return fill(c.read, { summary: [main, result.os?.name].filter(Boolean).join(', ') || rows[0][1] });
  });
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="user-agent-input">{c.input}</label>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            onclick={() => {
              touched = true;
              input = navigator.userAgent;
            }}>{c.mine}</button
          >
          <button
            type="button"
            class="t-small"
            onclick={() => {
              touched = true;
              input = '';
            }}>{common.clear}</button
          >
        </div>
      </div>
      <textarea
        id="user-agent-input"
        class="t-input"
        rows="5"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="user-agent-status"
        bind:value={input}
        oninput={() => (touched = true)}></textarea>
      <p class="t-status" class:t-good={rows.length > 0} id="user-agent-status" role="status" aria-live="polite">{status}</p>
    </div>

    <div class="t-field">
      <label class="t-label" for="user-agent-example">{c.example}</label>
      <select
        id="user-agent-example"
        class="t-input"
        value={EXAMPLES.find(([, ua]) => ua === input)?.[0] ?? ''}
        onchange={(e) => {
          const picked = EXAMPLES.find(([name]) => name === e.currentTarget.value);
          if (!picked) return;
          touched = true;
          input = picked[1];
        }}
      >
        <option value="" disabled>{c.choose}</option>
        {#each EXAMPLES as [name] (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </div>
    <p class="t-hint">{c.hint}</p>
  </div>

  <div class="t-col">
    {#if rows.length}
      <section class="t-field" aria-labelledby="user-agent-result">
        <h2 class="t-label" id="user-agent-result">{c.result}</h2>
        <dl class="t-kv" data-testid="user-agent-result">
          {#each rows as [name, value] (name)}
            <dt>{name}</dt>
            <dd>{value}</dd>
          {/each}
        </dl>
      </section>
    {/if}
    {#if result.notes.length}
      <section class="t-field" aria-labelledby="user-agent-notes">
        <h2 class="t-label" id="user-agent-notes">{c.notes}</h2>
        <ul class="notes" data-testid="user-agent-notes">
          {#each result.notes as note (note)}
            <li>{c.note[note]}</li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>

<style>
  .notes {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.85rem;
    color: var(--muted);
  }
</style>
