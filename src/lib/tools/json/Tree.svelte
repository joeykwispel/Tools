<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import { size, type Node } from './logic';
  import Tree from './Tree.svelte';
  import text_ from './text';

  /** One value of the document, with everything under it. Objects and arrays fold open and closed. */
  let { node, name = '', depth = 0 }: { node: Node; name?: string; depth?: number } = $props();

  /** A long array or object shows this many values, and says how many it left out. */
  const SHOWN = 100;
  const c = $derived(text_[app.locale]);

  const children = $derived(
    node.type === 'object'
      ? node.entries.map((e) => ({ name: e.rawKey, node: e.value }))
      : node.type === 'array'
        ? node.items.map((item, i) => ({ name: String(i), node: item }))
        : []
  );
  const count = $derived(size(node));
  const summary = $derived(
    node.type === 'object' ? (count === 1 ? c.key : fill(c.keys, { count: String(count) })) : count === 1 ? c.item : fill(c.items, { count: String(count) })
  );
</script>

{#if node.type === 'object' || node.type === 'array'}
  <details open={depth < 2}>
    <summary>
      {#if name}<span class="prop">{name}</span><span class="punc colon">:</span>{/if}<span class="punc">{node.type === 'object' ? '{…}' : '[…]'}</span>
      <span class="count">{summary}</span>
    </summary>
    <ul>
      {#each children.slice(0, SHOWN) as child, i (i)}
        <li><Tree node={child.node} name={child.name} depth={depth + 1} /></li>
      {/each}
      {#if children.length > SHOWN}<li class="count">{fill(c.more, { count: String(children.length - SHOWN) })}</li>{/if}
    </ul>
  </details>
{:else}
  <span class="leaf">
    {#if name}<span class="prop">{name}</span><span class="punc colon">:</span>{/if}
    {#if node.type === 'string'}<span class="str">{node.raw}</span>
    {:else if node.type === 'number'}<span class="num-t">{node.raw}</span>
    {:else if node.type === 'boolean'}<span class="kw">{node.value}</span>
    {:else}<span class="kw">null</span>{/if}
  </span>
{/if}

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0 0 0 1.1rem;
    border-left: 1px solid var(--border);
  }
  li {
    padding-block: 0.1rem;
  }
  summary {
    cursor: pointer;
    border-radius: 4px;
  }
  .leaf {
    /* in line with the text of a summary, which has its marker in front */
    display: inline-block;
    padding-left: 1rem;
    overflow-wrap: anywhere;
  }
  /* the space after a key's colon, as a margin: whitespace between the two spans would be dropped */
  .colon {
    margin-right: 0.45em;
  }
  .count {
    margin-left: 0.4rem;
    color: var(--muted);
    font-size: 0.75rem;
  }
</style>
