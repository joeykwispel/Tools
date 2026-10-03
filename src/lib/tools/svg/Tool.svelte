<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill, t } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { size } from '../hash/logic';
  import { explain } from '../xml/message';
  import { DEFAULTS, bytes, dataUri, optimise, saved, type Options } from './logic';
  import text_ from './text';

  /** What an editor saves: comments, metadata, a layer that was left empty and far more decimals than a screen has pixels. */
  const SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape (http://www.inkscape.org/) -->
<svg
   xmlns="http://www.w3.org/2000/svg"
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   width="96.000000"
   height="96.000000"
   viewBox="0 0 96.000000 96.000000"
   inkscape:version="1.3.2"
   sodipodi:docname="sun.svg">
  <title>Sun</title>
  <metadata>
    <rdf:RDF>
      <rdf:Description dc:format="image/svg+xml" />
    </rdf:RDF>
  </metadata>
  <sodipodi:namedview inkscape:zoom="5.6568542" inkscape:cx="48.083261" />
  <g inkscape:label="Guides" inkscape:groupmode="layer">
  </g>
  <g inkscape:label="Sun" inkscape:groupmode="layer" fill="none" stroke="#e8a317" stroke-width="6.0000000" stroke-linecap="round">
    <circle cx="48.000000" cy="48.000000" r="18.000000" fill="#f6c343" />
    <path d="M 48.000000,8.0000000 V 18.000000 M 48.000000,78.000000 V 88.000000 M 8.0000000,48.000000 H 18.000000 M 78.000000,48.000000 H 88.000000 M 19.715729,19.715729 26.786797,26.786797 M 69.213203,69.213203 76.284271,76.284271 M 19.715729,76.284271 26.786797,69.213203 M 69.213203,26.786797 76.284271,19.715729" />
  </g>
</svg>
`;
  /** The result is put on the page as text; an SVG beyond this is a photograph in disguise. */
  const MAX_FILE = 2_000_000;
  const REMOVALS = ['comments', 'metadata', 'editor', 'empty', 'oneLine'] as const;
  const PRECISIONS = ['keep', 3, 2, 1, 0] as const;

  const c = $derived(text_[app.locale]);
  const common = $derived(t(app.locale).tools);

  let input = $state(SAMPLE);
  let options = $state<Options>({ ...DEFAULTS });
  let base64 = $state(false);
  let fileError = $state('');

  const result = $derived(optimise(input, options));
  const empty = $derived(!result.ok && result.reason === 'xml' && result.error.kind === 'empty');
  const status = $derived.by(() => {
    if (!result.ok) return result.reason === 'xml' ? explain(result.error, app.locale) : fill(c.notSvg, { name: result.name });
    const [before, after] = [bytes(input), bytes(result.svg)];
    const percent = saved(before, after);
    return fill(after < before ? c.smaller : c.same, { before: size(before), after: size(after), percent: percent < 1 ? '<1' : String(percent) });
  });
  const uri = $derived(result.ok ? dataUri(result.after, base64) : '');

  async function pick(e: Event) {
    const picked = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!picked) return;
    if (picked.size > MAX_FILE) {
      fileError = fill(c.fileTooLarge, { name: picked.name, size: size(picked.size), max: size(MAX_FILE) });
      return;
    }
    fileError = '';
    input = await picked.text();
  }

  function download() {
    if (!result.ok) return;
    const url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = c.downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="svg-input">{c.input}</label>
        <div class="t-actions">
          <button type="button" class="t-small" onclick={() => (input = SAMPLE)}>{common.sample}</button>
          <button type="button" class="t-small" onclick={() => (input = '')}>{common.clear}</button>
        </div>
      </div>
      <textarea
        id="svg-input"
        class="t-input"
        class:t-bad={!result.ok && !empty}
        rows="12"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-describedby="svg-status"
        bind:value={input}></textarea>
      <p class="t-status" class:t-bad={!result.ok && !empty} class:t-good={result.ok} id="svg-status" role="status" aria-live="polite">{status}</p>
    </div>

    <div class="t-field">
      <label class="t-label" for="svg-file">{c.file}</label>
      <input id="svg-file" class="t-input" type="file" accept=".svg,image/svg+xml" onchange={pick} aria-describedby="svg-file-hint" />
      <p class="t-hint" class:t-bad={!!fileError} id="svg-file-hint">{fileError || fill(c.fileHint, { max: size(MAX_FILE) })}</p>
    </div>

    <fieldset class="t-checks" aria-describedby="svg-remove-hint">
      <legend class="t-label">{c.remove}</legend>
      {#each REMOVALS as option (option)}
        <label><input type="checkbox" bind:checked={options[option]} /> {c.options[option]}</label>
      {/each}
    </fieldset>
    <p class="t-hint" id="svg-remove-hint">{c.removeHint}</p>

    <div class="t-field">
      <label class="t-label" for="svg-precision">{c.precision}</label>
      <select
        id="svg-precision"
        class="t-input"
        aria-describedby="svg-precision-hint"
        value={options.precision === null ? 'keep' : String(options.precision)}
        onchange={(e) => (options.precision = e.currentTarget.value === 'keep' ? null : Number(e.currentTarget.value))}
      >
        {#each PRECISIONS as precision (precision)}
          <option value={String(precision)}>{c.precisions[precision]}</option>
        {/each}
      </select>
      <p class="t-hint" id="svg-precision-hint">{c.precisionHint}</p>
    </div>
  </div>

  <div class="t-col">
    {#if result.ok}
      <div class="pictures">
        <figure>
          <img src={dataUri(result.before)} alt={c.beforeAlt} data-testid="svg-before" />
          <figcaption class="t-label">{c.before}</figcaption>
        </figure>
        <figure>
          <img src={dataUri(result.after)} alt={c.afterAlt} data-testid="svg-after" />
          <figcaption class="t-label">{c.after}</figcaption>
        </figure>
      </div>

      <Output id="svg-output" label={c.result} value={result.svg} />
      <div class="t-actions">
        <button type="button" class="t-small" onclick={download}>{common.download}</button>
      </div>

      <fieldset class="t-checks">
        <legend class="t-label">{c.encoding}</legend>
        <label><input type="radio" name="svg-encoding" value={false} bind:group={base64} /> {c.encodings.text}</label>
        <label><input type="radio" name="svg-encoding" value={true} bind:group={base64} /> {c.encodings.base64}</label>
      </fieldset>
      <Output id="svg-uri" label={c.uri} value={uri} />
      <Output id="svg-css" label={c.css} value={`background-image: url("${uri}");`} />
      <p class="t-hint">{c.uriHint}</p>
    {/if}
  </div>
</div>

<style>
  .pictures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  figure {
    display: grid;
    gap: 0.4rem;
    margin: 0;
  }
  /* a light chequered surface in both themes: it shows what is transparent, and most drawings are made for a light page */
  img {
    display: block;
    width: 100%;
    height: 11rem;
    object-fit: contain;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: repeating-conic-gradient(#e6e8ee 0 25%, #fff 0 50%) 0 0 / 1rem 1rem;
  }
</style>
