<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import {
    BASES,
    SPECIAL,
    UNITS,
    WHAT,
    WHO,
    bit,
    bits,
    character,
    convert,
    describeRange,
    octal,
    parseCidr,
    parseMode,
    parseRange,
    parseVersion,
    read,
    satisfies,
    show,
    specialBit,
    symbolic,
    write,
    type Base,
    type Family
  } from './logic';
  import text_ from './text';

  const PICKS = ['bases', 'chmod', 'sizes', 'cidr', 'semver'] as const;
  const FAMILIES: Family[] = ['decimal', 'binary', 'bits'];
  const CIDR_ROWS = ['network', 'mask', 'binary', 'wildcard', 'broadcast', 'first', 'last', 'hosts', 'total'] as const;

  const c = $derived(text_[app.locale]);

  let pick = $state<(typeof PICKS)[number]>('bases');

  // number bases
  let number = $state('0xff');
  let base = $state<Base | 'auto'>('auto');
  const numberRead = $derived(read(number, base));

  // chmod: the text and the boxes are two ways to set the same twelve bits
  let modeText = $state('755');
  let mode = $state(0o755);
  const modeOk = $derived(parseMode(modeText) !== null);
  function typedMode() {
    const parsed = parseMode(modeText);
    if (parsed !== null) mode = parsed;
  }
  function toggle(mask: number) {
    mode ^= mask;
    modeText = octal(mode);
  }

  // data sizes
  let amount = $state<number | null>(500);
  let unit = $state('GB');
  const sizes = $derived(amount === null ? [] : convert(amount, unit));

  // CIDR
  let network = $state('192.168.1.10/24');
  const cidr = $derived(parseCidr(network));

  // semver
  let range = $state('^1.2.3 || ~2.0.0-beta.1');
  let versions = $state('1.2.3\n1.9.0\n1.3.0-alpha\n2.0.0-beta.2\n2.0.5\n2.1.0\n3.0.0');
  const rangeRead = $derived(parseRange(range));
  const tried = $derived(
    versions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const version = parseVersion(line);
        return { line, verdict: !version ? ('invalid' as const) : rangeRead && satisfies(version, rangeRead) ? ('yes' as const) : ('no' as const) };
      })
  );
</script>

<div class="t-col">
  <fieldset class="t-checks">
    <legend class="t-label">{c.pick}</legend>
    {#each PICKS as option (option)}
      <label><input type="radio" name="calculators-pick" value={option} bind:group={pick} /> {c.picks[option]}</label>
    {/each}
  </fieldset>

  {#if pick === 'bases'}
    <div class="t-tool">
      <div class="t-col">
        <div class="t-field">
          <label class="t-label" for="bases-number">{c.bases.input}</label>
          <input
            id="bases-number"
            class="t-input"
            class:t-bad={!numberRead.ok && numberRead.error !== 'empty'}
            type="text"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-describedby="bases-status bases-hint"
            bind:value={number}
          />
          <p class="t-status" class:t-bad={!numberRead.ok} id="bases-status" role="status" aria-live="polite">
            {numberRead.ok ? '' : c.bases.errors[numberRead.error]}
          </p>
          <p class="t-hint" id="bases-hint">{c.bases.hint}</p>
        </div>
        <div class="t-field">
          <label class="t-label" for="bases-base">{c.bases.base}</label>
          <select id="bases-base" class="t-input" bind:value={base}>
            <option value="auto">{c.bases.auto}</option>
            {#each BASES as option (option)}
              <option value={option}>{c.bases.names[option]} ({option})</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="t-col">
        {#if numberRead.ok}
          {#each BASES as option (option)}
            <Output id="bases-{option}" label={`${c.bases.names[option]} (${option})`} value={write(numberRead.value, option, true)} />
          {/each}
          <dl class="t-kv" data-testid="bases-facts">
            <dt>{c.bases.bits}</dt>
            <dd>{bits(numberRead.value)}</dd>
            {#if character(numberRead.value)}
              <dt>{c.bases.character}</dt>
              <dd>{character(numberRead.value)}</dd>
            {/if}
          </dl>
        {/if}
      </div>
    </div>
  {:else if pick === 'chmod'}
    <div class="t-tool">
      <div class="t-col">
        <div class="t-field">
          <label class="t-label" for="chmod-mode">{c.chmod.input}</label>
          <input
            id="chmod-mode"
            class="t-input"
            class:t-bad={!modeOk}
            type="text"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-describedby="chmod-status chmod-hint"
            bind:value={modeText}
            oninput={typedMode}
          />
          <p class="t-status" class:t-bad={!modeOk} id="chmod-status" role="status" aria-live="polite">{modeOk ? '' : c.chmod.error}</p>
          <p class="t-hint" id="chmod-hint">{c.chmod.hint}</p>
        </div>

        <table class="t-table grid" aria-label={c.chmod.grid}>
          <thead>
            <tr>
              <td></td>
              {#each WHAT as what (what)}<th scope="col">{c.chmod.what[what]}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each WHO as who, i (who)}
              <tr>
                <th scope="row">{c.chmod.who[who]}</th>
                {#each WHAT as what, j (what)}
                  <td>
                    <input
                      type="checkbox"
                      aria-label={fill(c.chmod.cell, { who: c.chmod.who[who], what: c.chmod.what[what] })}
                      checked={!!(mode & bit(i, j))}
                      onchange={() => toggle(bit(i, j))}
                    />
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>

        <fieldset class="t-checks specials">
          <legend class="t-label">{c.chmod.special}</legend>
          {#each SPECIAL as special, i (special)}
            <label><input type="checkbox" checked={!!(mode & specialBit(i))} onchange={() => toggle(specialBit(i))} /> {c.chmod.specials[special]}</label>
          {/each}
        </fieldset>
      </div>
      <div class="t-col">
        <Output id="chmod-octal" label={c.chmod.octal} value={octal(mode)} />
        <Output id="chmod-symbolic" label={c.chmod.symbolic} value={symbolic(mode)} />
        <Output id="chmod-command" label={c.chmod.command} value={`chmod ${octal(mode)} file`} />
      </div>
    </div>
  {:else if pick === 'sizes'}
    <div class="t-tool">
      <div class="t-col">
        <div class="pair">
          <div class="t-field">
            <label class="t-label" for="sizes-amount">{c.sizes.value}</label>
            <input id="sizes-amount" class="t-input" class:t-bad={amount === null} type="number" min="0" step="any" bind:value={amount} />
          </div>
          <div class="t-field">
            <label class="t-label" for="sizes-unit">{c.sizes.unit}</label>
            <select id="sizes-unit" class="t-input" bind:value={unit}>
              {#each UNITS as option (option.id)}
                <option value={option.id}>{option.id}</option>
              {/each}
            </select>
          </div>
        </div>
        <p class="t-status" class:t-bad={amount === null} role="status" aria-live="polite">{amount === null ? c.sizes.error : ''}</p>
        <p class="t-hint">{c.sizes.hint}</p>
      </div>
      <div class="t-col">
        {#each FAMILIES as family (family)}
          {#if sizes.length}
            <section class="t-field" aria-labelledby="sizes-{family}">
              <h2 class="t-label" id="sizes-{family}">{c.sizes.families[family]}</h2>
              <dl class="t-kv" data-testid="sizes-{family}">
                {#each sizes.filter((row) => row.unit.family === family) as row (row.unit.id)}
                  <dt>{row.unit.id}</dt>
                  <dd>{show(row.value)}</dd>
                {/each}
              </dl>
            </section>
          {/if}
        {/each}
      </div>
    </div>
  {:else if pick === 'cidr'}
    <div class="t-tool">
      <div class="t-col">
        <div class="t-field">
          <label class="t-label" for="cidr-input">{c.cidr.input}</label>
          <input
            id="cidr-input"
            class="t-input"
            class:t-bad={!cidr.ok && cidr.error !== 'empty'}
            type="text"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-describedby="cidr-status cidr-hint"
            bind:value={network}
          />
          <p class="t-status" class:t-bad={!cidr.ok} id="cidr-status" role="status" aria-live="polite">{cidr.ok ? '' : c.cidr.errors[cidr.error]}</p>
          <p class="t-hint" id="cidr-hint">{c.cidr.hint}</p>
        </div>
      </div>
      <div class="t-col">
        {#if cidr.ok}
          <dl class="t-kv" data-testid="cidr-result">
            {#each CIDR_ROWS as name (name)}
              <dt>{c.cidr.names[name]}</dt>
              <dd>{name === 'network' ? `${cidr.network}/${cidr.prefix}` : cidr[name]}</dd>
            {/each}
            <dt>{c.cidr.names.kind}</dt>
            <dd>{c.cidr.kinds[cidr.kind]}</dd>
          </dl>
        {/if}
      </div>
    </div>
  {:else}
    <div class="t-tool">
      <div class="t-col">
        <div class="t-field">
          <label class="t-label" for="semver-range">{c.semver.range}</label>
          <input
            id="semver-range"
            class="t-input"
            class:t-bad={!rangeRead}
            type="text"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-describedby="semver-status semver-hint"
            bind:value={range}
          />
          <p class="t-status" class:t-bad={!rangeRead} id="semver-status" role="status" aria-live="polite">{rangeRead ? '' : c.semver.rangeError}</p>
          <p class="t-hint" id="semver-hint">{c.semver.rangeHint}</p>
        </div>
        <div class="t-field">
          <label class="t-label" for="semver-versions">{c.semver.versions}</label>
          <textarea
            id="semver-versions"
            class="t-input"
            rows="7"
            spellcheck="false"
            autocapitalize="off"
            aria-describedby="semver-versions-hint"
            bind:value={versions}></textarea>
          <p class="t-hint" id="semver-versions-hint">{c.semver.versionsHint}</p>
        </div>
      </div>
      <div class="t-col">
        {#if rangeRead}
          <Output id="semver-means" label={c.semver.means} value={describeRange(rangeRead)} />
          {#if tried.length}
            <section class="t-field" aria-labelledby="semver-results">
              <h2 class="t-label" id="semver-results">{c.semver.results}</h2>
              <dl class="t-kv" data-testid="semver-results">
                {#each tried as item, i (i)}
                  <dt>{item.line}</dt>
                  <dd class:t-good={item.verdict === 'yes'} class:t-bad={item.verdict === 'invalid'}>{c.semver[item.verdict]}</dd>
                {/each}
              </dl>
            </section>
          {/if}
          <p class="t-hint">{c.semver.prerelease}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .grid th,
  .grid td {
    text-align: center;
    vertical-align: middle;
  }
  .grid tbody th {
    text-align: left;
    font-size: 0.85rem;
    color: var(--text);
  }
  .grid input,
  .specials input {
    accent-color: var(--accent);
  }
  .specials {
    display: grid;
  }
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 0.75rem;
  }
  dd.t-bad {
    color: var(--syn-num);
  }
</style>
