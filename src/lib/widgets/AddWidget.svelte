<!-- src/lib/widgets/AddWidget.svelte -->
<script>
  import { widgets, WIDGET_TYPES } from './widgets.svelte.js';

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
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: rgb(0, 0, 0);
    padding: 5px 25px;
    border-radius: 40px;
    border-style: solid;
    border-width: 2.5px;
    border-color: #d4d4d4;
    color: #d4d4d4;
    font-family: "Roboto Slab", serif;
    font-size: 18px;
    cursor: pointer;
    transition: color 0.4s, border-color 0.4s;
  }

  .add-btn:hover,
  .add-btn.open {
    color: #d6e550;
    border-color: #d6e550;
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
    background-color: rgb(0, 0, 0);
    border-radius: 26px;
    border: 2.5px solid #d4d4d4;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
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
    color: #dadada;
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    text-align: left;
    cursor: pointer;
    transition: color 0.4s, background-color 0.4s;
  }

  .option:hover {
    color: #d6e550;
    background-color: #1b1b1b;
  }

  .option-icon {
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  }
</style>
