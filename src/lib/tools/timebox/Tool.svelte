<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { fill } from '$lib/locales';
  import { clock, elapsed, fresh, parseDuration, pause, phase, remaining, running, start, type Timer } from './logic';
  import text_ from './text';

  const PRESETS = [1, 2, 5, 10, 15, 25];
  const MAX_PEOPLE = 50;

  const c = $derived(text_[app.locale]);

  let text = $state('5:00');
  let timer = $state.raw<Timer>(fresh(300_000));
  /** The time of the clock, moved on while the timer runs: everything shown is worked out from it. */
  let now = $state(0);
  let people = $state(0);
  let turn = $state(1);
  /** What the turns before this one took, for the total of a stand-up. */
  let earlier = $state(0);
  let sound = $state(false);
  let beeped = false;
  let audio: AudioContext | undefined;

  const parsed = $derived(parseDuration(text));
  const left = $derived(remaining(timer, now));
  const stage = $derived(phase(left, timer.duration));
  const active = $derived(running(timer));
  const untouched = $derived(!active && timer.before === 0);
  const turns = $derived(Math.min(MAX_PEOPLE, Math.max(0, Math.round(people) || 0)));
  const last = $derived(turns > 0 && turn >= turns);

  $effect(() => {
    if (!active) return;
    const tick = setInterval(() => (now = Date.now()), 200);
    return () => clearInterval(tick);
  });

  // one beep at the moment the time is up, when that is asked for
  $effect(() => {
    if (stage !== 'over' || !active || beeped) return;
    beeped = true;
    if (sound) beep();
  });

  function beep() {
    try {
      audio ??= new AudioContext();
      const [tone, volume] = [audio.createOscillator(), audio.createGain()];
      tone.frequency.value = 880;
      volume.gain.setValueAtTime(0.2, audio.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.8);
      tone.connect(volume).connect(audio.destination);
      tone.start();
      tone.stop(audio.currentTime + 0.8);
    } catch {
      /* no sound on this device: the colour and the text still say it */
    }
  }

  function setDuration(value: string) {
    text = value;
    const duration = parseDuration(value);
    // a timebox that is running is not changed under it; the new one counts from the next reset or turn
    if (duration !== null && untouched) timer = fresh(duration);
  }

  function toggle() {
    now = Date.now();
    // a sound may only start from a click, so the first one is where it is made ready
    if (sound) audio ??= new AudioContext();
    timer = active ? pause(timer, now) : start(timer, now);
  }

  function again(keepRunning: boolean) {
    now = Date.now();
    beeped = false;
    const next = fresh(parsed ?? timer.duration);
    timer = keepRunning ? start(next, now) : next;
  }

  function reset() {
    again(false);
    turn = 1;
    earlier = 0;
  }

  function nextTurn() {
    earlier += elapsed(timer, Date.now());
    turn += 1;
    again(true);
  }

  const status = $derived.by(() => {
    const where = turns > 0 ? ` ${fill(c.turn, { turn: String(Math.min(turn, turns)), people: String(turns) })}` : '';
    if (stage === 'over') return c.over + where + (last ? ` ${c.done}` : '');
    if (active) return c.runs + where;
    return fill(untouched ? c.ready : c.paused, { time: clock(left) }) + where;
  });
</script>

<div class="t-tool">
  <div class="t-col">
    <div class="t-field">
      <label class="t-label" for="timebox-duration">{c.duration}</label>
      <input
        id="timebox-duration"
        class="t-input"
        class:t-bad={parsed === null}
        type="text"
        inputmode="decimal"
        spellcheck="false"
        autocomplete="off"
        aria-describedby="timebox-duration-hint"
        value={text}
        oninput={(e) => setDuration(e.currentTarget.value)}
      />
      <p class="t-hint" class:t-bad={parsed === null} id="timebox-duration-hint">{parsed === null ? c.durationError : c.durationHint}</p>
    </div>

    <div class="t-field">
      <h2 class="t-label" id="timebox-presets">{c.presets}</h2>
      <div class="t-actions" role="group" aria-labelledby="timebox-presets">
        {#each PRESETS as minutes (minutes)}
          <button type="button" class="t-small" aria-pressed={parsed === minutes * 60_000} onclick={() => setDuration(`${minutes}:00`)}
            >{fill(c.minutes, { minutes: String(minutes) })}</button
          >
        {/each}
      </div>
    </div>

    <div class="t-field people">
      <label class="t-label" for="timebox-people">{c.people}</label>
      <input id="timebox-people" class="t-input" type="number" min="0" max={MAX_PEOPLE} step="1" aria-describedby="timebox-people-hint" bind:value={people} />
    </div>
    <p class="t-hint" id="timebox-people-hint">{c.peopleHint}</p>

    <div class="t-checks">
      <label><input type="checkbox" bind:checked={sound} /> {c.sound}</label>
    </div>
  </div>

  <div class="t-col">
    <section class="t-field" aria-labelledby="timebox-time">
      <h2 class="t-label" id="timebox-time">{c.time}</h2>
      <div class="face {stage}" role="timer" aria-labelledby="timebox-time" data-testid="timebox-clock">{clock(left)}</div>
      <div class="bar" aria-hidden="true">
        <div class="fill {stage}" style:width="{Math.max(0, Math.min(100, (left / timer.duration) * 100))}%"></div>
      </div>
      <p class="t-status" class:t-bad={stage === 'over'} role="status" aria-live="polite">{status}</p>
      <div class="t-actions">
        <button type="button" class="t-small main" onclick={toggle}>{active ? c.pause : untouched ? c.start : c.resume}</button>
        {#if turns > 0}
          <button type="button" class="t-small main" disabled={last || untouched} onclick={nextTurn}>{c.next}</button>
        {/if}
        <button type="button" class="t-small main" disabled={untouched && turn === 1} onclick={reset}>{c.reset}</button>
      </div>
      {#if turns > 0 && (turn > 1 || !untouched)}
        <dl class="t-kv" data-testid="timebox-total">
          <dt>{c.total}</dt>
          <dd>{clock(-(earlier + elapsed(timer, now))).replace('+', '')}</dd>
        </dl>
      {/if}
      <p class="t-hint">{c.hint}</p>
    </section>
  </div>
</div>

<style>
  .people {
    max-width: 10rem;
  }
  .face {
    padding: 1.5rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    font-family: var(--mono);
    font-size: clamp(3rem, 14vw, 6rem);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    text-align: center;
  }
  .face.ending {
    color: var(--accent-text);
    border-color: color-mix(in srgb, var(--accent) 60%, var(--border));
  }
  .face.over {
    color: var(--syn-num);
    border-color: var(--syn-num);
  }
  .bar {
    height: 0.4rem;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--muted);
  }
  .fill.ending {
    background: var(--accent);
  }
  .main {
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
  }
</style>
