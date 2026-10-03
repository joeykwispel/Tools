<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import Output from '$lib/components/tool/Output.svelte';
  import { PRESETS, parse, presetOf, range, toCss, type Curve } from './logic';
  import text_ from './text';

  /** Room for the handles above 1 and below 0: as far as the curves to start from go. */
  const [LOW, HIGH] = [-0.6, 1.6];
  const PAD = 20;
  /** Units to the px of the drawing: time across, progress up. */
  const [SX, SY] = [300, 150];
  const WIDTH = SX + PAD * 2;
  const HEIGHT = (HIGH - LOW) * SY + PAD * 2;
  /** A place in the drawing, without the tail a sum of fractions leaves. */
  const px = (value: number) => Math.round(value * 100) / 100;
  const X = (x: number) => px(PAD + x * SX);
  const Y = (y: number) => px(PAD + (HIGH - y) * SY);
  const KEYS = ['x1', 'y1', 'x2', 'y2'] as const;

  const c = $derived(text_[app.locale]);

  let curve = $state<Curve>([...PRESETS.easeOutQuint] as Curve);
  let text = $state(toCss(PRESETS.easeOutQuint));
  let duration = $state(800);
  let moved = $state(false);
  let svg = $state<SVGSVGElement>();
  let dragging = $state<0 | 2 | null>(null);

  const read = $derived(parse(text));
  const css = $derived(toCss(curve));
  const preset = $derived(presetOf(curve) ?? '');
  const [low, high] = $derived(range(curve));

  /** A curve from the handles or the numbers: the text follows. */
  function set(next: Curve) {
    curve = next;
    text = toCss(next);
  }

  function typed() {
    if (read.ok) curve = read.curve;
  }

  const round = (value: number) => Math.round(value * 100) / 100;

  function drag(event: PointerEvent) {
    if (dragging === null || !svg) return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = round(Math.min(1, Math.max(0, (point.x - PAD) / SX)));
    const y = round(Math.min(HIGH, Math.max(LOW, HIGH - (point.y - PAD) / SY)));
    const next = [...curve] as Curve;
    next[dragging] = x;
    next[dragging + 1] = y;
    set(next);
  }

  /** Pressing a handle picks it up; the drawing keeps the pointer, so a drag can leave the handle. */
  function grab(event: PointerEvent) {
    const which = (event.target as Element).getAttribute('data-handle');
    if (which === null) return;
    dragging = which === '0' ? 0 : 2;
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="bezier-text">{c.easing}</label>
      <input
        id="bezier-text"
        class="t-input"
        class:t-bad={!read.ok && read.error !== 'empty'}
        type="text"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-describedby="bezier-status bezier-hint"
        bind:value={text}
        oninput={typed}
      />
      <p class="t-status" class:t-bad={!read.ok} id="bezier-status" role="status" aria-live="polite">{read.ok ? '' : c.errors[read.error]}</p>
      <p class="t-hint" id="bezier-hint">{c.easingHint}</p>
    </div>

    <div class="t-field">
      <label class="t-label" for="bezier-preset">{c.preset}</label>
      <select
        id="bezier-preset"
        class="t-input"
        value={preset}
        onchange={(e) => {
          const name = e.currentTarget.value;
          if (PRESETS[name]) set([...PRESETS[name]] as Curve);
        }}
      >
        <option value="" disabled>{c.custom}</option>
        {#each Object.keys(PRESETS) as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </div>

    <div class="numbers">
      {#each KEYS as key, i (key)}
        <div class="t-field">
          <label class="t-label" for="bezier-{key}">{c.handle[key]}</label>
          <input
            id="bezier-{key}"
            class="t-input"
            type="number"
            step="0.01"
            min={i % 2 === 0 ? 0 : LOW}
            max={i % 2 === 0 ? 1 : HIGH}
            value={curve[i]}
            oninput={(e) => {
              const value = e.currentTarget.valueAsNumber;
              if (Number.isNaN(value)) return;
              const next = [...curve] as Curve;
              next[i] = i % 2 === 0 ? Math.min(1, Math.max(0, value)) : value;
              set(next);
            }}
          />
        </div>
      {/each}
    </div>
  </div>

  <div class="t-col">
    <figure class="graph">
      <svg
        bind:this={svg}
        viewBox="0 0 {WIDTH} {HEIGHT}"
        role="img"
        aria-label={`${c.graph} ${css}`}
        onpointerdown={grab}
        onpointermove={drag}
        onpointerup={() => (dragging = null)}
        onpointercancel={() => (dragging = null)}
      >
        <rect class="square" x={X(0)} y={Y(1)} width={SX} height={SY} />
        <line class="diagonal" x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} />
        <line class="arm" x1={X(0)} y1={Y(0)} x2={X(curve[0])} y2={Y(curve[1])} />
        <line class="arm" x1={X(1)} y1={Y(1)} x2={X(curve[2])} y2={Y(curve[3])} />
        <path class="curve" d="M{X(0)} {Y(0)} C{X(curve[0])} {Y(curve[1])}, {X(curve[2])} {Y(curve[3])}, {X(1)} {Y(1)}" data-testid="bezier-path" />
        <circle class="end" cx={X(0)} cy={Y(0)} r="5" />
        <circle class="end" cx={X(1)} cy={Y(1)} r="5" />
        <circle class="handle" class:active={dragging === 0} cx={X(curve[0])} cy={Y(curve[1])} r="10" data-handle="0" data-testid="bezier-handle-1" />
        <circle class="handle two" class:active={dragging === 2} cx={X(curve[2])} cy={Y(curve[3])} r="10" data-handle="2" data-testid="bezier-handle-2" />
      </svg>
    </figure>
    {#if low < 0 || high > 1}<p class="t-hint">{c.overshoot}</p>{/if}

    <Output id="bezier-css" label={c.timing} value={css} />
    <Output id="bezier-transition" label={c.transition} value="transition: transform {duration}ms {css};" />

    <div class="t-field">
      <div class="t-row">
        <label class="t-label" for="bezier-duration">{c.duration}</label>
        <span class="t-hint mono">{fill(c.durationValue, { ms: String(duration) })}</span>
      </div>
      <input id="bezier-duration" class="t-range" type="range" min="100" max="3000" step="50" bind:value={duration} />
    </div>

    <div class="tracks" class:moved>
      {#each [[c.thisCurve, css], [c.linear, 'linear']] as [label, timing] (label)}
        <div class="track">
          <span class="track-label">{label}</span>
          <span class="ball" style:transition="left {duration}ms {timing}"></span>
        </div>
      {/each}
    </div>
    <div class="t-actions">
      <button type="button" class="t-small" aria-pressed={moved} onclick={() => (moved = !moved)}>{moved ? c.back : c.play}</button>
    </div>
  </div>
</div>

<style>
  .numbers {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem 0.75rem;
    align-items: end;
  }
  .graph {
    margin: 0;
    max-width: 22rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    touch-action: none;
  }
  .square {
    fill: none;
    stroke: var(--border);
    stroke-width: 1;
  }
  .diagonal {
    stroke: var(--border);
    stroke-dasharray: 4 4;
  }
  .arm {
    stroke: var(--muted);
    stroke-width: 1.5;
  }
  .curve {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
  }
  .end {
    fill: var(--muted);
  }
  .handle {
    fill: var(--accent);
    stroke: var(--bg);
    stroke-width: 3;
    cursor: grab;
  }
  .handle.two {
    fill: var(--accent-2);
  }
  .handle.active {
    cursor: grabbing;
  }
  .tracks {
    display: grid;
    gap: 0.5rem;
  }
  .track {
    position: relative;
    height: 2rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
  }
  .track-label {
    position: absolute;
    inset: 0 0.75rem 0 auto;
    display: flex;
    align-items: center;
    font-size: 0.72rem;
    font-family: var(--mono);
    color: var(--muted);
  }
  .ball {
    position: absolute;
    top: 0.25rem;
    left: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--accent);
  }
  .moved .ball {
    left: calc(100% - 1.75rem);
  }
</style>
