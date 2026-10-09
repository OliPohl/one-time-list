<!-- src/lib/app/Sidebar.svelte -->
<!-- Drawer with the dashboard, every page and "Add New Page". Opens from the menu button or a swipe from the left edge. -->
<script>
  import { edgeSwipe } from '../utils/edgeSwipe.js';
  import { navigation } from './navigation.svelte.js';
  import { pages } from './pages.svelte.js';
  import SidebarPageItem from './SidebarPageItem.svelte';
  import VolumeControl from './VolumeControl.svelte';
  import { settings } from './settings.svelte.js';

  /** How far the closed drawer is moved past its own width, so its shadow is off screen too. */
  const HIDDEN_OFFSET = 60;

  /** 0 (closed) to 1 (open) while a finger drags the drawer, otherwise null. @type {number | null} */
  let dragProgress = $state(null);
  /** @type {HTMLElement} */
  let drawer;

  let progress = $derived(dragProgress ?? (navigation.sidebarOpen ? 1 : 0));
  let view = $derived(navigation.view);
  /** The page whose name is being edited. @type {string | null} */
  let editingId = $state(null);

  // Closing the drawer cancels editing.
  $effect(() => {
    if (!navigation.sidebarOpen) editingId = null;
  });

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Escape') navigation.sidebarOpen = false;
  }

  $effect(() =>
    edgeSwipe({
      isOpen: () => navigation.sidebarOpen,
      width: () => drawer.offsetWidth + HIDDEN_OFFSET,
      onProgress: (value) => (dragProgress = value),
      onEnd: (open) => (navigation.sidebarOpen = open)
    })(window)
  );
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="scrim"
  class:dragging={dragProgress !== null}
  class:visible={progress > 0}
  style:opacity={progress}
  onclick={() => (navigation.sidebarOpen = false)}
></div>

<nav
  class="drawer"
  class:dragging={dragProgress !== null}
  style:transform="translateX(calc({progress - 1} * (100% + {HIDDEN_OFFSET}px)))"
  aria-hidden={progress === 0}
  inert={progress === 0}
  bind:this={drawer}
>
  <button class="item dashboard" class:active={view.kind === 'dashboard'} onclick={() => navigation.go({ kind: 'dashboard' })}>
    <span class="item-icon m3-icon">space_dashboard</span>
    <span class="item-name">Dashboard</span>
  </button>

  <!-- Same line as above the volume and settings at the bottom. -->
  <hr class="divider" />

  <h2 class="section">Pages</h2>

  <div class="pages">
    {#each pages.list as page (page.id)}
      <SidebarPageItem
        {page}
        active={view.kind === 'page' && view.id === page.id}
        editing={editingId === page.id}
        onEditChange={(editing) => (editingId = editing ? page.id : null)} />
    {/each}

    <button class="item add" class:active={view.kind === 'new-page'} onclick={() => navigation.go({ kind: 'new-page' })}>
      <span class="item-icon m3-icon">add</span>
      <span class="item-name">Add New Page</span>
    </button>
  </div>

  <div class="bottom">
    <VolumeControl />
    <button class="item" class:active={settings.dialogOpen} onclick={() => (settings.dialogOpen = true)}>
      <span class="item-icon m3-icon">settings</span>
      <span class="item-name">Settings</span>
    </button>
  </div>
</nav>


<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 2999;
    background-color: var(--scrim);
    pointer-events: none;
    transition: opacity 0.35s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .scrim.visible {
    pointer-events: all;
  }

  .drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 3000;
    box-sizing: border-box;
    width: min(300px, 85vw);
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 76px 12px 24px;
    /* Only the page list scrolls, see `.pages`. */
    overflow: hidden;
    background-color: var(--surface-raised);
    border-radius: 0 30px 30px 0;
    box-shadow: 0 0 40px var(--shadow);
    transition: transform 0.35s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .dragging {
    transition: none;
  }

  .divider {
    flex-shrink: 0;
    width: 100%;
    height: 0;
    margin: 6px 0 0;
    border: none;
    border-top: 1.5px solid var(--surface-active);
  }

  .section {
    margin: 12px 16px 6px;
    font-family: "Stoke", serif;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--task);
  }

  /* Pushed to the bottom of the drawer. */
  .bottom {
    margin-top: auto;
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1.5px solid var(--surface-active);
  }

  /* Fixed heights everywhere, nothing gets squeezed when the list is long. */
  .drawer > *,
  .pages > :global(*) {
    flex-shrink: 0;
  }

  /* Takes the space between the top items and the bottom block, scrolls when there are many pages. */
  .pages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .drawer {
    --sidebar-item-height: 48px;
  }

  .item {
    box-sizing: border-box;
    height: var(--sidebar-item-height);
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 0 16px;
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

  .item:hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .item.active {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .item.add {
    color: var(--text-muted);
  }

  .item.add:hover,
  .item.add.active {
    color: var(--accent);
  }

  .item-icon {
    flex-shrink: 0;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  }

  .item-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
