<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { encodeBytes } from '../base64/logic';
  import { size } from '../hash/logic';
  import {
    FORMATS,
    ICONS,
    ICO_SIZES,
    MAX_SIDE,
    contain,
    headHtml,
    ico,
    manifest,
    proportional,
    rename,
    steps,
    validSide,
    zip,
    type Box,
    type FileEntry,
    type Format
  } from './logic';
  import text_ from './text';

  /** The whole image is held in memory, more than once while it is drawn. */
  const MAX_FILE = 50_000_000;
  /** When an SVG does not say how large it is. */
  const SVG_SIDE = 512;

  interface Source {
    name: string;
    width: number;
    height: number;
    /** The size of the file */
    bytes: number;
    /** The text of an SVG: it is drawn sharp at any size, and goes into a favicon set as it is */
    svg: string | null;
    image: CanvasImageSource;
  }
  interface IconSet {
    files: FileEntry[];
    previews: { size: number; url: string }[];
  }

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let source = $state.raw<Source | null>(null);
  let error = $state('');
  let make = $state<'resize' | 'favicons'>('resize');
  let width = $state(0);
  let height = $state(0);
  let locked = $state(true);
  let format = $state<Format>('image/png');
  let quality = $state(85);
  let background = $state('#ffffff');
  let canvas = $state<HTMLCanvasElement>();
  let made = $state.raw<{ blob: Blob; width: number; height: number } | null>(null);
  let icons = $state.raw<IconSet | null>(null);

  const sidesOk = $derived(validSide(width) && validSide(height));
  const lossy = $derived(format !== 'image/png');

  function surface(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const made = document.createElement('canvas');
    [made.width, made.height] = [w, h];
    const context = made.getContext('2d');
    if (!context) throw new Error('This browser has no canvas to draw on.');
    return [made, context];
  }

  /** Draws the image into `box`. Pixels are scaled down in halves first; an SVG is drawn at the size asked for. */
  function paint(context: CanvasRenderingContext2D, from: Source, box: Box) {
    let image = from.image;
    if (!from.svg) {
      const [across, down] = [steps(from.width, box.width), steps(from.height, box.height)];
      for (let i = 0; i < Math.min(across.length, down.length); i++) {
        const [half, halfContext] = surface(across[i], down[i]);
        halfContext.imageSmoothingQuality = 'high';
        halfContext.drawImage(image, 0, 0, across[i], down[i]);
        image = half;
      }
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, box.x, box.y, box.width, box.height);
  }

  const toBlob = (from: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob | null>((resolve) => from.toBlob(resolve, type, q));

  async function read(file: File): Promise<Source> {
    const base = { name: file.name, bytes: file.size };
    if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
      const svg = await file.text();
      const image = new Image();
      image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      await image.decode();
      return { ...base, width: image.naturalWidth || SVG_SIDE, height: image.naturalHeight || SVG_SIDE, svg, image };
    }
    const image = await createImageBitmap(file);
    return { ...base, width: image.width, height: image.height, svg: null, image };
  }

  function use(next: Source) {
    source = next;
    error = '';
    [width, height] = [next.width, next.height];
  }

  async function pick(e: Event) {
    const picked = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!picked) return;
    if (picked.size > MAX_FILE) {
      error = fill(c.fileTooLarge, { name: picked.name, size: size(picked.size), max: size(MAX_FILE) });
      return;
    }
    try {
      use(await read(picked));
    } catch {
      error = fill(c.unreadable, { name: picked.name });
    }
  }

  /** A picture drawn here, to try the tool without a file at hand: a sun over hills. */
  async function sample() {
    const [drawn, context] = surface(1200, 800);
    const sky = context.createLinearGradient(0, 0, 0, 800);
    sky.addColorStop(0, '#3b6fd4');
    sky.addColorStop(1, '#f6c343');
    context.fillStyle = sky;
    context.fillRect(0, 0, 1200, 800);
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.arc(840, 300, 110, 0, Math.PI * 2);
    context.fill();
    for (const [colour, top, shift] of [
      ['#2f7d5b', 560, 0],
      ['#1f5a44', 640, 300]
    ] as const) {
      context.fillStyle = colour;
      context.beginPath();
      context.moveTo(0, 800);
      for (let x = 0; x <= 1200; x += 20) context.lineTo(x, top + Math.sin((x + shift) / 190) * 60);
      context.lineTo(1200, 800);
      context.fill();
    }
    const blob = await toBlob(drawn, 'image/png');
    use({ name: c.sampleName, width: 1200, height: 800, bytes: blob?.size ?? 0, svg: null, image: drawn });
  }

  function setSide(which: 'width' | 'height', value: number) {
    if (which === 'width') width = value;
    else height = value;
    if (!locked || !source || !validSide(value)) return;
    if (which === 'width') height = proportional(value, source.width, source.height);
    else width = proportional(value, source.height, source.width);
  }

  // the image at the size asked for: drawn on the canvas on the page, and written as a file to know how large it is
  $effect(() => {
    const [from, target, w, h, type, q] = [source, canvas, width, height, format, quality];
    if (!from || !target || !validSide(w) || !validSide(h)) {
      made = null;
      return;
    }
    [target.width, target.height] = [w, h];
    const context = target.getContext('2d');
    if (!context) return;
    if (type === 'image/jpeg') {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, w, h);
    }
    paint(context, from, { x: 0, y: 0, width: w, height: h });
    let stale = false;
    void toBlob(target, type, q / 100).then((blob) => {
      if (!stale && blob) made = { blob, width: w, height: h };
    });
    return () => {
      stale = true;
    };
  });

  /** One square PNG of the image, on `colour` when it may not be transparent. */
  async function png(from: Source, side: number, colour?: string): Promise<Uint8Array> {
    const [drawn, context] = surface(side, side);
    if (colour) {
      context.fillStyle = colour;
      context.fillRect(0, 0, side, side);
    }
    paint(context, from, contain(from.width, from.height, side));
    const blob = await toBlob(drawn, 'image/png');
    if (!blob) throw new Error('The icon could not be written.');
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function favicons(from: Source, colour: string): Promise<IconSet> {
    const encoder = new TextEncoder();
    const small = await Promise.all(ICO_SIZES.map((side) => png(from, side)));
    const large = await Promise.all(ICONS.map((icon) => png(from, icon.size, icon.opaque ? colour : undefined)));
    const preview = (side: number, bytes: Uint8Array) => ({ size: side, url: `data:image/png;base64,${encodeBytes(bytes)}` });
    return {
      files: [
        { name: 'favicon.ico', bytes: ico(small) },
        ...(from.svg ? [{ name: 'icon.svg', bytes: encoder.encode(from.svg) }] : []),
        ...ICONS.map((icon, i) => ({ name: icon.name, bytes: large[i] })),
        { name: 'site.webmanifest', bytes: encoder.encode(manifest()) }
      ],
      previews: [...ICO_SIZES.map((side, i) => preview(side, small[i])), preview(ICONS[0].size, large[0])]
    };
  }

  $effect(() => {
    const [from, colour] = [source, background];
    if (!from || make !== 'favicons') {
      icons = null;
      return;
    }
    let stale = false;
    void favicons(from, colour).then((set) => {
      if (!stale) icons = set;
    });
    return () => {
      stale = true;
    };
  });

  /** What a file of the set is, next to its name. */
  function about(name: string): string {
    const icon = ICONS.find((known) => known.name === name);
    return icon ? fill(c.px, { size: String(icon.size) }) : c.fileSizes[name as keyof typeof c.fileSizes];
  }

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="image-file">{c.file}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={sample}>{common.sample}</button>
        </div>
      </div>
      <input id="image-file" class="t-input" type="file" accept="image/*,.svg" onchange={pick} aria-describedby="image-status image-file-hint" />
      <p class="t-status" class:t-bad={!!error} id="image-status" role="status" aria-live="polite">
        {#if error}{error}
        {:else if source}{fill(c.source, {
            name: source.name,
            width: String(source.width),
            height: String(source.height),
            size: size(source.bytes)
          })}
        {:else}{c.none}{/if}
      </p>
      <p class="t-hint" id="image-file-hint">{fill(c.fileHint, { max: size(MAX_FILE) })}</p>
    </div>

    <fieldset class="t-checks">
      <legend class="t-label">{c.make}</legend>
      <label><input type="radio" name="image-make" value="resize" bind:group={make} /> {c.makes.resize}</label>
      <label><input type="radio" name="image-make" value="favicons" bind:group={make} /> {c.makes.favicons}</label>
    </fieldset>

    {#if make === 'resize'}
      <div class="sides">
        <div class="t-field">
          <label class="t-label" for="image-width">{c.width}</label>
          <input
            id="image-width"
            class="t-input"
            class:t-bad={!validSide(width)}
            type="number"
            min="1"
            max={MAX_SIDE}
            step="1"
            disabled={!source}
            aria-invalid={!!source && !sidesOk}
            value={width}
            oninput={(e) => setSide('width', e.currentTarget.valueAsNumber)}
          />
        </div>
        <div class="t-field">
          <label class="t-label" for="image-height">{c.height}</label>
          <input
            id="image-height"
            class="t-input"
            class:t-bad={!validSide(height)}
            type="number"
            min="1"
            max={MAX_SIDE}
            step="1"
            disabled={!source}
            aria-invalid={!!source && !sidesOk}
            value={height}
            oninput={(e) => setSide('height', e.currentTarget.valueAsNumber)}
          />
        </div>
      </div>
      {#if source && !sidesOk}<p class="t-hint t-bad" role="alert">{fill(c.sideError, { max: String(MAX_SIDE) })}</p>{/if}
      <div class="t-checks">
        <label>
          <input
            type="checkbox"
            bind:checked={locked}
            onchange={() => {
              if (locked) setSide('width', width);
            }}
          />
          {c.lock}
        </label>
      </div>

      <fieldset class="t-checks">
        <legend class="t-label">{c.format}</legend>
        {#each FORMATS as option (option)}
          <label><input type="radio" name="image-format" value={option} bind:group={format} /> {c.formats[option]}</label>
        {/each}
      </fieldset>
      {#if lossy}
        <div class="t-field">
          <div class="t-row">
            <label class="t-label" for="image-quality">{c.quality}</label>
            <span class="t-hint mono">{fill(c.qualityValue, { quality: String(quality) })}</span>
          </div>
          <input id="image-quality" class="t-range" type="range" min="10" max="100" step="5" bind:value={quality} />
          {#if format === 'image/jpeg'}<p class="t-hint">{c.jpegHint}</p>{/if}
        </div>
      {/if}
    {:else}
      <div class="t-field">
        <label class="t-label" for="image-background">{c.background}</label>
        <input id="image-background" class="picker" type="color" aria-describedby="image-background-hint" bind:value={background} />
        <p class="t-hint" id="image-background-hint">{c.backgroundHint}</p>
      </div>
      {#if source && source.width !== source.height}<p class="t-hint">{c.notSquare}</p>{/if}
    {/if}
  </div>

  <div class="t-col">
    {#if source && make === 'resize'}
      <section class="t-field" aria-labelledby="image-result">
        <h2 class="t-label" id="image-result">{c.result}</h2>
        <div role="img" aria-label={fill(c.resultAlt, { width: String(width), height: String(height) })}>
          <canvas bind:this={canvas} class="chequered" class:hidden={!sidesOk} data-testid="image-canvas"></canvas>
        </div>
        <p class="t-status" data-testid="image-made" aria-live="polite">
          {#if made}{fill(c.resultStatus, {
              name: rename(source.name, made.width, made.height, made.blob.type),
              width: String(made.width),
              height: String(made.height),
              size: size(made.blob.size),
              percent: source.bytes ? String(Math.round((made.blob.size / source.bytes) * 100)) : '100'
            })}{/if}
        </p>
        <div class="t-actions">
          <button
            type="button"
            class="t-small"
            disabled={!made}
            onclick={() => made && source && download(made.blob, rename(source.name, made.width, made.height, made.blob.type))}>{common.download}</button
          >
        </div>
      </section>
    {:else if source && icons}
      <section class="t-field" aria-labelledby="image-preview">
        <h2 class="t-label" id="image-preview">{c.preview}</h2>
        <div class="previews chequered">
          {#each icons.previews as preview (preview.size)}
            <img
              src={preview.url}
              width={Math.min(preview.size, 90)}
              height={Math.min(preview.size, 90)}
              alt={fill(c.previewAlt, { size: String(preview.size) })}
            />
          {/each}
        </div>
      </section>

      <section class="t-field" aria-labelledby="image-files">
        <h2 class="t-label" id="image-files">{c.files}</h2>
        <table class="t-table" data-testid="image-files">
          <tbody>
            {#each icons.files as file (file.name)}
              <tr>
                <th scope="row">{file.name}</th>
                <td>{about(file.name)}</td>
                <td class="bytes">{size(file.bytes.length)}</td>
                <td class="action">
                  <button
                    type="button"
                    class="t-small"
                    aria-label={`${common.download} ${file.name}`}
                    onclick={() => download(new Blob([file.bytes.slice()]), file.name)}>{common.download}</button
                  >
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => icons && download(new Blob([zip(icons.files).slice()], { type: 'application/zip' }), c.zipName)}
            >{c.all}</button
          >
        </div>
      </section>

      <Output id="image-head" label={c.head} value={headHtml(!!source.svg)} />
      <p class="t-hint">{c.place}</p>
    {/if}
  </div>
</div>

<style>
  .sides {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .picker {
    width: 2.6rem;
    height: 2.6rem;
    padding: 0.2rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    cursor: pointer;
  }
  /* a light chequered surface in both themes: it shows what is transparent */
  .chequered {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: repeating-conic-gradient(#e6e8ee 0 25%, #fff 0 50%) 0 0 / 1rem 1rem;
  }
  canvas {
    display: block;
    max-width: 100%;
    max-height: 26rem;
  }
  canvas.hidden {
    display: none;
  }
  .previews {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem;
  }
  .previews img {
    display: block;
  }
  tbody th {
    font-size: 0.85rem;
    color: var(--text);
  }
  .bytes,
  .action {
    white-space: nowrap;
  }
  .action {
    width: 1%;
    text-align: right;
  }
</style>
