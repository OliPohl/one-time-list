<!-- src/lib/pages/tasks/TasksPage.svelte -->
<!-- One list: task input, current task, widgets, the task list and its history. The data lives in `list.svelte.js`. -->
<script>
// @ts-nocheck
  import { flip } from 'svelte/animate';
  import { getListStore, widgetsEnabled, priorityOf } from './list.svelte.js';
  import TaskDialog from './components/TaskDialog.svelte';
  import Task from './components/Task.svelte';
  import TaskInput from './components/TaskInput.svelte';
  import NextTask from './components/NextTask.svelte';
  import History from './components/History.svelte';
  import Wave from './components/Wave.svelte';
  import { WidgetDock, WidgetSideLayer, setWidgets } from '$lib/widgets';
  import PageHeader from '$lib/app/PageHeader.svelte';
  import { layout } from '$lib/widgets/layout.svelte.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // The page view is re-created for every page, so the store never changes.
  // svelte-ignore state_referenced_locally
  const list = getListStore(page.id);
  setWidgets(list.widgets);

  /**
   * source 'list' reorders the list live, sources 'history' and 'current' show a drop slot at dropIndex.
   * overCurrent: held over the current task box, dropping there selects the task.
   * @type {{id: string, source: 'list' | 'history' | 'current', x: number, y: number, startY: number, offsetY: number, left: number, width: number, height: number, moved: boolean, dropIndex: number | null, overCurrent: boolean, startTasks: any[]} | null}
   */
  let taskDrag = $state(null);
  let taskListEl;
  let currentTaskEl = $state();

  /** The task open in the popup. @type {string | null} */
  let openTaskId = $state(null);
  let openTask = $derived(openTaskId === null ? null : list.findTask(openTaskId));

  /** What a task shows as a card (tags, description, the task popup), spread on <Task>. @param {import('./list.svelte.js').TaskItem} task */
  function advancedProps(task) {
    return {
      advanced: true,
      description: task.description,
      priority: priorityOf(task.priority),
      labels: list.labelsOf(task),
      onOpen: () => (openTaskId = task.id)
    };
  }

  /** Closes the popup. Sorted by priority, the list follows a changed priority. */
  function closeTask() {
    openTaskId = null;
    if (list.sortMode === 'priority') list.sortTasks('priority');
  }

  /** Deletes the task open in the popup, wherever it is (list, current task, history). */
  function deleteOpenTask() {
    if (openTaskId === null) return;
    if (list.history.some((task) => task.id === openTaskId)) list.deleteFromHistory(openTaskId);
    else list.removeTask(openTaskId);
    openTaskId = null;
  }

  /** Tasks and history, where they end is where free widgets can be below them. */
  let taskContentEl = $state();
  /** @type {HTMLElement | undefined} */
  let wrapperEl = $state();

  /** Tells the widgets where the tasks are on the screen: the column and where the tasks end. */
  function measureColumn() {
    if (!taskListEl || !taskContentEl) return;
    const column = taskListEl.getBoundingClientRect();
    layout.column = { left: column.left, right: column.right, bottom: taskContentEl.getBoundingClientRect().bottom };
  }

  // Measured again whenever the tasks or anything above them changes size, the list scrolls, the window is resized
  // or the page has slid into place.
  $effect(() => {
    if (!taskListEl || !taskContentEl || !wrapperEl) return;
    const list = taskListEl;
    const wrapper = wrapperEl;
    const observer = new ResizeObserver(measureColumn);
    observer.observe(list);
    observer.observe(taskContentEl);
    list.addEventListener('scroll', measureColumn);
    wrapper.addEventListener('transitionend', measureColumn);
    window.addEventListener('resize', measureColumn);
    measureColumn();
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', measureColumn);
      wrapper.removeEventListener('transitionend', measureColumn);
      window.removeEventListener('resize', measureColumn);
      layout.column = { left: 0, right: 0, bottom: Infinity };
    };
  });
  let draggedTask = $derived(
    taskDrag && (taskDrag.source === 'current' ? list.currentTask : (taskDrag.source === 'history' ? list.history : list.tasks).find(task => task.id === taskDrag.id))
  );
  // Active list plus the drop slot while a history item or the current task is dragged over it.
  let displayTasks = $derived(
    taskDrag && taskDrag.source !== 'list' && taskDrag.dropIndex !== null
      ? list.tasks.toSpliced(taskDrag.dropIndex, 0, { id: '__drop', isDropSlot: true })
      : list.tasks
  );

  function startTaskDrag(id, point, rect, source = 'list') {
    taskDrag = {
      id,
      source,
      x: point.clientX,
      y: point.clientY,
      startY: point.clientY,
      offsetY: point.clientY - rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      moved: false,
      dropIndex: null,
      overCurrent: false,
      startTasks: list.tasks
    };

    window.addEventListener('pointermove', moveTaskDrag);
    window.addEventListener('pointerup', endTaskDrag);
    window.addEventListener('pointercancel', endTaskDrag);
    navigator.vibrate?.(15);
    requestAnimationFrame(autoScroll);
  }

  function moveTaskDrag(event) {
    if (!taskDrag) return;
    taskDrag.x = event.clientX;
    taskDrag.y = event.clientY;
    reorderToPointer();
  }

  // Moves the dragged task (or the history drop slot) to the slot under the pointer.
  function reorderToPointer() {
    const currentRect = currentTaskEl?.getBoundingClientRect();
    taskDrag.overCurrent = !!currentRect &&
      taskDrag.x >= currentRect.left && taskDrag.x <= currentRect.right &&
      taskDrag.y >= currentRect.top && taskDrag.y <= currentRect.bottom;

    if (taskDrag.overCurrent) {
      // Over the current task box the list goes back to how it was, the task leaves it on drop.
      taskDrag.dropIndex = null;
      if (taskDrag.moved) {
        list.tasks = taskDrag.startTasks;
        taskDrag.moved = false;
      }
      return;
    }

    const listRect = taskListEl.getBoundingClientRect();
    const y = taskDrag.y - listRect.top + taskListEl.scrollTop;

    if (taskDrag.source !== 'list') {
      // History items and the current task only drop into the list once they are dragged above the history section.
      const historyTop = taskListEl.querySelector('[data-history]')?.getBoundingClientRect().top ?? Infinity;
      if (taskDrag.y >= historyTop) {
        taskDrag.dropIndex = null;
        return;
      }

      let index = 0;
      for (const element of taskListEl.querySelectorAll('[data-task-id]')) {
        if (element.offsetTop + element.offsetHeight / 2 < y) index++;
      }
      taskDrag.dropIndex = index;
      return;
    }

    let index = 0;
    for (const element of taskListEl.querySelectorAll('[data-task-id]')) {
      if (element.dataset.taskId === taskDrag.id) continue;
      if (element.offsetTop + element.offsetHeight / 2 < y) index++;
    }

    if (list.moveTask(taskDrag.id, index)) taskDrag.moved = true;
  }

  // Scrolls the list while the dragged task is held near its top or bottom edge.
  function autoScroll() {
    if (!taskDrag) return;

    const rect = taskListEl.getBoundingClientRect();
    const bottom = Math.min(rect.bottom, window.innerHeight - 180);
    const edge = 60;
    let speed = 0;

    // Only scroll in the direction the task is dragged, so picking up a task near an edge doesn't scroll.
    if (taskDrag.y < rect.top + edge && taskDrag.y < taskDrag.startY) speed = -(rect.top + edge - taskDrag.y) / 4;
    else if (taskDrag.y > bottom - edge && taskDrag.y > taskDrag.startY) speed = (taskDrag.y - bottom + edge) / 4;

    if (speed !== 0) {
      taskListEl.scrollTop += speed;
      reorderToPointer();
    }

    requestAnimationFrame(autoScroll);
  }

  function endTaskDrag() {
    window.removeEventListener('pointermove', moveTaskDrag);
    window.removeEventListener('pointerup', endTaskDrag);
    window.removeEventListener('pointercancel', endTaskDrag);

    if (taskDrag?.overCurrent) {
      // The current task dropped back on its own box stays where it is.
      if (taskDrag.source === 'history') list.insertFromHistory(taskDrag.id, 0);
      if (taskDrag.source !== 'current') list.selectTask(taskDrag.id);
    } else if (taskDrag?.source === 'current' && taskDrag.dropIndex !== null) {
      list.insertCurrent(taskDrag.dropIndex);
    } else if (taskDrag?.source === 'history' && taskDrag.dropIndex !== null) {
      list.insertFromHistory(taskDrag.id, taskDrag.dropIndex);
    } else if (taskDrag?.moved) {
      list.saveCustomOrder();
    }

    taskDrag = null;
  }
</script>


<main class="page-layout">
  <Wave bottom={list.hasTasks}/>
  <TaskInput
  placeholder="Add Task"
  heading="What's next?"
  onSubmit={(event) => list.addTask(event.message)}
  bottom={list.hasTasks} />

  <div class="task-warpper" class:bottom={list.hasTasks} bind:this={wrapperEl}>
    <PageHeader {page} visible={list.hasTasks} />

    <NextTask
    onShuffle={() => list.sortTasks('random')}
    onSortAlphanumeric={() => list.sortTasks('alphanumeric')}
    onSortPriority={() => list.sortTasks('priority')}
    onCustomOrder={() => list.restoreCustomOrder()}
    onUnselect ={() => list.unselectTask()}
    isDropTarget={taskDrag?.overCurrent ?? false}
    bind:taskContainer={currentTaskEl}>
      {#if list.currentTask}
        {#key list.currentTask.id}
          {@const activeId = list.currentTask.id}
          <!-- Hidden while it's dragged, the box shows where it came from. -->
          <div class="current-task" class:dragged={taskDrag?.source === 'current'}>
            <Task
              text={list.currentTask.text}
              onEdit={(event) => list.editTask(activeId, event.message)}
              onAction={() => list.completeTask(activeId)}
              onDelete={() => list.removeTask(activeId)}
              onDragStart={(point, rect) => startTaskDrag(activeId, point, rect, 'current')}
              isDragging={taskDrag?.source === 'current'}
              isCurrent={true}
              {...advancedProps(list.currentTask)} />
          </div>
        {/key}
      {:else if list.tasks.length > 0}
        <button class="select-next" onclick={() => list.selectTask(list.tasks[0].id)}>Select Task</button>
      {/if}
    </NextTask>

    {#if widgetsEnabled(page.options)}
      <WidgetDock />
    {/if}

    <div class="task-layout" bind:this={taskListEl}>
      <div class="task-content" bind:this={taskContentEl}>
        {#each displayTasks as task (task.id)}
          <div
            class="task-item"
            class:placeholder={task.isDropSlot || taskDrag?.id === task.id}
            style:height={task.isDropSlot ? `${taskDrag.height}px` : null}
            data-task-id={task.isDropSlot ? undefined : task.id}
            animate:flip={{ duration: 200 }}>
            {#if !task.isDropSlot}
              <Task
              text={task.text}
              onEdit={(event) => list.editTask(task.id, event.message)}
              onAction={() => list.selectTask(task.id)}
              onDelete={() => list.removeTask(task.id)}
              onDragStart={(point, rect) => startTaskDrag(task.id, point, rect)}
              isDragging={taskDrag?.id === task.id}
              isCurrent={false}
              {...advancedProps(task)} />
            {/if}
          </div>
        {/each}

        <History
          items={list.history}
          visible={list.hasTasks}
          draggingId={taskDrag?.source === 'history' ? taskDrag.id : null}
          onReturn={(id) => list.returnFromHistory(id)}
          onDelete={(id) => list.deleteFromHistory(id)}
          onEdit={(id, text) => list.editHistory(id, text)}
          onClear={() => list.clearHistory()}
          onDragStart={(id, point, rect) => startTaskDrag(id, point, rect, 'history')}
          taskProps={advancedProps} />
      </div>
    </div>
  </div>
</main>

{#if openTask}
  <TaskDialog task={openTask} {list} onClose={closeTask} onDelete={deleteOpenTask} />
{/if}

{#if widgetsEnabled(page.options)}
  <WidgetSideLayer visible={list.hasTasks} />
{/if}

{#if taskDrag && draggedTask}
  <div
    class="task-ghost"
    style:left="{taskDrag.left}px"
    style:top="{taskDrag.y - taskDrag.offsetY}px"
    style:width="{taskDrag.width}px">
    <Task text={draggedTask.text} isCurrent={false} isHistory={taskDrag.source === 'history' && taskDrag.dropIndex === null && !taskDrag.overCurrent} {...advancedProps(draggedTask)} />
  </div>
{/if}


<style>
  .page-layout {
    margin: auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;

    padding: 0 10px;

    overflow: auto;

    max-width: 600px;
    max-height: 100vh;

    /* Shape of a task card and the space between tasks, also used by NextTask and History. */
    --task-radius: 22px;
    --task-gap: 14px;
  }

  .task-warpper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    min-height: 0;
    width: 100%;
    transition: transform 2s cubic-bezier(0.76, 0, 0.24, 1);
    /* Hidden above the page while the list is empty. */
    transform: translateY(-100%);
  }

  /* No transform once it's down, so the header's settings panel can stack above the wave. */
  .bottom {
    transform: none;
  }

  .task-layout {
    position: relative;
    box-sizing: border-box;
    flex-grow: 1;
    width: 100%;
    overflow-y: auto;
    padding-top: 15px;
    padding-bottom: 180px;
  }

  .task-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--task-gap);
  }

  .task-item {
    width: 100%;
  }

  .task-item.placeholder {
    border-radius: var(--task-radius);
    outline: 2.5px dashed var(--line);
    outline-offset: -2.5px;
  }

  .task-item.placeholder > :global(*) {
    visibility: hidden;
  }

  .current-task {
    width: 100%;
  }

  .current-task.dragged {
    visibility: hidden;
  }

  .task-ghost {
    position: fixed;
    z-index: 2000;
    pointer-events: none;
    transform: scale(1.02);
    filter: drop-shadow(0 12px 30px var(--shadow));
  }

  .select-next {
    width: 100%;
    min-height: 50px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: "Roboto Slab", serif;
    font-size: 18px;
    color: var(--task);
    transition: filter 0.2s;
  }

  .select-next:hover {
    filter: brightness(130%);
  }

  .select-next:active {
    filter: brightness(90%);
  }
</style>
