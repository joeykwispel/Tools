<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { KNOWN, NOT_IN_META, PRESETS, add, audit, classify, parse, serialize, toHeader, toMeta, type Preset } from './logic';
  import text_ from './text';

  const PRESET_NAMES = Object.keys(PRESETS) as Preset[];

  const c = $derived(text_[app.locale]);

  let text = $state<string>(PRESETS.site);
  let reportOnly = $state(false);
  let chosen = $state('');
  /** Which policy to start from was last picked, for the line that says what it is. */
  let preset = $state<Preset | null>('site');

  const policy = $derived(parse(text));
  const findings = $derived(audit(policy));
  const status = $derived(
    !policy.directives.length
      ? c.empty
      : findings.length === 0
        ? c.summary.none
        : findings.length === 1
          ? c.summary.one
          : fill(c.summary.other, { count: String(findings.length) })
  );

  /** Directives that can still be added: the ones a browser knows, that are not out of date and not there yet. */
  const available = $derived(Object.keys(KNOWN).filter((name) => !KNOWN[name].deprecated && !policy.directives.some((directive) => directive.name === name)));
  const toAdd = $derived(available.includes(chosen) ? chosen : (available[0] ?? ''));
  const dropped = $derived(policy.directives.map((directive) => directive.name).filter((name) => NOT_IN_META.includes(name)));

  function start(name: Preset) {
    text = PRESETS[name];
    preset = name;
  }

  /** What one source in a list lets through, in words. */
  function explain(value: string): string {
    const source = classify(value);
    switch (source.kind) {
      case 'keyword':
        return c.source[source.keyword];
      case 'hash':
        return fill(c.source.hash, { algorithm: source.algorithm });
      case 'scheme':
        return fill(c.source.scheme, { scheme: source.scheme });
      case 'host':
        return source.wildcard ? c.source.wildcard : c.source.host;
      default:
        return c.source[source.kind];
    }
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="csp-policy">{c.policy}</label>
      <textarea
        id="csp-policy"
        class="t-input"
        rows="7"
        spellcheck="false"
        autocapitalize="off"
        aria-describedby="csp-policy-hint csp-status"
        bind:value={text}
        oninput={() => (preset = null)}></textarea>
      <p class="t-hint" id="csp-policy-hint">{c.policyHint}</p>
    </div>

    <div class="t-field">
      <h2 class="t-label" id="csp-presets">{c.presets}</h2>
      <div class="t-actions" role="group" aria-labelledby="csp-presets">
        {#each PRESET_NAMES as name (name)}
          <button type="button" class="t-small" aria-pressed={preset === name} onclick={() => start(name)}>{c.preset[name]}</button>
        {/each}
      </div>
      {#if preset}<p class="t-hint">{c.presetHint[preset]}</p>{/if}
    </div>

    {#if available.length}
      <div class="t-field">
        <label class="t-label" for="csp-add">{c.add}</label>
        <div class="adder">
          <select id="csp-add" class="t-input" value={toAdd} onchange={(e) => (chosen = e.currentTarget.value)}>
            {#each available as name (name)}
              <option value={name}>{name}</option>
            {/each}
          </select>
          <button
            type="button"
            class="t-small"
            onclick={() => {
              text = serialize(add(policy.directives, toAdd));
              preset = null;
            }}>{c.addButton}</button
          >
        </div>
        <p class="t-hint">{c.directive[toAdd]}</p>
      </div>
    {/if}

    <section class="t-field" aria-labelledby="csp-findings">
      <h2 class="t-label" id="csp-findings">{c.findings}</h2>
      <p class="t-status" id="csp-status" role="status" aria-live="polite">{status}</p>
      {#if findings.length}
        <ul class="findings" data-testid="csp-findings">
          {#each findings as finding, i (i)}
            <li class={finding.level}>
              <span class="level mono">{c.levels[finding.level]}</span>
              <span>{fill(c.finding[finding.id], { directive: finding.directive ?? '', value: finding.value ?? '' })}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="csp-explained">
      <h2 class="t-label" id="csp-explained">{c.explained}</h2>
      <ul class="directives" data-testid="csp-explained">
        {#each policy.directives as directive (directive.name)}
          <li>
            <div class="t-row">
              <h3 class="name mono">{directive.name}</h3>
              <button
                type="button"
                class="t-small"
                aria-label={fill(c.remove, { directive: directive.name })}
                onclick={() => {
                  text = serialize(policy.directives.filter((other) => other !== directive));
                  preset = null;
                }}>{c.removeShort}</button
              >
            </div>
            <p class="t-hint">{c.directive[directive.name] ?? c.unknownDirective}</p>
            {#if KNOWN[directive.name]?.takes === 'sources'}
              {#if directive.values.length}
                <ul class="sources">
                  {#each directive.values as value, i (i)}
                    <li><code class="mono">{value}</code> <span>{explain(value)}</span></li>
                  {/each}
                </ul>
              {:else}
                <p class="t-hint">{c.noValue}</p>
              {/if}
            {:else if directive.values.length}
              <p class="values mono">{directive.values.join(' ')}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    {#if policy.directives.length}
      <Output id="csp-header" label={c.header} value={toHeader(policy.directives, reportOnly || policy.reportOnly)} />
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={reportOnly} disabled={policy.reportOnly} /> {c.reportOnly}</label>
      </div>
      <Output id="csp-meta" label={c.meta} value={toMeta(policy.directives)} />
      {#if dropped.length}<p class="t-hint">{fill(c.metaDropped, { directives: dropped.join(', ') })}</p>{/if}
    {/if}
  </div>
</div>

<style>
  .adder {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .findings,
  .directives,
  .sources {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .findings {
    gap: 0.6rem;
    font-size: 0.85rem;
  }
  .findings li {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    gap: 0.75rem;
    overflow-wrap: anywhere;
  }
  .level {
    font-size: 0.75rem;
    line-height: 1.9;
    color: var(--muted);
  }
  .bad .level {
    color: var(--syn-num);
    font-weight: 600;
  }
  .warn .level {
    color: var(--text);
    font-weight: 600;
  }
  .directives {
    gap: 0.9rem;
  }
  .directives > li {
    display: grid;
    gap: 0.25rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    min-width: 0;
  }
  .name {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0;
    color: var(--accent-text);
  }
  .sources {
    gap: 0.2rem;
    font-size: 0.85rem;
  }
  .sources li {
    overflow-wrap: anywhere;
  }
  .sources code,
  .values {
    font-size: 0.82rem;
    color: var(--text);
  }
  .sources span {
    color: var(--muted);
  }
  .values {
    margin: 0;
    max-width: none;
    overflow-wrap: anywhere;
  }
</style>
