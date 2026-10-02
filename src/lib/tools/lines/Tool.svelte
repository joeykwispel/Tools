<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { split, transform, type Order } from './logic';
  import text_ from './text';

  const SAMPLE = `  pear
apple

Banana
apple
  cherry
item 10
item 2
pear  `;
  const ORDERS: Order[] = ['none', 'ascending', 'descending', 'length', 'reverse'];

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let trim = $state(true);
  let removeEmpty = $state(true);
  let unique = $state(true);
  let ignoreCase = $state(false);
  let order = $state<Order>('ascending');
  let number = $state(false);

  const lines = $derived(transform(input, { trim, removeEmpty, unique, ignoreCase, order, number }));
  const before = $derived(split(input).length);
  const status = $derived(before ? fill(lines.length === 1 ? c.summaryOne : c.summary, { before: String(before), after: String(lines.length) }) : '');
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="lines-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea id="lines-input" class="t-input" rows="11" spellcheck="false" autocapitalize="off" aria-describedby="lines-status" bind:value={input}
      ></textarea>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.clean}</legend>
      <label><input type="checkbox" bind:checked={trim} /> {c.trim}</label>
      <label><input type="checkbox" bind:checked={removeEmpty} /> {c.removeEmpty}</label>
      <label><input type="checkbox" bind:checked={unique} /> {c.unique}</label>
      <label><input type="checkbox" bind:checked={ignoreCase} /> {c.ignoreCase}</label>
    </fieldset>

    <fieldset class="t-checks">
      <legend class="t-label">{c.order}</legend>
      {#each ORDERS as option (option)}
        <label><input type="radio" name="lines-order" value={option} bind:group={order} /> {c[option]}</label>
      {/each}
    </fieldset>

    <div class="t-checks">
      <label><input type="checkbox" bind:checked={number} /> {c.number}</label>
    </div>
  </div>

  <div class="t-col">
    <Output id="lines-output" label={c.result} value={lines.join('\n')} />
    <p class="t-status" id="lines-status" role="status" aria-live="polite">{status}</p>
  </div>
</div>
