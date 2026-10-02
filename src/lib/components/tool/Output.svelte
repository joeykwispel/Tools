<script lang="ts">
  import CopyButton from './CopyButton.svelte';

  /**
   * A labelled block of output with a copy button. `id` names the heading, so it must be unique on the page;
   * the block itself can be found in tests as [data-testid="<id>"].
   */
  let { id, label, value, copy = true }: { id: string; label: string; value: string; copy?: boolean } = $props();
</script>

<section class="t-field" aria-labelledby={id}>
  <div class="t-row">
    <h2 class="t-label" {id}>{label}</h2>
    {#if copy && value}<CopyButton text={value} />{/if}
  </div>
  <pre class="t-box mono" data-testid={id}>{value}</pre>
</section>
