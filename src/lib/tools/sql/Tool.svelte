<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { format, type Options } from './logic';
  import text_ from './text';

  const SAMPLE =
    "select u.id, u.name, count(o.id) as orders, sum(o.total) as revenue from users u left join orders o on o.user_id = u.id and o.status = 'paid' where u.created_at between '2026-01-01' and '2026-12-31' and (u.country = 'NL' or u.country = 'BE') group by u.id, u.name having count(o.id) > 3 order by revenue desc limit 20;";

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let keywords = $state<NonNullable<Options['keywords']>>('upper');
  let width = $state(2);

  const output = $derived(format(input, { keywords, indent: ' '.repeat(width) }));
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="sql-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="sql-input"
        class="t-input"
        rows="12"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="sql-hint"
        bind:value={input}></textarea>
      <p class="t-hint" id="sql-hint">{c.hint}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.keywords}</legend>
      <label><input type="radio" name="sql-keywords" value="upper" bind:group={keywords} /> {c.upper}</label>
      <label><input type="radio" name="sql-keywords" value="lower" bind:group={keywords} /> {c.lower}</label>
      <label><input type="radio" name="sql-keywords" value="keep" bind:group={keywords} /> {c.keep}</label>
    </fieldset>
    <fieldset class="t-checks">
      <legend class="t-label">{c.indent}</legend>
      <label><input type="radio" name="sql-indent" value={2} bind:group={width} /> {c.two}</label>
      <label><input type="radio" name="sql-indent" value={4} bind:group={width} /> {c.four}</label>
    </fieldset>
  </div>

  <div class="t-col">
    <Output id="sql-output" label={c.result} value={output} />
  </div>
</div>
