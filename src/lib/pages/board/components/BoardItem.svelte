<!-- src/lib/pages/board/components/BoardItem.svelte -->
<!-- One page on a board, in a column's stack: its name with a menu, then a small Tasks page (the "Add Task" field,
     the current task with the sort button, the list and the history), a note, or a whiteboard's preview that opens
     (maximizes) in a window over the board to draw. A local page can be exported to a
     page of its own, a linked one shows that page's data and opens it from the menu. Each has its own settings
     (ItemSettings) and colors: a linked page its own, a local one the board's unless it picked some. Dragging is
     run by the board (BoardPage): the item shows where a dragged task would land, also when it comes from another
     item. The item itself is dragged by its head, to another spot in a stack or into a column of its own.
     A Tasks list's widgets are docked under its current task while they're on, except the ones placed in the
     board's free space (`isWidgetDocked`, see BoardPage). A linked page's widgets placed freely on that page are
     docked here, they keep that place there. -->
<script>
  import { flip } from 'svelte/animate';
  import Task from '../../tasks/components/Task.svelte';
  import NextTask from '../../tasks/components/NextTask.svelte';
  import History from '../../tasks/components/History.svelte';
  import ColumnInput from './ColumnInput.svelte';
  import ColumnNote from './ColumnNote.svelte';
  import ColumnWhiteboard from './ColumnWhiteboard.svelte';
  import WhiteboardWindow from '../../whiteboard/WhiteboardWindow.svelte';
  import { shapeCount } from '../../whiteboard/store.js';
  import ItemSettings from './ItemSettings.svelte';
  import { confirm, isInDialog } from '../../../app/confirm.svelte.js';
  import { navigation } from '../../../app/navigation.svelte.js';
  import { pressDrag } from '../../../utils/pressDrag.js';
  import { WidgetDock, setWidgets } from '$lib/widgets';
  import DragGhost from '$lib/widgets/components/DragGhost.svelte';
  import { layout } from '$lib/widgets/layout.svelte.js';

  /**
   * @typedef {import('../board.svelte.js').TaskSource} TaskSource
   * @typedef {{id: string, itemId: string, source: TaskSource, target: {itemId: string, index: number} | null, overCurrent: string | null, height: number}} Drag
   */

  /**
   * @type {{
   *   item: import('../board.svelte.js').Item,
   *   board: import('../board.svelte.js').BoardStore,
   *   boardPage: import('../../types.js').Page,
   *   drag: Drag | null,
   *   taskProps: (task: import('../../tasks/list.svelte.js').TaskItem, itemId: string) => Record<string, any>,
   *   onDragStart: (id: string, source: TaskSource, point: {clientX: number, clientY: number}, rect: DOMRect) => void,
   *   isWidgetDocked: (widget: any) => boolean,
   *   isItemDragged: boolean,
   *   onItemDragStart: (point: {clientX: number, clientY: number}, rect: DOMRect) => void
   * }}
   */
  let { item, board, boardPage, drag, taskProps, onDragStart, isWidgetDocked, isItemDragged, onItemDragStart } = $props();

  let linked = $derived(item.kind === 'link');
  let itemName = $derived(board.nameOf(item));
  let list = $derived(board.listOf(item));
  let note = $derived(board.noteOf(item));
  let drawingId = $derived(board.drawingOf(item));
  /** The whiteboard is open in its window. */
  let maximized = $state(false);
  let column = $derived(board.columnOf(item.id));

  // The item is re-created when its kind changes (exported), so its widgets never change.
  // svelte-ignore state_referenced_locally
  const widgets = board.widgetsOf(item);
  if (widgets) setWidgets(widgets);
  let widgetsShown = $derived(widgets !== null && board.widgetsEnabled(item));
  let columnIndex = $derived(column ? board.columns.indexOf(column) : -1);
  let stackIndex = $derived(column ? column.items.indexOf(item) : -1);

  /**
   * The list as shown while dragging. Like on a Tasks page, a task dragged within its list stays in the list as
   * its own placeholder and moves to where it would land. Dragged out of its list it leaves, and a list it would
   * land in (or a task from the history or current task) shows a slot there.
   */
  let displayTasks = $derived.by(() => {
    if (!list) return [];
    /** @type {any[]} */
    let tasks = list.tasks;
    const target = drag?.target?.itemId === item.id ? drag.target.index : null;
    const own = drag && drag.itemId === item.id && drag.source === 'list' ? tasks.find((task) => task.id === drag.id) : undefined;
    if (own) {
      tasks = tasks.filter((task) => task !== own);
      if (target !== null) tasks = tasks.toSpliced(target, 0, own);
    } else if (target !== null) {
      tasks = tasks.toSpliced(target, 0, { id: '__drop', isDropSlot: true });
    }
    return tasks;
  });

  let menuOpen = $state(false);
  let settingsOpen = $state(false);
  let renaming = $state(false);
  let name = $state('');
  /** @type {HTMLElement} */
  let headEl;
  /** @type {HTMLElement} */
  let itemEl;
  /** @type {HTMLInputElement | undefined} */
  let nameInput = $state();

  function startRename() {
    menuOpen = false;
    name = itemName;
    renaming = true;
  }

  $effect(() => {
    if (renaming) nameInput?.select();
  });

  function finishRename() {
    if (!renaming) return;
    renaming = false;
    board.renameItem(item.id, name);
  }

  /** Moves the item's whole column left or right. @param {-1 | 1} step */
  function move(step) {
    menuOpen = false;
    if (column) board.moveColumn(column.id, step);
  }

  /** Moves the item up or down in its column. @param {-1 | 1} step */
  function moveInStack(step) {
    menuOpen = false;
    board.moveItemInColumn(item.id, step);
  }

  /** Takes the item out of its stack, into a column of its own right after it. */
  function unstack() {
    menuOpen = false;
    board.moveItem(item.id, { at: columnIndex + 1 });
  }

  function exportPage() {
    menuOpen = false;
    board.exportItem(item.id, boardPage.options);
  }

  function openSettings() {
    menuOpen = false;
    settingsOpen = true;
  }

  function openPage() {
    menuOpen = false;
    if (item.kind === 'link') navigation.go({ kind: 'page', id: item.pageId });
  }

  /** A link only leaves the board. A local page is deleted with what's in it, after asking if there is something. */
  async function remove() {
    menuOpen = false;
    if (linked) {
      board.removeItem(item.id);
      return;
    }
    const tasks = list ? list.tasks.length + (list.currentTask ? 1 : 0) + list.history.length : 0;
    const drawn = drawingId ? shapeCount(drawingId) > 0 : false;
    let message = `"${itemName}" is deleted.`;
    if (tasks > 0) message = `"${itemName}" is deleted with its ${tasks} ${tasks === 1 ? 'task' : 'tasks'}.`;
    else if (note?.text.trim()) message = `"${itemName}" is deleted with its note.`;
    else if (drawn) message = `"${itemName}" is deleted with its drawing.`;
    if (tasks === 0 && !note?.text.trim() && !drawn) board.removeItem(item.id);
    else if (await confirm({ title: 'Delete Page', message, confirmLabel: 'Delete' })) board.removeItem(item.id);
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (menuOpen && !event.composedPath().includes(headEl) && !isInDialog(event)) menuOpen = false;
  }
</script>

<svelte:window onclick={handleClickOutside} />

<!-- Every page is one of the lists the keyboard shortcuts move between (taskCursor.svelte.js), only task lists have tasks. -->
<section
  class="item"
  class:linked
  data-item-id={item.id}
  data-task-list={list || note || drawingId ? item.id : undefined}
  data-list-kind={list ? 'tasks' : note ? 'notes' : drawingId ? 'whiteboard' : undefined}
  style={board.styleOf(item)}
  bind:this={itemEl}>
  <header
    class="head"
    bind:this={headEl}
    {@attach pressDrag({
      enabled: () => !renaming,
      isDragging: () => isItemDragged,
      onStart: (point) => {
        menuOpen = false;
        onItemDragStart(point, itemEl.getBoundingClientRect());
      }
    })}>
    {#if linked}
      <!-- A button, so pressing it never starts dragging the page. -->
      <button class="link-icon m3-icon" title="Go to Linked Page" onclick={openPage}>link</button>
    {/if}
    {#if renaming}
      <input
        class="name-input"
        type="text"
        maxlength="40"
        spellcheck="false"
        aria-label="Page Name"
        bind:value={name}
        bind:this={nameInput}
        onblur={finishRename}
        onkeydown={(event) => {
          if (event.key === 'Enter') finishRename();
          if (event.key === 'Escape') renaming = false;
        }} />
    {:else}
      <h2 class="name" title="Double-click to rename" ondblclick={startRename}>{itemName}</h2>
    {/if}
    <button class="menu-btn m3-icon" class:open={menuOpen} title="Page Menu" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>more_horiz</button>

    {#if menuOpen}
      <div class="menu">
        <button onclick={openSettings}><span class="m3-icon">settings</span>Settings</button>
        <button onclick={startRename}><span class="m3-icon">edit</span>Rename</button>
        <button disabled={columnIndex === 0} onclick={() => move(-1)}><span class="m3-icon">arrow_back</span>Move Left</button>
        <button disabled={columnIndex === board.columns.length - 1} onclick={() => move(1)}><span class="m3-icon">arrow_forward</span>Move Right</button>
        {#if column && column.items.length > 1}
          <button disabled={stackIndex === 0} onclick={() => moveInStack(-1)}><span class="m3-icon">arrow_upward</span>Move Up</button>
          <button disabled={stackIndex === column.items.length - 1} onclick={() => moveInStack(1)}><span class="m3-icon">arrow_downward</span>Move Down</button>
          <button onclick={unstack}><span class="m3-icon">view_column</span>Own Column</button>
        {/if}
        {#if linked}
          <button onclick={openPage}><span class="m3-icon">open_in_new</span>Go to Page</button>
          <button onclick={remove}><span class="m3-icon">link_off</span>Remove from Board</button>
        {:else}
          <button onclick={exportPage}><span class="m3-icon">output</span>Export to Own Page</button>
          <button class="danger" onclick={remove}><span class="m3-icon">delete</span>Delete Page</button>
        {/if}
      </div>
    {/if}
  </header>

  {#if drawingId}
    <ColumnWhiteboard {drawingId} open={maximized} onOpen={() => (maximized = true)} />
    {#if maximized}
      <WhiteboardWindow {drawingId} name={itemName} onClose={() => (maximized = false)} />
    {/if}
  {:else if note}
    <ColumnNote {note} />
  {:else if list}
    {@const tasks = list}
    <ColumnInput onSubmit={(text) => tasks.addTask(text)} />

    <div class="current" data-current-box>
      <NextTask compact list={tasks} isDropTarget={drag?.overCurrent === item.id}>
        {#if tasks.currentTask}
          {#key tasks.currentTask.id}
            {@const task = tasks.currentTask}
            <div class="current-task" class:dragged={drag?.id === task.id} data-widget-task={task.id} data-cursor-task={task.id}>
              <Task
                text={task.text}
                isCurrent={true}
                onEdit={(/** @type {{message: string}} */ event) => tasks.editTask(task.id, event.message)}
                onAction={() => tasks.completeTask(task.id)}
                onDelete={() => tasks.removeTask(task.id)}
                onDragStart={(/** @type {any} */ point, /** @type {DOMRect} */ rect) => onDragStart(task.id, 'current', point, rect)}
                isDragging={drag?.id === task.id}
                {...taskProps(task, item.id)} />
            </div>
          {/key}
        {:else if tasks.tasks.length > 0}
          <button class="select-next" onclick={() => tasks.selectTask(tasks.tasks[0].id)}>Select Task</button>
        {/if}
      </NextTask>
    </div>

    <div class="scroller" data-scroller data-fill>
      {#if widgetsShown}
        <div class="widgets" data-item-dock data-fill-content>
          <WidgetDock isDocked={isWidgetDocked} fixedMenu />
        </div>
      {/if}
      <div class="tasks" data-tasks data-fill-content>
        {#each displayTasks as task (task.id)}
          <div
            class="task-item"
            class:slot={task.isDropSlot || (drag?.id === task.id && drag?.itemId === item.id)}
            style:height={task.isDropSlot ? `${drag?.height ?? 0}px` : null}
            data-task-id={task.isDropSlot ? undefined : task.id}
            data-widget-task={task.isDropSlot ? undefined : task.id}
            data-cursor-task={task.isDropSlot ? undefined : task.id}
            animate:flip={{ duration: 200 }}>
            {#if !task.isDropSlot}
              <Task
                text={task.text}
                isCurrent={false}
                onEdit={(/** @type {{message: string}} */ event) => tasks.editTask(task.id, event.message)}
                onAction={() => tasks.selectTask(task.id)}
                onDelete={() => tasks.removeTask(task.id)}
                onDragStart={(/** @type {any} */ point, /** @type {DOMRect} */ rect) => onDragStart(task.id, 'list', point, rect)}
                isDragging={drag?.id === task.id}
                {...taskProps(task, item.id)} />
            {/if}
          </div>
        {/each}

        {#if displayTasks.length === 0 && !tasks.currentTask}
          <p class="empty">No tasks yet. Add one above or drag one here.</p>
        {/if}

        <History
          items={tasks.history}
          draggingId={drag?.source === 'history' ? drag.id : null}
          onReturn={(id) => tasks.returnFromHistory(id)}
          onDelete={(id) => tasks.deleteFromHistory(id)}
          onEdit={(id, text) => tasks.editHistory(id, text)}
          onClear={() => tasks.clearHistory()}
          onDragStart={(id, point, rect) => onDragStart(id, 'history', point, rect)}
          taskProps={(task) => taskProps(task, item.id)} />
      </div>
    </div>
  {/if}

  {#if widgets && layout.drag && layout.dragStore === widgets}
    {@const widget = widgets.get(layout.drag.id)}
    {#if widget}
      <DragGhost {widget} drag={layout.drag} />
    {/if}
  {/if}

  {#if settingsOpen}
    <ItemSettings {item} {board} {boardPage} onClose={() => (settingsOpen = false)} />
  {/if}
</section>


<style>
  /* Fills its spot in the column's stack: as tall as its content, or as tall as the stack gives it (see
     `shareHeight`), then its tasks or note scroll (`data-fill`). */
  .item {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background-color: var(--surface-raised);
    border-radius: 30px;
  }

  .link-icon {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    margin-left: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    border-radius: 50%;
    font-size: 20px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.3s, background-color 0.3s;
  }

  .link-icon:hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .link-icon + .name {
    margin-left: 0;
  }

  .head {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }

  .name {
    flex: 1;
    min-width: 0;
    margin: 0 0 0 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Stoke", serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .name-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 4px 12px;
    background-color: var(--surface);
    border: 2.5px solid var(--accent);
    border-radius: 14px;
    outline: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
  }

  .menu-btn {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-muted);
    font-size: 24px;
    cursor: pointer;
    transition: color 0.3s, background-color 0.3s;
  }

  .menu-btn:hover,
  .menu-btn.open {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 200px;
    padding: 8px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 22px;
    box-shadow: 0 12px 40px var(--shadow);
  }

  .menu button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: none;
    border: none;
    border-radius: 14px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }

  .menu button:hover:enabled {
    background-color: var(--surface-raised);
  }

  .menu button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .menu .danger:hover:enabled {
    color: var(--red);
  }

  .menu .m3-icon {
    font-size: 20px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }

  .current-task {
    width: 100%;
  }

  .current-task.dragged {
    visibility: hidden;
  }

  .select-next {
    width: 100%;
    min-height: 46px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    color: var(--task);
    transition: filter 0.2s;
  }

  .select-next:hover {
    filter: brightness(130%);
  }

  /* The dock under the current task, a box like on a Tasks page. In the card color: the page is the color the
     dock has there. */
  .widgets {
    margin-bottom: var(--task-gap);
  }

  .widgets :global(.dock) {
    margin-top: 0;
    padding: 8px;
    background-color: var(--surface);
    border-radius: var(--task-radius);
  }

  /* A page on a board is narrow: docked widgets and the ones in tasks show only their icon, not their name
     ("Timer"), like on a phone. */
  .widgets :global(.widget.dock .label),
  .item :global(.task-widgets .widget .label) {
    display: none;
  }

  /* The list and history scroll inside the page, the input and current task stay on top. It ends above the
     page's padding, so a task scrolled past its bottom is cut off there, not where the page's corners curve. */
  .scroller {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    margin: 0 -14px;
    padding: 4px 14px 0;
    /* The scrollbar only shows while the pointer is over the scrolling part. */
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.2s;
  }

  .scroller:hover {
    scrollbar-color: #494949 transparent;
  }

  /* Positioned, so the tasks' offsets are measured from the list (see `locate` in BoardPage). */
  .tasks {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--task-gap);
  }

  .task-item {
    width: 100%;
  }

  .task-item.slot {
    border-radius: var(--task-radius);
    outline: 2.5px dashed var(--line);
    outline-offset: -2.5px;
  }

  /* The dragged task in its own list is the placeholder, its card follows the pointer. */
  .task-item.slot > :global(*) {
    visibility: hidden;
  }

  .empty {
    margin: 0;
    padding: 18px 10px;
    border: 2.5px dashed var(--line);
    border-radius: var(--task-radius);
    text-align: center;
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    color: var(--text-muted);
  }
</style>
