<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { describeKey, keyCheck, physical, ratioText, report, size, type KeyInfo, type Size } from './logic';
  import text_ from './text';

  /** What is read from the browser, as it is at this moment. */
  interface Info {
    viewport: Size;
    ratio: number;
    screen: Size;
    available: Size;
    orientation: string;
    depth: number;
    pointer: 'fine' | 'coarse' | 'none';
    hover: boolean;
    touch: number;
    scheme: 'dark' | 'light';
    motion: boolean;
    contrast: 'more' | 'less' | 'custom' | 'none';
    forced: boolean;
    languages: string[];
    timeZone: string;
    cookies: boolean;
    online: boolean;
    cores: number | null;
    memory: number | null;
    userAgent: string;
  }

  /** The media queries that are asked, so a change of any of them is noticed. */
  const QUERIES = [
    '(pointer: fine)',
    '(pointer: coarse)',
    '(hover: hover)',
    '(prefers-color-scheme: dark)',
    '(prefers-reduced-motion: reduce)',
    '(prefers-contrast: more)',
    '(prefers-contrast: less)',
    '(prefers-contrast: custom)',
    '(forced-colors: active)'
  ] as const;

  const c = $derived(text_[app.locale]);

  /** Null until the page runs in a browser: there is nothing to read while it is built. */
  let info = $state.raw<Info | null>(null);
  let pressed = $state.raw<(KeyInfo & { check: string }) | null>(null);

  function read(): Info {
    const is = (query: (typeof QUERIES)[number]) => matchMedia(query).matches;
    return {
      viewport: [innerWidth, innerHeight],
      ratio: devicePixelRatio,
      screen: [screen.width, screen.height],
      available: [screen.availWidth, screen.availHeight],
      orientation: screen.orientation?.type ?? '',
      depth: screen.colorDepth,
      pointer: is('(pointer: fine)') ? 'fine' : is('(pointer: coarse)') ? 'coarse' : 'none',
      hover: is('(hover: hover)'),
      touch: navigator.maxTouchPoints,
      scheme: is('(prefers-color-scheme: dark)') ? 'dark' : 'light',
      motion: is('(prefers-reduced-motion: reduce)'),
      contrast: is('(prefers-contrast: more)') ? 'more' : is('(prefers-contrast: less)') ? 'less' : is('(prefers-contrast: custom)') ? 'custom' : 'none',
      forced: is('(forced-colors: active)'),
      languages: [...navigator.languages],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookies: navigator.cookieEnabled,
      online: navigator.onLine,
      cores: navigator.hardwareConcurrency ?? null,
      // only some browsers say, and rounded so it can not be used to tell people apart
      memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      userAgent: navigator.userAgent
    };
  }

  $effect(() => {
    const update = () => (info = read());
    update();
    const queries = QUERIES.map((query) => matchMedia(query));
    const events = ['resize', 'online', 'offline', 'languagechange'] as const;
    for (const query of queries) query.addEventListener('change', update);
    for (const event of events) addEventListener(event, update);
    screen.orientation?.addEventListener('change', update);
    return () => {
      for (const query of queries) query.removeEventListener('change', update);
      for (const event of events) removeEventListener(event, update);
      screen.orientation?.removeEventListener('change', update);
    };
  });

  const yesNo = (value: boolean) => (value ? c.yes : c.no);
  const px = (value: Size) => fill(c.px, { size: size(value) });

  const screenRows = $derived<[string, string][]>(
    info
      ? [
          [c.names.viewport, px(info.viewport)],
          [c.names.ratio, ratioText(info.ratio)],
          [c.names.devicePixels, px(physical(info.viewport, info.ratio))],
          [c.names.screen, px(info.screen)],
          [c.names.available, px(info.available)],
          [c.names.orientation, info.orientation],
          [c.names.depth, fill(c.bit, { bits: String(info.depth) })],
          [c.names.pointer, c.pointers[info.pointer]],
          [c.names.hover, yesNo(info.hover)],
          [c.names.touch, String(info.touch)]
        ]
      : []
  );
  const preferenceRows = $derived<[string, string][]>(
    info
      ? [
          [c.names.scheme, c.schemes[info.scheme]],
          [c.names.motion, yesNo(info.motion)],
          [c.names.contrast, c.contrasts[info.contrast]],
          [c.names.forced, yesNo(info.forced)],
          [c.names.languages, info.languages.join(', ')],
          [c.names.timeZone, info.timeZone]
        ]
      : []
  );
  const browserRows = $derived<[string, string][]>(
    info
      ? [
          [c.names.userAgent, info.userAgent],
          [c.names.cookies, info.cookies ? c.on : c.off],
          [c.names.online, yesNo(info.online)],
          [c.names.cores, info.cores === null ? '' : String(info.cores)],
          [c.names.memory, info.memory === null ? '' : fill(c.gb, { gb: String(info.memory) })]
        ]
      : []
  );
  const sections = $derived([
    { id: 'browser-screen', title: c.screen, rows: screenRows },
    { id: 'browser-preferences', title: c.preferences, rows: preferenceRows }
  ]);

  function keydown(event: KeyboardEvent) {
    pressed = { ...describeKey(event), check: keyCheck(event) };
    // Tab still leaves the field, and shortcuts of the browser keep working; everything else is only shown
    if (event.key !== 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault();
  }
</script>

<div class="t-tool">
  <div class="t-col">
    {#if !info}<p class="t-status" role="status">{c.loading}</p>{/if}
    {#each sections as section (section.id)}
      {#if section.rows.length}
        <section class="t-field" aria-labelledby={section.id}>
          <h2 class="t-label" id={section.id}>{section.title}</h2>
          <dl class="t-kv" data-testid={section.id}>
            {#each section.rows.filter(([, value]) => value) as [name, value] (name)}
              <dt>{name}</dt>
              <dd>{value}</dd>
            {/each}
          </dl>
        </section>
      {/if}
    {/each}
    {#if info}<p class="t-hint">{c.hint}</p>{/if}
  </div>

  <div class="t-col">
    {#if browserRows.length}
      <section class="t-field" aria-labelledby="browser-browser">
        <h2 class="t-label" id="browser-browser">{c.browser}</h2>
        <dl class="t-kv" data-testid="browser-browser">
          {#each browserRows.filter(([, value]) => value) as [name, value] (name)}
            <dt>{name}</dt>
            <dd>{value}</dd>
          {/each}
        </dl>
      </section>
    {/if}

    <div class="t-field">
      <label class="t-label" for="browser-key">{c.key}</label>
      <input
        id="browser-key"
        class="t-input"
        type="text"
        placeholder={c.keyPlaceholder}
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-describedby="browser-key-hint"
        value=""
        onkeydown={keydown}
      />
      <p class="t-hint" id="browser-key-hint">{c.keyHint}</p>
      {#if pressed}
        <dl class="t-kv" data-testid="browser-key-result" aria-live="polite">
          <dt>{c.keyNames.key}</dt>
          <dd>{pressed.key}</dd>
          <dt>{c.keyNames.code}</dt>
          <dd>{pressed.code}</dd>
          <dt>{c.keyNames.keyCode}</dt>
          <dd>{pressed.keyCode}</dd>
          <dt>{c.keyNames.location}</dt>
          <dd>{c.locations[pressed.location]}</dd>
          <dt>{c.keyNames.modifiers}</dt>
          <dd>{pressed.modifiers.join(' + ') || c.noModifiers}</dd>
          <dt>{c.keyNames.repeat}</dt>
          <dd>{yesNo(pressed.repeat)}</dd>
          <dt>{c.keyNames.check}</dt>
          <dd>{pressed.check}</dd>
        </dl>
      {/if}
    </div>

    {#if info}<Output id="browser-report" label={c.report} value={report([...screenRows, ...preferenceRows, ...browserRows])} />{/if}
  </div>
</div>
