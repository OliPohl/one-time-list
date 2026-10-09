<!-- src/lib/pages/dashboard/LinkSlot.svelte -->
<!-- An empty dashboard slot: "Link Page" opens a list of the pages that aren't on the dashboard yet,
     and "Add New Page" at the end, which links the new page here once it's created. -->
<script>
  import { PAGE_TYPES } from '../index.js';
  import { navigation } from '../../app/navigation.svelte.js';
  import { dashboard } from '../../app/dashboard.svelte.js';

  let open = $state(false);
  /** @type {HTMLElement} */
  let root;

  /** @param {string} id */
  function link(id) {
    dashboard.link(id);
    open = false;
  }

  function addPage() {
    dashboard.linkNextPage = true;
    navigation.go({ kind: 'new-page' });
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (open && !event.composedPath().includes(root)) open = false;
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="slot empty" bind:this={root}>
  <button class="link-btn" aria-expanded={open} onclick={() => (open = !open)}>
    <span class="link-icon m3-icon">add_link</span>
    <span>Link Page</span>
  </button>

  {#if open}
    <div class="menu" role="menu">
      {#each dashboard.unlinked as page (page.id)}
        <button class="option" role="menuitem" onclick={() => link(page.id)}>
          <span class="option-icon m3-icon">{PAGE_TYPES[page.type].icon}</span>
          <span class="option-name">{page.name}</span>
        </button>
      {/each}
      {#if dashboard.unlinked.length > 0}<span class="divider"></span>{/if}
      <button class="option add" role="menuitem" onclick={addPage}>
        <span class="option-icon m3-icon">add</span>
        <span class="option-name">Add New Page</span>
      </button>
    </div>
  {/if}
</div>


<style>
  /* Blends into the page: only a soft dashed outline, no fill (see DashboardPage). */
  .empty {
    position: relative;
    border: 2.5px dashed var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .link-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    background: none;
    border: 2.5px solid var(--line);
    border-radius: 40px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    cursor: pointer;
    transition: color 0.4s, border-color 0.4s;
  }

  .link-btn:hover,
  .link-btn[aria-expanded='true'] {
    color: var(--accent);
    border-color: var(--accent);
  }

  .link-icon {
    font-size: 24px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }

  .menu {
    position: absolute;
    top: calc(50% + 32px);
    left: 50%;
    z-index: 20;
    box-sizing: border-box;
    width: min(260px, 90%);
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 8px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 26px;
    box-shadow: 0 12px 40px var(--shadow);
    translate: -50% 0;
    animation: drop-in 0.2s ease-out;
  }

  @keyframes drop-in {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
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

  .option.add {
    color: var(--text-muted);
  }

  .divider {
    height: 1.5px;
    margin: 6px 8px;
    background-color: var(--surface-active);
  }
</style>
