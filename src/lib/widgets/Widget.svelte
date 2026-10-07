<!-- src/lib/widgets/Widget.svelte -->
<!-- Shared shell for all widgets: layout, border state, controls, edit panel and long-press dragging. -->
<script>
  import { layout, widgets } from './widgets.svelte.js';

  const LONG_PRESS_MS = 500;
  const MOVE_TOLERANCE = 10;

  let {
    widget,
    variant = 'dock',
    ghost = false,
    icon,
    label,
    time,
    sub = '',
    /** @type {'idle' | 'green' | 'blue' | 'ring'} */
    tone = 'idle',
    /** @type {Array<{icon: string, title: string, onclick: () => void, kind?: 'confirm'}>} */
    controls = [],
    editor
  } = $props();

  let editing = $state(false);
  let pressing = $state(false);
  let isGhost = $derived(ghost || variant === 'drag');
  let isPlaceholder = $derived(!isGhost && layout.drag?.id === widget.id);

  /** @type {HTMLDivElement} */
  let root;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let pressTimer;
  let pressOrigin = { x: 0, y: 0 };
  let pressPoint = { clientX: 0, clientY: 0 };

  /** @param {PointerEvent} event */
  function handlePointerDown(event) {
    if (isGhost || event.button !== 0) return;
    // Only empty space starts a drag, never buttons, inputs or the edit panel.
    if (/** @type {Element} */ (event.target).closest('button, input, label, .editor')) return;

    pressOrigin = { x: event.clientX, y: event.clientY };
    pressPoint = event;
    pressing = true;

    window.addEventListener('pointermove', handlePressMove);
    window.addEventListener('pointerup', cancelPress);
    window.addEventListener('pointercancel', cancelPress);

    pressTimer = setTimeout(() => {
      const rect = root.getBoundingClientRect();
      cancelPress();
      editing = false;
      layout.startDrag(widget.id, pressPoint, rect);
    }, LONG_PRESS_MS);
  }

  /** @param {PointerEvent} event */
  function handlePressMove(event) {
    pressPoint = event;
    if (Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) > MOVE_TOLERANCE) {
      cancelPress();
    }
  }

  function cancelPress() {
    clearTimeout(pressTimer);
    pressing = false;
    window.removeEventListener('pointermove', handlePressMove);
    window.removeEventListener('pointerup', cancelPress);
    window.removeEventListener('pointercancel', cancelPress);
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (editing && root && !root.contains(/** @type {Node} */ (event.target))) {
      editing = false;
    }
  }

  // Stop touch scrolling while this widget is being dragged (needs a non-passive listener).
  $effect(() => {
    if (isGhost) return;

    /** @param {TouchEvent} event */
    const preventScroll = (event) => {
      if (layout.drag?.id === widget.id) event.preventDefault();
    };

    root.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      root.removeEventListener('touchmove', preventScroll);
      cancelPress();
    };
  });
</script>

<svelte:window onclick={handleClickOutside} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="widget {variant} {tone}"
  class:editing
  class:pressing
  class:placeholder={isPlaceholder}
  bind:this={root}
  onpointerdown={handlePointerDown}
  oncontextmenu={(event) => (pressing || layout.drag) && event.preventDefault()}
>
  <div class="head">
    <span class="type-icon m3-icon">{icon}</span>
    <span class="label">{label}</span>
  </div>

  <div class="display">
    <span class="time">{time}</span>
    {#if sub}<span class="sub">{sub}</span>{/if}
  </div>

  <div class="controls">
    {#each controls as control (control.title)}
      <button
        class="control m3-icon"
        class:confirm={control.kind === 'confirm'}
        title={control.title}
        onclick={control.onclick}>{control.icon}</button>
    {/each}

    {#if editor}
      <button
        class="control m3-icon"
        class:active={editing}
        title={editing ? 'Done' : 'Edit'}
        onclick={() => (editing = !editing)}>{editing ? 'check' : 'edit_square'}</button>
    {/if}

    <button class="control remove m3-icon" title="Remove Widget" onclick={() => widgets.remove(widget.id)}>delete</button>
  </div>

  {#if editing && editor}
    <div class="editor">
      {@render editor()}
    </div>
  {/if}
</div>


<style>
  .widget {
    --border-idle: #d4d4d4;

    box-sizing: border-box;
    width: 100%;
    display: grid;
    align-items: center;
    background-color: rgb(0, 0, 0);
    border-radius: 40px;
    border-style: solid;
    border-width: 2.5px;
    border-color: var(--border-idle);
    color: #ffffff;
    font-family: "Roboto Slab", serif;

    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;

    transition:
      border-color 0.4s,
      border-radius 0.3s,
      opacity 0.3s,
      transform 0.5s;
  }

  .widget.green {
    border-color: #29df50;
  }

  .widget.blue {
    border-color: #29acdf;
  }

  .widget.ring {
    animation: ring 2s ease-in-out infinite;
  }

  @keyframes ring {
    0%, 100% { border-color: var(--border-idle); }
    50% { border-color: #f73f43; }
  }

  .widget.pressing {
    transform: scale(0.97);
  }

  .widget.placeholder {
    opacity: 0.25;
    border-style: dashed;
  }

  /* Dock: same pill shape as a task */
  .dock {
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "head display controls"
      "editor editor editor";
    column-gap: 16px;
    padding: 5px 20px 5px 25px;
    min-height: 50px;
  }

  .dock.editing {
    border-radius: 30px;
  }

  /* Side & drag: square card with controls stacked vertically */
  .side,
  .drag {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "head controls"
      "display controls"
      "editor editor";
    column-gap: 10px;
    align-items: start;
    padding: 18px 14px 18px 20px;
    min-height: 160px;
    border-radius: 26px;
  }

  .drag {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  }

  .head {
    grid-area: head;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .type-icon {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    color: #cacaca;
  }

  .label {
    font-size: 16px;
    color: #b7b7b7;
    white-space: nowrap;
  }

  .display {
    grid-area: display;
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }

  .side .display,
  .drag .display {
    flex-direction: column;
    gap: 2px;
    align-self: end;
    padding-top: 12px;
  }

  .time {
    font-size: 18px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .side .time,
  .drag .time {
    font-size: 32px;
    line-height: 1.2;
  }

  .sub {
    font-size: 14px;
    color: #9a9a9a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .controls {
    grid-area: controls;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .side .controls,
  .drag .controls {
    flex-direction: column;
  }

  .drag .controls {
    pointer-events: none;
  }

  .control {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    color: #dadada;
    transition: color 0.4s, font-variation-settings 0.7s;
  }

  .control:hover {
    color: #ffffff;
  }

  .control:active {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    transition: none;
  }

  .control.active {
    color: #29df50;
  }

  .control.active:hover {
    color: #1fff50;
  }

  .control.confirm {
    color: #f73f43;
  }

  .control.confirm:hover {
    color: #ff6266;
  }

  .control.remove {
    color: #b7b7b7;
  }

  .control.remove:hover {
    color: #f73f43;
  }

  .editor {
    grid-area: editor;
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 6px 0 12px;
    padding-top: 14px;
    border-top: 1.5px dashed #494949;
    user-select: text;
    -webkit-user-select: text;
  }

  @media (max-width: 480px) {
    .dock .label {
      display: none;
    }

    .dock {
      column-gap: 10px;
      padding: 5px 14px 5px 18px;
    }
  }

  @media (max-width: 380px) {
    .type-icon {
      font-size: 25px;
      font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    }

    .time {
      font-size: 16px;
    }

    .sub {
      font-size: 12px;
    }

    .controls {
      gap: 2px;
    }

    .control {
      font-size: 22px;
      font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
    }
  }
</style>
