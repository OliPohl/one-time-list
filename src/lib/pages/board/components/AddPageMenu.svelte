<!-- src/lib/pages/board/components/AddPageMenu.svelte -->
<!-- "Add New Column" in the board's header, next to the settings: a menu to add a new Tasks list, note or whiteboard
     to the board, or to link a Tasks, Notes or Whiteboard page that isn't on the board yet (AddPageOptions). -->
<script>
  import AddPageOptions from './AddPageOptions.svelte';
  import { focusFirstOption, moveFocus } from '../../../utils/menuKeys.js';

  /**
   * @type {{
   *   board: import('../board.svelte.js').BoardStore,
   *   onAdded: () => void,
   *   open?: boolean
   * }}
   */
  let { board, onAdded, open = $bindable(false) } = $props();
  /** @type {HTMLElement} */
  let root;

  // Opened (also with the "Add a column" key), the first option has the focus: the arrow keys and Enter pick one.
  $effect(() => {
    if (open) focusFirstOption(root);
  });

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (open && !event.composedPath().includes(root)) open = false;
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="add-page" bind:this={root}>
  <button class="add-btn m3-icon" class:open title="Add New Column" aria-expanded={open} onclick={() => (open = !open)}>add</button>

  {#if open}
    <div class="menu" role="menu" tabindex="-1" onkeydown={moveFocus}>
      <AddPageOptions
        {board}
        onAdded={() => {
          open = false;
          onAdded();
        }} />
    </div>
  {/if}
</div>


<style>
  .add-page {
    position: relative;
  }

  /* Like the settings button next to it (PageHeader). */
  .add-btn {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-soft);
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    cursor: pointer;
    transition: color 0.4s, background-color 0.4s, transform 0.4s;
  }

  .add-btn:hover,
  .add-btn.open {
    color: var(--accent);
    background-color: var(--surface-raised);
  }

  .add-btn.open {
    transform: rotate(45deg);
  }

  .menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    box-sizing: border-box;
    width: 260px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 8px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 26px;
    box-shadow: 0 12px 40px var(--shadow);
    animation: drop-in 0.2s ease-out;
  }

  @keyframes drop-in {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

</style>
