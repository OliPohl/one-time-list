<!-- src/lib/pages/tasks/components/SortMenu.svelte -->
<!-- The sorting of a task list (a Tasks page, a board column): one button in the color and icon of the current sorting, it opens the list of
     all sortings. Choosing "Shuffle" again shuffles again. -->
<script>
  import { COLORS } from '../../../colors.js';

  /**
   * @type {{
   *   list: import('../list.svelte.js').TaskList
   * }}
   */
  let { list } = $props();

  /**
   * The sortings, in the colors of the Tasks page's buttons. `glyph`: how much of its box the icon fills (height),
   * so every icon is drawn equally tall in the button.
   */
  const SORTINGS = /** @type {const} */ ([
    { mode: 'custom', label: 'Custom', icon: 'layers', glyph: 0.76, color: COLORS.amethyst.wave },
    { mode: 'priority', label: 'Priority', icon: 'flag', glyph: 0.72, color: 'var(--orange)' },
    { mode: 'alphanumeric', label: 'Alphanumeric', icon: 'sort_by_alpha', glyph: 0.8, color: COLORS.cobalt.wave },
    { mode: 'random', label: 'Shuffled', icon: 'shuffle', glyph: 0.68, color: COLORS.emerald.wave }
  ]);

  let current = $derived(SORTINGS.find((sorting) => sorting.mode === list.sortMode) ?? SORTINGS[0]);
  let open = $state(false);
  /** @type {HTMLElement} */
  let root;

  /** @param {import('../list.svelte.js').SortMode} mode */
  function choose(mode) {
    open = false;
    if (mode === 'custom') list.restoreCustomOrder();
    else list.sortTasks(mode);
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (open && !event.composedPath().includes(root)) open = false;
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="sort" bind:this={root}>
  <button
    class="sort-btn"
    style:--sort-color={current.color}
    title="Sorted: {current.label}"
    aria-expanded={open}
    onclick={() => (open = !open)}>
    <span class="sort-icon m3-icon" style:--glyph={current.glyph}>{current.icon}</span>
    <span class="arrow m3-icon">expand_more</span>
  </button>

  {#if open}
    <div class="menu" role="menu">
      {#each SORTINGS as sorting (sorting.mode)}
        <button class="option" class:active={sorting === current} role="menuitem" onclick={() => choose(sorting.mode)}>
          <span class="option-icon m3-icon" style:--sort-color={sorting.color}>{sorting.icon}</span>
          <span>{sorting.mode === 'random' && sorting === current ? 'Shuffle Again' : sorting.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>


<style>
  /* A bit taller than the capital letters of the "Current Task" heading next to it (`--heading-size`, NextTask),
     centered on them. Never squeezed by the heading. */
  .sort {
    --sort-height: calc(var(--heading-size, 16px) * 1.05);
    position: relative;
    flex-shrink: 0;
  }

  .sort-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0;
    box-sizing: border-box;
    height: var(--sort-height);
    padding: 0 calc(var(--sort-height) * 0.3) 0 calc(var(--sort-height) * 0.45);
    background-color: var(--sort-color);
    border: none;
    border-radius: 50px;
    cursor: pointer;
    transition: filter 0.2s;
  }

  .sort-btn:hover {
    filter: brightness(110%);
  }

  .sort-btn:active {
    filter: brightness(90%);
  }

  /* Every icon is drawn 60% as tall as the button, with room around it: a Material Symbol is drawn
     smaller than its box, by how much depends on the icon (`--glyph`). Square, the icons keep their shape. */
  .sort-icon,
  .arrow {
    --size: calc(var(--sort-height) * 0.6 / var(--glyph, 0.72));
    flex-shrink: 0;
    width: var(--size);
    height: var(--size);
    margin: 0 calc(var(--size) * -0.08);
    line-height: var(--size);
    color: var(--on-color);
    font-size: var(--size);
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }

  .arrow {
    transition: rotate 0.2s;
  }

  .sort-btn[aria-expanded='true'] .arrow {
    rotate: 180deg;
  }

  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 190px;
    padding: 8px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 22px;
    box-shadow: 0 12px 40px var(--shadow);
  }

  .option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px 6px 6px;
    background: none;
    border: none;
    border-radius: 14px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }

  .option:hover,
  .option.active {
    background-color: var(--surface-raised);
  }

  .option.active {
    color: var(--text);
  }

  .option-icon {
    box-sizing: border-box;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--sort-color);
    color: var(--on-color);
    font-size: 16px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 16;
  }
</style>
