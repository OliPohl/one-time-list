<!-- src/lib/app/Sidebar.svelte -->
<!-- Drawer with the dashboard, every page and folder and "Add New" (pages, widgets and folders). Opens from the menu
     button or a swipe from the left edge. Pages and folders are dragged to reorder them, into and out of folders.
     Folders can hold folders, a dragged folder takes everything in it along. -->
<script>
  import { slide } from 'svelte/transition';
  import { edgeSwipe } from '../utils/edgeSwipe.js';
  import { pressDrag } from '../utils/pressDrag.js';
  import { navigation } from './navigation.svelte.js';
  import { pages } from './pages.svelte.js';
  import { folders } from './folders.svelte.js';
  import SidebarPageItem from './SidebarPageItem.svelte';
  import SidebarFolder from './SidebarFolder.svelte';
  import VolumeControl from './VolumeControl.svelte';
  import { settings } from './settings.svelte.js';

  /** How far the closed drawer is moved past its own width, so its shadow is off screen too. */
  const HIDDEN_OFFSET = 60;

  /** Space at the top and bottom of the page list where dragging scrolls it. */
  const SCROLL_EDGE = 40;
  /** The top part of a folder that drops before the folder instead of into it. */
  const FOLDER_BEFORE = 0.3;
  /** Half the gap between rows, where the drop line is drawn. */
  const HALF_GAP = 3;
  /** How far each folder level is indented (margin and padding of .folder-pages). */
  const INDENT = 34;

  /** 0 (closed) to 1 (open) while a finger drags the drawer, otherwise null. @type {number | null} */
  let dragProgress = $state(null);
  /** @type {HTMLElement} */
  let drawer;

  let progress = $derived(dragProgress ?? (navigation.sidebarOpen ? 1 : 0));
  let view = $derived(navigation.view);
  let activePageId = $derived(view.kind === 'page' ? view.id : null);
  /** The page or folder whose name is being edited. @type {string | null} */
  let editingId = $state(null);

  /**
   * The page or folder being dragged and where it would be dropped: into `folder` (null for the top level) at
   * `index`. `line` is where the drop line is drawn inside the list, null when a collapsed folder is highlighted.
   * `depth` is the folder level it would land on, the drop line is indented that far.
   * @typedef {{
   *   kind: 'page' | 'folder', id: string, x: number, y: number, offsetX: number, offsetY: number, width: number,
   *   target: {folder: string | null, index: number, line: number | null, depth: number} | null
   * }} Drag
   */
  let drag = $state(/** @type {Drag | null} */ (null));
  /** @type {HTMLElement} */
  let list;

  let draggedPage = $derived(drag?.kind === 'page' ? pages.get(drag.id) : undefined);
  let draggedFolder = $derived(drag?.kind === 'folder' ? folders.get(drag.id) : undefined);

  /**
   * @param {'page' | 'folder'} kind
   * @param {string} id
   * @param {{clientX: number, clientY: number}} point
   * @param {DOMRect} rect
   */
  function startDrag(kind, id, point, rect) {
    drag = { kind, id, x: point.clientX, y: point.clientY, offsetX: point.clientX - rect.left, offsetY: point.clientY - rect.top, width: rect.width, target: null };
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', cancelDrag);
    navigator.vibrate?.(15);
    requestAnimationFrame(autoScroll);
  }

  /** @param {PointerEvent} event */
  function moveDrag(event) {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.target = findTarget();
  }

  /** Where the dragged page or folder would go at the pointer. */
  function findTarget() {
    if (!drag) return null;
    const y = drag.y;
    const x = drag.x;
    const base = list.getBoundingClientRect().top - list.scrollTop;
    /** @param {number} position */
    const lineAt = (position) => position - base;

    // A dragged folder can't go into itself, its own rows (and everything in it) are skipped.
    const ownBlock = drag.kind === 'folder' ? `[data-folder-block="${CSS.escape(drag.id)}"]` : null;
    const rows = /** @type {HTMLElement[]} */ ([...list.querySelectorAll('[data-row]')]).filter(
      (element) => !ownBlock || !element.closest(ownBlock)
    );
    if (rows.length === 0) return { folder: null, index: folders.tree.length, line: 0, depth: 0 };
    // Left edge of the top level rows, every level is indented one INDENT further.
    const levelsLeft = rows.find((element) => element.dataset.depth === '0')?.getBoundingClientRect().left ?? 0;
    /** @param {HTMLElement} row */
    const depthOf = (row) => Number(row.dataset.depth);

    /**
     * The gap between two rows (`above` null: before the first row). The pointer's left-right position picks how
     * deep it goes: over the indent of a level, on that level. Possible are the level of the row below up to the
     * level of the row above, or one deeper when that is a folder (into it).
     * @param {HTMLElement | undefined} above
     * @param {HTMLElement | undefined} below
     */
    const gap = (above, below) => {
      if (!above) return { folder: null, index: 0, line: lineAt((below?.getBoundingClientRect().top ?? 0) - HALF_GAP), depth: 0 };

      const aboveDepth = depthOf(above);
      const isFolder = above.dataset.row === 'folder';
      const deepest = aboveDepth + (isFolder ? 1 : 0);
      const shallowest = Math.min(below ? depthOf(below) : 0, deepest);
      const level = Math.min(Math.max(Math.floor((x - levelsLeft) / INDENT), shallowest), deepest);
      const line = lineAt(above.getBoundingClientRect().bottom + HALF_GAP);
      const aboveId = /** @type {string} */ (above.dataset.id);

      // Into the folder above: first when it's open, last when it's collapsed.
      if (isFolder && level === deepest) {
        const folder = folders.get(aboveId);
        return { folder: aboveId, index: folder?.collapsed ? folder.children.length : 0, line, depth: level };
      }

      // After the row above, or after the folder around it on that level.
      const ancestors = above.dataset.ancestors ? above.dataset.ancestors.split(' ') : [];
      const entryId = level === aboveDepth ? aboveId : ancestors[level];
      const folder = level === 0 ? null : ancestors[level - 1];
      const siblings = folder ? (folders.get(folder)?.children ?? []) : folders.tree;
      return { folder, index: siblings.findIndex((entry) => entry.id === entryId) + 1, line, depth: level };
    };

    // The row under the pointer, or the first one below it when it is between rows.
    const index = rows.findIndex((element) => element.getBoundingClientRect().bottom > y);
    if (index === -1) return gap(rows.at(-1), undefined);
    const row = rows[index];
    const rect = row.getBoundingClientRect();
    const above = gap(rows[index - 1], row);
    const below = gap(row, rows[index + 1]);

    if (row.dataset.row === 'folder') {
      const folder = folders.get(/** @type {string} */ (row.dataset.id));
      if (!folder) return null;
      if (y < rect.top + rect.height * FOLDER_BEFORE) return above;
      // The middle of a collapsed folder lights it up: in, last.
      if (folder.collapsed && y < rect.bottom - rect.height * FOLDER_BEFORE) {
        return { folder: folder.id, index: folder.children.length, line: null, depth: depthOf(row) + 1 };
      }
      return below;
    }
    return y < rect.top + rect.height / 2 ? above : below;
  }

  // Every frame while dragging: scrolls the list near its top or bottom and finds the target again.
  function autoScroll() {
    if (!drag) return;
    const rect = list.getBoundingClientRect();
    let speed = 0;
    if (drag.y < rect.top + SCROLL_EDGE) speed = -(rect.top + SCROLL_EDGE - drag.y) / 4;
    else if (drag.y > rect.bottom - SCROLL_EDGE) speed = (drag.y - rect.bottom + SCROLL_EDGE) / 4;
    if (speed !== 0) list.scrollTop += speed;
    drag.target = findTarget();
    requestAnimationFrame(autoScroll);
  }

  function stopDrag() {
    const target = drag?.target;
    if (drag && target) {
      folders.move(drag.id, target.folder, target.index);
    }
    cancelDrag();
    // The click that follows releasing the drag must not open the page or toggle the folder.
    /** @param {Event} event */
    const swallow = (event) => {
      event.stopPropagation();
      event.preventDefault();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    // No click follows when the pointer was released over a different element.
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
  }

  function cancelDrag() {
    drag = null;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', stopDrag);
    window.removeEventListener('pointercancel', cancelDrag);
  }

  // Closing the drawer ends a drag without moving anything.
  $effect(() => {
    if (!navigation.sidebarOpen) cancelDrag();
  });

  /**
   * @param {'page' | 'folder'} kind
   * @param {string} id
   */
  function dragRow(kind, id) {
    return pressDrag({
      // The row itself is a button, only its icon buttons and the name input don't start a drag.
      ignore: '.icon-btn, input',
      enabled: () => editingId === null,
      isDragging: () => drag?.id === id,
      onStart: (point, rect) => startDrag(kind, id, point, rect)
    });
  }

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

  <div class="pages" class:sorting={drag !== null} bind:this={list}>
    {@render entryList(folders.tree, [])}

    {#if drag?.target && drag.target.line !== null}
      <div class="drop-line" style:top="{drag.target.line}px" style:left="{8 + drag.target.depth * INDENT}px"></div>
    {/if}

    <button class="item add" class:active={view.kind === 'new-page'} onclick={() => navigation.go({ kind: 'new-page' })}>
      <span class="item-icon m3-icon">add</span>
      <span class="item-name">Add New</span>
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

<!-- Pages and folders of one level, folders with what's in them. `ancestors` are the folders they're in, outermost first. -->
{#snippet entryList(/** @type {import('./folders.svelte.js').Entry[]} */ entries, /** @type {string[]} */ ancestors)}
  {@const parentId = ancestors.at(-1) ?? null}
  {@const depth = ancestors.length}
  {#each entries as entry (entry.id)}
    {#if entry.kind === 'folder'}
      <div class="folder" class:placeholder={drag?.id === entry.id} data-folder-block={entry.id}>
        <div
          class="drag-row"
          class:drop-into={drag?.target?.folder === entry.id && drag.target.line === null}
          data-row="folder"
          data-id={entry.id}
          data-parent={parentId ?? ''}
          data-depth={depth}
          data-ancestors={ancestors.join(' ')}
          {@attach dragRow('folder', entry.id)}>
          <SidebarFolder
            folder={entry}
            {activePageId}
            editing={editingId === entry.id}
            onEditChange={(editing) => (editingId = editing ? entry.id : null)} />
        </div>
        {#if !entry.collapsed && entry.children.length > 0}
          <div class="folder-pages" transition:slide={{ duration: 250 }}>
            {@render entryList(entry.children, [...ancestors, entry.id])}
          </div>
        {/if}
      </div>
    {:else}
      {@const page = pages.get(entry.id)}
      {#if page}
        <div
          class="drag-row"
          class:placeholder={drag?.id === page.id}
          data-row="page"
          data-id={page.id}
          data-parent={parentId ?? ''}
          data-depth={depth}
          data-ancestors={ancestors.join(' ')}
          {@attach dragRow('page', page.id)}>
          <SidebarPageItem
            {page}
            active={page.id === activePageId}
            editing={editingId === page.id}
            onEditChange={(editing) => (editingId = editing ? page.id : null)} />
        </div>
      {/if}
    {/if}
  {/each}
{/snippet}

<!-- The dragged folder as it looks: with what's open in it. Nothing in it reacts. -->
{#snippet ghostList(/** @type {import('./folders.svelte.js').Entry[]} */ entries)}
  {#each entries as entry (entry.id)}
    {#if entry.kind === 'folder'}
      <div class="folder">
        <SidebarFolder folder={entry} activePageId={null} editing={false} onEditChange={() => {}} />
        {#if !entry.collapsed && entry.children.length > 0}
          <div class="folder-pages">
            {@render ghostList(entry.children)}
          </div>
        {/if}
      </div>
    {:else}
      {@const page = pages.get(entry.id)}
      {#if page}
        <SidebarPageItem {page} active={false} editing={false} onEditChange={() => {}} />
      {/if}
    {/if}
  {/each}
{/snippet}

<!-- Outside the drawer, which would clip it. -->
{#if drag && (draggedPage || draggedFolder)}
  <div class="ghost" style:left="{drag.x - drag.offsetX}px" style:top="{drag.y - drag.offsetY}px" style:width="{drag.width}px">
    {#if draggedPage}
      <SidebarPageItem page={draggedPage} active={false} editing={false} onEditChange={() => {}} />
    {:else if draggedFolder}
      {@render ghostList([draggedFolder])}
    {/if}
  </div>
{/if}


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
    margin: 6px 0;
    border: none;
    border-top: 1.5px solid var(--surface-active);
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
    position: relative;
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

  .folder,
  .folder-pages {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* What's in a folder is indented (INDENT per level), a line on the left shows which folder it's in. */
  .folder-pages {
    margin-left: 26px;
    padding-left: 8px;
    border-left: 1.5px solid var(--surface-active);
  }

  .drag-row {
    border-radius: 20px;
  }

  /* While dragging, nothing in the list reacts to the pointer, the drop line shows where it goes. */
  .pages.sorting {
    cursor: grabbing;
  }

  .pages.sorting :global(*) {
    pointer-events: none;
  }

  .placeholder {
    opacity: 0.35;
  }

  /* A collapsed folder the page would be dropped into. */
  .drop-into {
    outline: 2.5px solid var(--accent);
    outline-offset: -2.5px;
  }

  /* Above the dragged row, its indent shows how deep it goes. The dot marks where that level starts. */
  .drop-line {
    position: absolute;
    z-index: 3002;
    left: 8px;
    right: 8px;
    height: 2.5px;
    margin-top: -1.25px;
    border-radius: 2px;
    background-color: var(--accent);
    pointer-events: none;
  }

  .drop-line::before {
    content: '';
    position: absolute;
    left: -4px;
    top: 50%;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background-color: var(--accent);
    transform: translateY(-50%);
  }

  /* See-through, so the drop line under it stays visible. */
  .ghost {
    position: fixed;
    z-index: 3001;
    pointer-events: none;
    opacity: 0.8;
    background-color: var(--surface-raised);
    border-radius: 20px;
    box-shadow: 0 8px 24px var(--shadow);
    transform: scale(1.02);
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
