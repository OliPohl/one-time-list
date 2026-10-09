<!-- src/lib/pages/widget-pages/WidgetPageView.svelte -->
<!-- The body of a widget page: the time in big, the bar, the status and the controls.
     Used by the widget page and, smaller (`compact`), by its card on the dashboard. -->
<script>
  import { widgetOf, getWidgetPageStore } from './store.svelte.js';
  import { widgetView, elapsedNow } from '$lib/widgets/views.js';

  /** @type {{page: import('../types.js').Page, compact?: boolean}} */
  let { page, compact = false } = $props();

  // Shown for one page only, so the store never changes.
  // svelte-ignore state_referenced_locally
  const store = getWidgetPageStore(page);

  let widget = $derived(widgetOf(page));
  /** @type {import('$lib/widgets/views.js').View | undefined} */
  let view = $derived(widget && widgetView(widget, store, { long: true }));
  // Every frame while counting, so the bar moves smoothly.
  let barElapsed = $derived(view?.bar ? elapsedNow(view.bar) : 0);
  // While it rings the page only offers the confirm button, the widget cards keep all their controls.
  let controls = $derived(view?.tone === 'ring' ? view.controls.filter((control) => control.kind === 'confirm') : (view?.controls ?? []));
  // Roboto Slab has no equal width digits, so every digit gets a slot as wide as the widest one.
  // Otherwise the centered time wiggles whenever a digit changes.
  let timeChars = $derived(view ? [...view.time] : []);
</script>

<div class="widget-view" class:compact class:break-end={view?.breakEnd}>
  {#if view}
    <div class="time" aria-label={view.time}>
      {#each timeChars as char, index (index)}
        <span class:digit={char >= '0' && char <= '9'} aria-hidden="true">{char}</span>
      {/each}
    </div>
    <!-- How far the countdown has run, in the same colors as the widget border. Keeps its space while hidden. -->
    <div
      class="bar"
      class:hidden={!view.bar && view.tone !== 'ring'}
      class:ring={view.tone === 'ring'}
      style:--track={view.bar?.track}
      style:--fill={view.bar?.fill}
      aria-hidden="true">
      {#if view.bar && view.tone !== 'ring'}
        <div class="bar-fill" style:width="{(1 - barElapsed) * 100}%"></div>
      {/if}
    </div>

    <div class="sub" class:empty={!view.sub}>{view.sub}</div>

    <div class="controls" class:empty={controls.length === 0}>
      {#each controls as control (control.title)}
        {#if control.kind === 'confirm'}
          <!-- No tooltip, the label already says what it does. -->
          <button class="confirm" onclick={control.onclick}>
            <span class="confirm-icon m3-icon">{control.icon}</span>
            <span>{control.label ?? control.title}</span>
          </button>
        {:else}
          <button class="control m3-icon" title={control.title} onclick={control.onclick}>{control.icon}</button>
        {/if}
      {/each}
    </div>
  {/if}
</div>


<style>
  .widget-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--text);
    font-family: "Roboto Slab", serif;
  }

  .time {
    margin-top: 18px;
    font-size: clamp(64px, 20vw, 150px);
    line-height: 1.05;
    white-space: nowrap;
    color: var(--bright);
  }

  /* Width of the widest digit ("4") in Roboto Slab. */
  .digit {
    display: inline-block;
    width: 0.58em;
    text-align: center;
  }

  .bar {
    position: relative;
    width: min(80vw, 460px);
    height: 8px;
    margin: 14px 0 10px;
    overflow: hidden;
    border-radius: 8px;
    background-color: var(--track);
  }

  /* A clock without an alarm has nothing to count down. */
  .bar.hidden {
    visibility: hidden;
  }

  /* The part that's left, it shrinks from the right towards the left end. */
  .bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background-color: var(--fill);
  }

  /* Finished: the whole bar blinks like every alarm. */
  .bar.ring {
    animation: ring var(--blink-duration) ease-in-out infinite;
  }

  @keyframes ring {
    0%, 100% { background-color: var(--widget-blink-alt); }
    50% { background-color: var(--widget-blink); }
  }

  /* Keeps its height while empty, so the controls don't jump when a status appears. */
  .sub {
    min-height: 1.5em;
    font-size: 20px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* Fixed height: the page is centered, a row that changes height (buttons swapped for "Dismiss") moves everything. */
  .controls {
    height: 64px;
    margin-top: 22px;
    display: flex;
    align-items: center;
    gap: 22px;
  }

  .control {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-soft);
    font-size: 44px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 44;
    transition: color 0.4s, font-variation-settings 0.7s;
  }

  .control:hover {
    color: var(--text);
  }

  .control:active {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 44;
    transition: none;
  }

  .confirm {
    height: 60px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 30px 0 24px;
    background-color: var(--surface);
    border: 2.5px solid var(--widget-blink);
    border-radius: 40px;
    color: var(--widget-blink);
    font-family: "Roboto Slab", serif;
    font-size: 20px;
    cursor: pointer;
    transition: transform 0.15s;
    /* Blinks like every alarm: --widget-blink-alt <-> --widget-blink, in step with the bar. */
    animation: confirm-blink var(--blink-duration) ease-in-out infinite;
  }

  @keyframes confirm-blink {
    0%, 100% { color: var(--widget-blink-alt); border-color: var(--widget-blink-alt); }
    50% { color: var(--widget-blink); border-color: var(--widget-blink); }
  }

  /* Hover only tints the background a little, the blink keeps going. */
  .confirm:hover {
    background-color: color-mix(in srgb, var(--widget-blink) 12%, var(--surface));
  }

  .confirm:active {
    transform: scale(0.97);
  }

  .confirm-icon {
    font-size: 30px;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30;
  }

  /* Compact: inside a dashboard card. Empty parts take no space there, so what's shown is centered in the card
     (on the page they keep their space so nothing jumps). */
  .compact .bar.hidden,
  .compact .sub.empty,
  .compact .controls.empty {
    display: none;
  }

  .compact .time {
    margin-top: 4px;
    font-size: 56px;
  }

  .compact .bar {
    width: 100%;
    height: 6px;
    margin: 10px 0 6px;
  }

  .compact .sub {
    font-size: 15px;
  }

  .compact .controls {
    height: 48px;
    margin-top: 8px;
    gap: 14px;
  }

  .compact .control {
    font-size: 32px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 32;
  }

  .compact .confirm {
    height: 44px;
    gap: 8px;
    padding: 0 20px 0 16px;
    font-size: 16px;
  }

  .compact .confirm-icon {
    font-size: 24px;
  }
</style>
