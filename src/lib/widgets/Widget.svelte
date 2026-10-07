<!-- src/lib/widgets/Widget.svelte -->
<!-- Shared shell for all widgets: layout, border state, controls, edit panel and dragging. -->
<script>
  import { slide } from 'svelte/transition';
  import { layout, widgets } from './widgets.svelte.js';
  import { pressDrag } from '../pressDrag.js';

  let {
    widget,
    variant = 'dock',
    ghost = false,
    icon,
    label,
    time,
    sub = '',
    /** @type {'idle' | 'blue' | 'orange' | 'ring'} */
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

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (editing && root && !root.contains(/** @type {Node} */ (event.target))) {
      editing = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="widget {variant} {tone}"
  class:editing
  class:pressing
  class:placeholder={isPlaceholder}
  bind:this={root}
  {@attach pressDrag({
    enabled: () => !isGhost,
    // Only empty space starts a drag, never buttons, inputs or the edit panel.
    ignore: 'button, input, label, .editor',
    isDragging: () => layout.drag?.id === widget.id,
    onPressChange: (value) => (pressing = value),
    onStart: (point, rect) => {
      editing = false;
      layout.startDrag(widget.id, point, rect);
    }
  })}
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
    <div class="editor" transition:slide={{ duration: 250 }}>
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
      transform 0.15s;
  }

  .widget.blue {
    border-color: #29acdf;
  }

  .widget.orange {
    border-color: #f7a23f;
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
    /* Renders like the task pill at one line, stays constant while the edit menu opens */
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
    color: #29df50;
  }

  .control.confirm:hover {
    color: #1fff50;
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
