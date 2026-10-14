<!-- src/lib/pages/board/components/AddPageMenu.svelte -->
<!-- "Add New Column" in the board's header, next to the settings: a menu to add a new Tasks list or note to the board, or
     to link a Tasks or Notes page that isn't on the board yet. -->
<script>
  import { pages } from '../../../app/pages.svelte.js';
  import tasksType from '../../tasks/index.js';
  import notesType from '../../notes/index.js';

  /**
   * @type {{
   *   board: import('../board.svelte.js').BoardStore,
   *   onAdded: () => void
   * }}
   */
  let { board, onAdded } = $props();

  let open = $state(false);
  /** @type {HTMLElement} */
  let root;

  /** The kinds of page a board can hold. */
  const TYPES = { tasks: tasksType, notes: notesType };
  const KINDS = /** @type {import('../board.svelte.js').ItemKind[]} */ (Object.keys(TYPES));

  let linkable = $derived(pages.list.filter((page) => page.type in TYPES && !board.isLinked(page.id)));

  /** @param {import('../board.svelte.js').ItemKind} kind */
  function add(kind) {
    board.addItem(kind);
    open = false;
    onAdded();
  }

  /** @param {string} pageId */
  function link(pageId) {
    board.linkPage(pageId);
    open = false;
    onAdded();
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (open && !event.composedPath().includes(root)) open = false;
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="add-page" bind:this={root}>
  <button class="add-btn m3-icon" class:open title="Add New Column" aria-expanded={open} onclick={() => (open = !open)}>add</button>

  {#if open}
    <div class="menu" role="menu">
      <span class="heading">New</span>
      {#each KINDS as kind (kind)}
        <button class="option" role="menuitem" onclick={() => add(kind)}>
          <span class="option-icon m3-icon">{TYPES[kind].icon}</span>
          <span class="option-name">{TYPES[kind].label}</span>
        </button>
      {/each}

      {#if linkable.length > 0}
        <span class="heading">Link Page</span>
        {#each linkable as page (page.id)}
          <button class="option" role="menuitem" onclick={() => link(page.id)}>
            <span class="option-icon m3-icon">{TYPES[/** @type {keyof typeof TYPES} */ (page.type)].icon}</span>
            <span class="option-name">{page.name}</span>
          </button>
        {/each}
      {/if}
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

  .heading {
    padding: 8px 14px 4px;
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    color: var(--text-muted);
  }

  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 14px;
    background: none;
    border: none;
    border-radius: 18px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    text-align: left;
    cursor: pointer;
    transition: color 0.4s, background-color 0.4s;
  }

  .option:hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .option-icon {
    flex-shrink: 0;
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
  }

  .option-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
