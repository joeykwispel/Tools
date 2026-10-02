<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { t } from '$lib/locales';

  /** Copies `text` to the clipboard and says so for a moment. `label` replaces the word "Copy". */
  let { text, label }: { text: string; label?: string } = $props();
  const c = $derived(t(app.locale).tools);
  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* clipboard not available: the text can still be selected by hand */
    }
  }
</script>

<button type="button" class="t-small" onclick={copy}>
  <span aria-live="polite">{copied ? c.copied : (label ?? c.copy)}</span>
</button>
