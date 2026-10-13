<!-- src/lib/pages/kanban/components/KanbanColumn.svelte -->
<!-- One column of a Kanban board, a small Tasks page: its name with a menu (rename, move, delete), the "Add Task"
     field, the current task with the sort buttons, the list and the history. Dragging is run by the board
     (KanbanPage): the column shows where a dragged task would land, also when it comes from another column. -->
<script>
  import { flip } from 'svelte/animate';
  import Task from '../../tasks/components/Task.svelte';
  import NextTask from '../../tasks/components/NextTask.svelte';
  import History from '../../tasks/components/History.svelte';
  import ColumnInput from './ColumnInput.svelte';
  import { confirm, isInDialog } from '../../../app/confirm.svelte.js';

  /**
   * @typedef {import('../board.svelte.js').TaskSource} TaskSource
   * @typedef {{id: string, columnId: string, source: TaskSource, target: {columnId: string, index: number} | null, overCurrent: string | null, height: number}} Drag
   */

  /**
   * @type {{
   *   column: import('../board.svelte.js').Column,
   *   board: import('../board.svelte.js').BoardStore,
   *   index: number,
   *   drag: Drag | null,
   *   taskProps: (task: import('../../tasks/list.svelte.js').TaskItem) => Record<string, any>,
   *   onDragStart: (id: string, source: TaskSource, point: {clientX: number, clientY: number}, rect: DOMRect) => void
   * }}
   */
  let { column, board, index, drag, taskProps, onDragStart } = $props();

  let list = $derived(column.list);
  let count = $derived(board.columns.length);

  /** The list as shown while dragging: without the dragged task, with a slot where it would land. */
  let displayTasks = $derived.by(() => {
    /** @type {any[]} */
    let tasks = list.tasks;
    if (drag && drag.columnId === column.id && drag.source === 'list') tasks = tasks.filter((task) => task.id !== drag.id);
    if (drag?.target?.columnId === column.id) tasks = tasks.toSpliced(drag.target.index, 0, { id: '__drop', isDropSlot: true });
    return tasks;
  });

  let menuOpen = $state(false);
  let renaming = $state(false);
  // svelte-ignore state_referenced_locally
  let name = $state(column.name);
  /** @type {HTMLElement} */
  let headEl;
  /** @type {HTMLInputElement | undefined} */
  let nameInput = $state();

  function startRename() {
    menuOpen = false;
    name = column.name;
    renaming = true;
  }

  $effect(() => {
    if (renaming) nameInput?.select();
  });

  function finishRename() {
    if (!renaming) return;
    renaming = false;
    board.renameColumn(column.id, name);
  }

  /** @param {-1 | 1} step */
  function move(step) {
    menuOpen = false;
    board.moveColumn(column.id, step);
  }

  async function deleteColumn() {
    menuOpen = false;
    const tasks = list.tasks.length + (list.currentTask ? 1 : 0) + list.history.length;
    const message = tasks === 0
      ? `"${column.name}" is deleted.`
      : `"${column.name}" is deleted with its ${tasks} ${tasks === 1 ? 'task' : 'tasks'}.`;
    if (await confirm({ title: 'Delete Column', message, confirmLabel: 'Delete' })) board.removeColumn(column.id);
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (menuOpen && !event.composedPath().includes(headEl) && !isInDialog(event)) menuOpen = false;
  }
</script>

<svelte:window onclick={handleClickOutside} />

<section class="column" data-column-id={column.id}>
  <header class="head" bind:this={headEl}>
    {#if renaming}
      <input
        class="name-input"
        type="text"
        maxlength="40"
        spellcheck="false"
        aria-label="Column Name"
        bind:value={name}
        bind:this={nameInput}
        onblur={finishRename}
        onkeydown={(event) => {
          if (event.key === 'Enter') finishRename();
          if (event.key === 'Escape') renaming = false;
        }} />
    {:else}
      <h2 class="name" title="Double-click to rename" ondblclick={startRename}>{column.name}</h2>
    {/if}
    <button class="menu-btn m3-icon" class:open={menuOpen} title="Column Menu" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>more_horiz</button>

    {#if menuOpen}
      <div class="menu">
        <button onclick={startRename}><span class="m3-icon">edit</span>Rename</button>
        <button disabled={index === 0} onclick={() => move(-1)}><span class="m3-icon">arrow_back</span>Move Left</button>
        <button disabled={index === count - 1} onclick={() => move(1)}><span class="m3-icon">arrow_forward</span>Move Right</button>
        <button class="danger" disabled={count <= 1} title={count <= 1 ? 'A board keeps at least one column' : undefined} onclick={deleteColumn}>
          <span class="m3-icon">delete</span>Delete Column
        </button>
      </div>
    {/if}
  </header>

  <ColumnInput onSubmit={(text) => list.addTask(text)} />

  <div class="current" data-current-box>
    <NextTask
      compact
      onShuffle={() => list.sortTasks('random')}
      onSortAlphanumeric={() => list.sortTasks('alphanumeric')}
      onSortPriority={() => list.sortTasks('priority')}
      onCustomOrder={() => list.restoreCustomOrder()}
      onUnselect={() => list.unselectTask()}
      isDropTarget={drag?.overCurrent === column.id}>
      {#if list.currentTask}
        {#key list.currentTask.id}
          {@const task = list.currentTask}
          <div class="current-task" class:dragged={drag?.id === task.id}>
            <Task
              text={task.text}
              isCurrent={true}
              onEdit={(/** @type {{message: string}} */ event) => list.editTask(task.id, event.message)}
              onAction={() => list.completeTask(task.id)}
              onDelete={() => list.removeTask(task.id)}
              onDragStart={(/** @type {any} */ point, /** @type {DOMRect} */ rect) => onDragStart(task.id, 'current', point, rect)}
              isDragging={drag?.id === task.id}
              {...taskProps(task)} />
          </div>
        {/key}
      {:else if list.tasks.length > 0}
        <button class="select-next" onclick={() => list.selectTask(list.tasks[0].id)}>Select Task</button>
      {/if}
    </NextTask>
  </div>

  <div class="scroller" data-scroller>
    <div class="tasks">
      {#each displayTasks as task (task.id)}
        <div
          class="task-item"
          class:slot={task.isDropSlot}
          style:height={task.isDropSlot ? `${drag?.height ?? 0}px` : null}
          data-task-id={task.isDropSlot ? undefined : task.id}
          animate:flip={{ duration: 200 }}>
          {#if !task.isDropSlot}
            <Task
              text={task.text}
              isCurrent={false}
              onEdit={(/** @type {{message: string}} */ event) => list.editTask(task.id, event.message)}
              onAction={() => list.selectTask(task.id)}
              onDelete={() => list.removeTask(task.id)}
              onDragStart={(/** @type {any} */ point, /** @type {DOMRect} */ rect) => onDragStart(task.id, 'list', point, rect)}
              isDragging={drag?.id === task.id}
              {...taskProps(task)} />
          {/if}
        </div>
      {/each}

      {#if displayTasks.length === 0 && !list.currentTask}
        <p class="empty">No tasks yet. Add one above or drag one here.</p>
      {/if}

      <History
        items={list.history}
        draggingId={drag?.source === 'history' ? drag.id : null}
        onReturn={(id) => list.returnFromHistory(id)}
        onDelete={(id) => list.deleteFromHistory(id)}
        onEdit={(id, text) => list.editHistory(id, text)}
        onClear={() => list.clearHistory()}
        onDragStart={(id, point, rect) => onDragStart(id, 'history', point, rect)}
        {taskProps} />
    </div>
  </div>
</section>


<style>
  /* On a phone a column is a bit narrower than the screen, so the next one peeks in. */
  .column {
    box-sizing: border-box;
    width: min(340px, calc(100vw - 60px));
    flex-shrink: 0;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 14px 0;
    background-color: var(--surface-raised);
    border-radius: 30px;
  }

  .head {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
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
    cursor: default;
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

  /* The list and history scroll inside the column, the input and current task stay on top. */
  .scroller {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0 -14px;
    padding: 4px 14px 14px;
  }

  .tasks {
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
