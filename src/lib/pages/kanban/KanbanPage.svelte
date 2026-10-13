<!-- src/lib/pages/kanban/KanbanPage.svelte -->
<!-- A Kanban board: columns side by side, each a small Tasks page (see KanbanColumn). Tasks are dragged within a
     column and between columns, onto a column's current task to select it there. The widgets are docked in their
     own column at the left of the board. The data lives in `board.svelte.js`. -->
<script>
  import { getBoardStore } from './board.svelte.js';
  import KanbanColumn from './components/KanbanColumn.svelte';
  import Task from '../tasks/components/Task.svelte';
  import TaskDialog from '../tasks/components/TaskDialog.svelte';
  import { widgetsEnabled, priorityOf } from '../tasks/list.svelte.js';
  import PageHeader from '$lib/app/PageHeader.svelte';
  import { WidgetDock, WidgetSideLayer, setWidgets } from '$lib/widgets';
  import { layout } from '$lib/widgets/layout.svelte.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // The page view is re-created for every page, so the store never changes.
  // svelte-ignore state_referenced_locally
  const board = getBoardStore(page.id);
  setWidgets(board.widgets);

  /** @typedef {import('./board.svelte.js').TaskSource} TaskSource */

  /** The task open in the popup. @type {string | null} */
  let openTaskId = $state(null);
  let openTask = $derived(openTaskId === null ? null : (board.findTask(openTaskId)?.task ?? null));

  /** What a task shows as a card, spread on <Task>. @param {import('../tasks/list.svelte.js').TaskItem} task */
  function taskProps(task) {
    return {
      advanced: true,
      description: task.description,
      priority: priorityOf(task.priority),
      labels: board.labelsOf(task),
      onOpen: () => (openTaskId = task.id)
    };
  }

  /** Closes the popup. A column sorted by priority follows a changed priority. */
  function closeTask() {
    const list = openTaskId === null ? null : board.findTask(openTaskId)?.column.list;
    openTaskId = null;
    if (list?.sortMode === 'priority') list.sortTasks('priority');
  }

  /** Deletes the task open in the popup, wherever it is. */
  function deleteOpenTask() {
    const found = openTaskId === null ? null : board.findTask(openTaskId);
    if (found) {
      const list = found.column.list;
      if (list.history.includes(found.task)) list.deleteFromHistory(found.task.id);
      else list.removeTask(found.task.id);
    }
    openTaskId = null;
  }

  /**
   * The dragged task: where it came from, where it would land (`target`: a column and the index in its list) or
   * the column whose current task box it's held over (`overCurrent`, dropping selects it there).
   * @type {{id: string, columnId: string, source: TaskSource, x: number, y: number, offsetX: number, offsetY: number, width: number, height: number, target: {columnId: string, index: number} | null, overCurrent: string | null} | null}
   */
  let drag = $state(null);
  /** @type {HTMLElement | undefined} */
  let boardEl = $state();

  let draggedTask = $derived.by(() => (drag ? (board.findTask(drag.id)?.task ?? null) : null));

  /**
   * @param {string} columnId
   * @param {string} id
   * @param {TaskSource} source
   * @param {{clientX: number, clientY: number}} point
   * @param {DOMRect} rect
   */
  function startDrag(columnId, id, source, point, rect) {
    const list = board.column(columnId)?.list;
    if (!list) return;
    drag = {
      id,
      columnId,
      source,
      x: point.clientX,
      y: point.clientY,
      offsetX: point.clientX - rect.left,
      offsetY: point.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      // A task of the list leaves a slot where it was, so nothing jumps when the drag starts.
      target: source === 'list' ? { columnId, index: list.tasks.findIndex((task) => task.id === id) } : null,
      overCurrent: null
    };
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', cancelDrag);
    navigator.vibrate?.(15);
    requestAnimationFrame(autoScroll);
  }

  /** @param {PointerEvent} event */
  function moveDrag(event) {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    locate();
  }

  /** The column under the pointer, by its left and right edge. @returns {HTMLElement | null} */
  function columnAtPointer() {
    if (!drag || !boardEl) return null;
    for (const element of /** @type {NodeListOf<HTMLElement>} */ (boardEl.querySelectorAll('[data-column-id]'))) {
      const rect = element.getBoundingClientRect();
      if (drag.x >= rect.left && drag.x <= rect.right) return element;
    }
    return null;
  }

  // Where the dragged task would land. Between two columns it keeps the last spot.
  function locate() {
    if (!drag) return;
    const columnEl = columnAtPointer();
    if (!columnEl) return;
    const columnId = /** @type {string} */ (columnEl.dataset.columnId);

    const current = columnEl.querySelector('[data-current-box]')?.getBoundingClientRect();
    if (current && drag.y >= current.top && drag.y <= current.bottom) {
      drag.overCurrent = columnId;
      drag.target = null;
      return;
    }
    drag.overCurrent = null;

    // A completed task dropped back on its own column's history stays there.
    const historyTop = columnEl.querySelector('[data-history]')?.getBoundingClientRect().top ?? Infinity;
    if (drag.source === 'history' && drag.columnId === columnId && drag.y >= historyTop) {
      drag.target = null;
      return;
    }

    let index = 0;
    for (const element of columnEl.querySelectorAll('[data-task-id]')) {
      const rect = element.getBoundingClientRect();
      if (rect.top + rect.height / 2 < drag.y) index++;
    }
    drag.target = { columnId, index };
  }

  // Scrolls the column under the pointer near its top or bottom (only one that has more tasks than fit), and the
  // board near its left or right edge.
  function autoScroll() {
    if (!drag || !boardEl) return;
    const edge = 60;
    let scrolled = false;

    const scroller = columnAtPointer()?.querySelector('[data-scroller]');
    if (scroller && scroller.scrollHeight > scroller.clientHeight) {
      const rect = scroller.getBoundingClientRect();
      if (drag.y < rect.top + edge && drag.y > rect.top - edge) scroller.scrollTop -= (rect.top + edge - drag.y) / 4;
      else if (drag.y > rect.bottom - edge && drag.y < rect.bottom + edge) scroller.scrollTop += (drag.y - rect.bottom + edge) / 4;
      scrolled = true;
    }

    const rect = boardEl.getBoundingClientRect();
    if (drag.x < rect.left + edge) boardEl.scrollLeft -= (rect.left + edge - drag.x) / 4;
    else if (drag.x > rect.right - edge) boardEl.scrollLeft += (drag.x - rect.right + edge) / 4;

    if (scrolled) locate();
    requestAnimationFrame(autoScroll);
  }

  function stopListening() {
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', cancelDrag);
  }

  function endDrag() {
    stopListening();
    if (drag?.overCurrent) board.selectTask(drag.id, drag.columnId, drag.source, drag.overCurrent);
    else if (drag?.target) board.moveTask(drag.id, drag.columnId, drag.source, drag.target.columnId, drag.target.index);
    drag = null;
  }

  function cancelDrag() {
    stopListening();
    drag = null;
  }

  /** Adds a column and scrolls to it. */
  function addColumn() {
    board.addColumn();
    requestAnimationFrame(() => boardEl?.scrollTo({ left: boardEl.scrollWidth, behavior: 'smooth' }));
  }

  /** Tells the widgets where the tasks are: across the board, down to where the longest column ends. */
  function measureColumn() {
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    let bottom = rect.top;
    for (const element of boardEl.querySelectorAll('[data-column-id]')) bottom = Math.max(bottom, element.getBoundingClientRect().bottom);
    layout.column = { left: rect.left, right: rect.right, bottom };
  }

  $effect(() => {
    if (!boardEl) return;
    const element = boardEl;
    const observer = new ResizeObserver(measureColumn);
    observer.observe(element);
    for (const column of element.querySelectorAll('[data-column-id]')) observer.observe(column);
    // Columns added later are observed too.
    void board.columns.length;
    window.addEventListener('resize', measureColumn);
    measureColumn();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureColumn);
      layout.column = { left: 0, right: 0, bottom: Infinity };
    };
  });
</script>


<main class="kanban-page">
  <PageHeader {page} />

  <div class="board" bind:this={boardEl}>
    {#if widgetsEnabled(page.options)}
      <aside class="widgets" aria-label="Widgets">
        <WidgetDock />
      </aside>
    {/if}

    {#each board.columns as column, index (column.id)}
      <KanbanColumn
        {column}
        {board}
        {index}
        {drag}
        {taskProps}
        onDragStart={(id, source, point, rect) => startDrag(column.id, id, source, point, rect)} />
    {/each}

    <button class="add-column" onclick={addColumn}>
      <span class="add-icon m3-icon">add</span>
      <span>New Column</span>
    </button>
  </div>
</main>

{#if openTask}
  <TaskDialog task={openTask} list={board} onClose={closeTask} onDelete={deleteOpenTask} />
{/if}

{#if widgetsEnabled(page.options)}
  <WidgetSideLayer />
{/if}

{#if drag && draggedTask}
  <div
    class="task-ghost"
    style:left="{drag.x - drag.offsetX}px"
    style:top="{drag.y - drag.offsetY}px"
    style:width="{drag.width}px">
    <!-- Only shows the task, it can't be used. -->
    <Task
      text={draggedTask.text}
      isCurrent={false}
      onAction={() => {}}
      onDelete={() => {}}
      onEdit={() => {}}
      isHistory={drag.source === 'history' && !drag.target && !drag.overCurrent}
      {...taskProps(draggedTask)} />
  </div>
{/if}


<style>
  .kanban-page {
    box-sizing: border-box;
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0 20px;

    /* Shape of a task card and the space between tasks, like on a Tasks page. */
    --task-radius: 22px;
    --task-gap: 14px;
  }

  /* Keeps the title clear of the menu button. Below 741px the header has its own layout for that. */
  @media (min-width: 741px) {
    .kanban-page :global(.page-header) {
      padding-left: 66px;
    }
  }

  /* The columns side by side, scrolling sideways when they don't fit. Each column scrolls its own tasks. */
  .board {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    overflow-x: auto;
    padding: 18px 0 20px;
  }

  /* On a phone, swiping the board stops at a column. */
  @media (max-width: 500px) {
    .board {
      scroll-snap-type: x proximity;
    }

    .board > :global(*) {
      scroll-snap-align: center;
    }
  }

  .widgets {
    box-sizing: border-box;
    width: min(300px, calc(100vw - 60px));
    flex-shrink: 0;
    max-height: 100%;
    overflow-y: auto;
  }

  /* The dock has its own top margin for the Tasks page. */
  .widgets :global(.dock) {
    margin-top: 0;
  }

  .add-column {
    width: 200px;
    min-height: 120px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: none;
    border: 2.5px dashed var(--line);
    border-radius: 30px;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    cursor: pointer;
    transition: color 0.3s, border-color 0.3s;
  }

  .add-column:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .add-icon {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
  }

  .task-ghost {
    position: fixed;
    z-index: 2000;
    pointer-events: none;
    transform: rotate(-1.5deg) scale(1.02);
    filter: drop-shadow(0 12px 30px var(--shadow));
  }
</style>
