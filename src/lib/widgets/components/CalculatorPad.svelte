<!-- src/lib/widgets/components/CalculatorPad.svelte -->
<!-- The keys of the calculator widget. Clicking the widget (or its dashboard card) makes it `active`: the keyboard types into it (digits,
     + - * / x, Enter or =, Backspace, Esc, %, r for the square root, ^ to square) until something else is clicked.
     With `always` (its own page) it takes the keyboard right away. Esc on an empty calculator gives the keyboard to
     the app's shortcuts until it's clicked again, so do an open sidebar and the shortcuts popup. `large` for the page, bigger keys, `small` for
     the dashboard card. -->
<script>
  import { press, keyFromKeyboard } from '../calculator.js';
  import { shortcuts } from '../../app/shortcuts.svelte.js';
  import { navigation } from '../../app/navigation.svelte.js';

  /** @type {{widget: any, active?: boolean, ghost?: boolean, always?: boolean, large?: boolean, small?: boolean}} */
  let { widget, active = $bindable(false), ghost = false, always = false, large = false, small = false } = $props();

  $effect(() => {
    if (always) active = true;
  });

  /** `icon`: the label is a Material Symbols icon. @type {Array<{key: import('../calculator.js').Key, label: string, title: string, kind?: 'function' | 'operator' | 'equals', wide?: boolean, icon?: boolean}>} */
  const KEYS = [
    { key: 'clear', label: 'C', title: 'Clear (Esc)', kind: 'function' },
    { key: 'back', label: 'backspace', title: 'Delete Digit (Backspace)', kind: 'function', icon: true },
    { key: 'percent', label: '%', title: 'Percent (%)', kind: 'function' },
    { key: '/', label: '÷', title: 'Divide (/)', kind: 'operator' },
    { key: 'sqrt', label: '√x', title: 'Square Root (r)', kind: 'function' },
    { key: '7', label: '7', title: '7' },
    { key: '8', label: '8', title: '8' },
    { key: '9', label: '9', title: '9' },
    { key: '*', label: '×', title: 'Multiply (*)', kind: 'operator' },
    { key: 'square', label: 'x²', title: 'Square (^)', kind: 'function' },
    { key: '4', label: '4', title: '4' },
    { key: '5', label: '5', title: '5' },
    { key: '6', label: '6', title: '6' },
    { key: '-', label: '−', title: 'Subtract (-)', kind: 'operator' },
    { key: 'inverse', label: '1/x', title: 'Reciprocal', kind: 'function' },
    { key: '1', label: '1', title: '1' },
    { key: '2', label: '2', title: '2' },
    { key: '3', label: '3', title: '3' },
    { key: '+', label: '+', title: 'Add (+)', kind: 'operator' },
    { key: 'negate', label: '±', title: 'Change Sign', kind: 'function' },
    { key: '0', label: '0', title: '0', wide: true },
    { key: '.', label: '.', title: 'Decimal Point (. or ,)' },
    { key: '=', label: '=', title: 'Equals (Enter)', kind: 'equals', wide: true }
  ];

  /** It types now: active, and not given back to the shortcuts or behind the open sidebar. */
  let takesKeys = $derived(active && !shortcuts.released && !navigation.sidebarOpen);

  /** Nothing typed, nothing to clear. */
  let isEmpty = $derived(widget.entry === '0' && widget.acc === null && widget.op === null && !widget.error && !widget.expression);

  /** @type {HTMLElement} */
  let root;
  /** The key last pressed on the keyboard, it lights up for a moment. */
  let flashed = $state('');
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let flashTimer;

  /** Clicking the widget (on the dashboard: the calculator's body) turns the keyboard on, clicking anywhere else off. @param {PointerEvent} event */
  function handlePointerDown(event) {
    if (ghost) return;
    const target = /** @type {Element} */ (event.target);
    // On its own page, clicking the page (not the sidebar or a popup) takes the keyboard back.
    if (always) {
      if (shortcuts.released === 'calculator' && !target.closest('[data-sidebar], [data-dialog]')) shortcuts.take();
      return;
    }
    const card = root?.closest('.widget, .calc-body');
    active = Boolean(card?.contains(target));
    if (active && shortcuts.released === 'calculator') shortcuts.take();
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (!takesKeys || event.ctrlKey || event.metaKey || event.altKey) return;
    // Typing into a field (a task, a note) stays there.
    const target = /** @type {HTMLElement} */ (event.target);
    if (target.closest?.('input, textarea, [contenteditable="true"]')) return;

    const key = keyFromKeyboard(event);
    if (!key) return;
    event.preventDefault();
    // Escape clears first, on an empty calculator it gives the keyboard to the shortcuts.
    if (event.key === 'Escape' && isEmpty) {
      shortcuts.release('calculator');
      if (!always) active = false;
      return;
    }
    press(widget, key);

    flashed = key;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flashed = ''), 150);
  }

  $effect(() => () => clearTimeout(flashTimer));
</script>

<svelte:window onpointerdowncapture={handlePointerDown} onkeydown={handleKeyDown} />

<!-- `data-takes-keys`: while it types, the app's keyboard shortcuts wait (see shortcuts.svelte.js). -->
<div class="pad" class:large class:small data-takes-keys={takesKeys ? '' : undefined} bind:this={root}>
  {#each KEYS as item (item.key)}
    <!-- Not focusable: Enter on a focused key would press it again, Enter is "=" here. -->
    <button
      class="key {item.kind ?? 'digit'}"
      class:wide={item.wide}
      class:m3-icon={item.icon}
      class:flash={flashed === item.key}
      title={item.title}
      tabindex="-1"
      onmousedown={(event) => event.preventDefault()}
      onclick={() => press(widget, item.key)}>{item.label}</button>
  {/each}
</div>


<style>
  .pad {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }

  .key {
    min-width: 0;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 10px;
    background-color: var(--surface-raised);
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
  }

  .key:hover {
    background-color: var(--surface-active);
  }

  .key:active,
  .key.flash {
    background-color: var(--line);
    transition: none;
  }

  /* On the calculator's body (its page). */
  .large {
    gap: 10px;
  }

  /* The card gray stands out on the body in light and dark mode (the raised color is nearly black in dark mode). */
  .large .key {
    height: 58px;
    border-radius: 16px;
    background-color: var(--surface-card);
    font-size: 22px;
  }

  .large .key:hover {
    background-color: color-mix(in srgb, var(--surface-card), var(--text) 8%);
  }

  .large .key:active,
  .large .key.flash {
    background-color: color-mix(in srgb, var(--surface-card), var(--text) 18%);
  }

  .large .key.function {
    font-size: 19px;
  }

  .large .key.m3-icon {
    font-size: 26px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }

  .large .key.operator,
  .large .key.equals {
    font-size: 26px;
  }

  .large .key.equals {
    background-color: var(--accent);
  }

  /* On the dashboard card, where the height is limited. */
  .small {
    gap: 4px;
  }

  .small .key {
    height: 24px;
    border-radius: 8px;
    font-size: 14px;
  }

  .small .key.function {
    font-size: 12px;
  }

  .key.wide {
    grid-column: span 2;
  }

  .key.function {
    color: var(--text-soft);
    font-size: 14px;
  }

  .key.m3-icon {
    font-family: 'Material Symbols Outlined';
    font-size: 18px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 18;
  }

  .key.operator {
    color: var(--accent);
    font-size: 18px;
  }

  .key.equals {
    background-color: var(--accent);
    color: var(--on-accent);
    font-size: 18px;
  }

  .key.equals:hover {
    filter: brightness(110%);
  }

  .key.equals:active,
  .key.equals.flash {
    filter: brightness(90%);
  }
</style>
