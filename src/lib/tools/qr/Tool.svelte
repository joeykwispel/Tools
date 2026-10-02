<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import { MARGIN, make, path, toSvg, wifi, type Level, type Wifi } from './logic';
  import text_ from './text';

  const LEVELS: Level[] = ['L', 'M', 'Q', 'H'];
  const SECURITIES: Wifi['security'][] = ['WPA', 'WEP', 'nopass'];
  /** The PNG is this many pixels per square: sharp enough to print. */
  const PNG_SCALE = 16;

  const c = $derived(text_[app.locale]);

  let kind = $state<'text' | 'wifi'>('text');
  let text = $state('https://tools.joeyoosenbrug.nl/');
  let ssid = $state('');
  let password = $state('');
  let security = $state<Wifi['security']>('WPA');
  let hidden = $state(false);
  let level = $state<Level>('M');

  const content = $derived(kind === 'text' ? text : ssid ? wifi({ ssid, password, security, hidden }) : '');
  const made = $derived(make(content, level));
  const status = $derived(
    made.ok ? fill(c.size, { version: String(made.version), size: String(made.matrix.length) }) : made.error === 'empty' ? c.empty : c.tooLong
  );
  /** What the picture is of, for someone who can not see it. A Wi-Fi password is not read out. */
  const described = $derived(kind === 'text' ? text : ssid);

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadSvg() {
    if (made.ok) download(new Blob([toSvg(made.matrix)], { type: 'image/svg+xml' }), 'qr-code.svg');
  }

  function downloadPng() {
    if (!made.ok) return;
    const size = (made.matrix.length + MARGIN * 2) * PNG_SCALE;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    context.fillStyle = '#000';
    made.matrix.forEach((row, y) =>
      row.forEach((dark, x) => dark && context.fillRect((x + MARGIN) * PNG_SCALE, (y + MARGIN) * PNG_SCALE, PNG_SCALE, PNG_SCALE))
    );
    canvas.toBlob((blob) => blob && download(blob, 'qr-code.png'), 'image/png');
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <fieldset class="t-checks">
      <legend class="t-label">{c.kind}</legend>
      <label><input type="radio" name="qr-kind" value="text" bind:group={kind} /> {c.text}</label>
      <label><input type="radio" name="qr-kind" value="wifi" bind:group={kind} /> {c.wifi}</label>
    </fieldset>

    {#if kind === 'text'}
      <div class="t-field">
        <label class="t-label" for="qr-text">{c.content}</label>
        <textarea id="qr-text" class="t-input" rows="5" spellcheck="false" autocapitalize="off" bind:value={text}></textarea>
      </div>
    {:else}
      <div class="t-field">
        <label class="t-label" for="qr-ssid">{c.ssid}</label>
        <input id="qr-ssid" class="t-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" bind:value={ssid} />
      </div>
      <fieldset class="t-checks">
        <legend class="t-label">{c.security}</legend>
        {#each SECURITIES as option (option)}
          <label><input type="radio" name="qr-security" value={option} bind:group={security} /> {c.securities[option]}</label>
        {/each}
      </fieldset>
      {#if security !== 'nopass'}
        <div class="t-field">
          <label class="t-label" for="qr-password">{c.password}</label>
          <input id="qr-password" class="t-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" bind:value={password} />
        </div>
      {/if}
      <div class="t-checks">
        <label><input type="checkbox" bind:checked={hidden} /> {c.hidden}</label>
      </div>
    {/if}

    <fieldset class="t-checks">
      <legend class="t-label">{c.level}</legend>
      {#each LEVELS as option (option)}
        <label><input type="radio" name="qr-level" value={option} bind:group={level} /> {c.levels[option]}</label>
      {/each}
    </fieldset>
    <p class="t-hint">{c.levelHint}</p>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="qr-code">
      <h2 class="t-label" id="qr-code">{c.code}</h2>
      {#if made.ok}
        {@const size = made.matrix.length + MARGIN * 2}
        <!-- dark on white, whatever the theme: that is what a scanner reads -->
        <svg
          class="code"
          viewBox="0 0 {size} {size}"
          shape-rendering="crispEdges"
          role="img"
          aria-label={fill(c.alt, { text: described })}
          data-testid="qr-code"
        >
          <rect width={size} height={size} fill="#fff" />
          <path d={path(made.matrix)} fill="#000" />
        </svg>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={downloadSvg}>{c.svg}</button>
          <button type="button" class="t-small" onclick={downloadPng}>{c.png}</button>
        </div>
      {/if}
      <p class="t-status" class:t-bad={!made.ok && made.error === 'tooLong'} role="status" aria-live="polite">{status}</p>
      <p class="t-hint">{c.hint}</p>
    </section>
  </div>
</div>

<style>
  .code {
    width: min(100%, 320px);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
</style>
