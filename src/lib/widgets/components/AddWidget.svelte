<!-- src/lib/widgets/components/AddWidget.svelte -->
<script>
  import { WIDGET_TYPES } from '../store.svelte.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  let open = $state(false);
  /** @type {HTMLDivElement} */
  let componentRef;

  /** @param {string} type */
  function add(type) {
    widgets.add(type);
    open = false;
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (open && componentRef && !componentRef.contains(/** @type {Node} */ (event.target))) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="wrapper" bind:this={componentRef}>
  <button class="add-btn" class:open onclick={() => (open = !open)} aria-expanded={open}>
    <span class="add-icon m3-icon">add</span>
    <span class="text">Add Widget</span>
  </button>

  {#if open}
    <div class="dropdown">
      {#each Object.entries(WIDGET_TYPES) as [type, { label, icon }] (type)}
        <button class="option" onclick={() => add(type)}>
          <span class="option-icon m3-icon">{icon}</span>
          <span>{label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>


<style>
  .wrapper {
    position: relative;
    width: 100%;
    z-index: 20;
  }

  .add-btn {
    box-sizing: border-box;
    width: 100%;
    max-height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: transparent;
    padding: 5px 25px;
    border-radius: 40px;
    border-color: #8c8c8c00;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 18px;
    cursor: pointer;
    transition: color 0.4s, border-color 0.4s;
  }

  .add-btn:hover,
  .add-btn.open {
    color: var(--accent);
  }

  .add-icon {
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 220px;
    display: flex;
    flex-direction: column;
    padding: 8px;
    background-color: var(--surface);
    border-radius: 26px;
    border: 2.5px solid var(--line-strong);
    box-shadow: 0 12px 40px var(--shadow);
    animation: drop-in 0.2s ease-out;
  }

  @keyframes drop-in {
    from { opacity: 0; transform: translate(-50%, -6px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  .option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    background: none;
    border: none;
    border-radius: 20px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    text-align: left;
    cursor: pointer;
    transition: color 0.4s, background-color 0.4s;
  }

  .option:hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .option-icon {
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  }
</style>
