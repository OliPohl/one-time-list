<!-- src/routes/+page.svelte -->
<script >
// @ts-nocheck
  import { onMount, untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { TaskInput, Task, Wave, NextTask, History } from '$lib';
  import { WidgetDock, WidgetSideLayer, widgets } from '$lib/widgets';
  import { unlockAudio, playComplete } from '$lib/sounds.js';

  /** @type {Array<{id: string, text: string, createdAt: number}>} */
  let tasks = $state([]);
  let currentTask = $state(null);
  /** Completed tasks, newest first. */
  let history = $state([]);
  /** Task ids in the user's own order: the order added, until a task is dragged. */
  let customOrder = $state([]);
  /** 'custom', 'alphanumeric' or 'random' */
  let sortMode = $state('custom');
  /**
   * source 'list' reorders the list live, source 'history' shows a drop slot at dropIndex.
   * @type {{id: string, source: 'list' | 'history', y: number, startY: number, offsetY: number, left: number, width: number, height: number, moved: boolean, dropIndex: number | null} | null}
   */
  let taskDrag = $state(null);
  let taskListEl;
  let draggedTask = $derived(taskDrag && (taskDrag.source === 'history' ? history : tasks).find(task => task.id === taskDrag.id));
  // Active list plus the drop slot while a history item is dragged over it.
  let displayTasks = $derived(
    taskDrag?.source === 'history' && taskDrag.dropIndex !== null
      ? tasks.toSpliced(taskDrag.dropIndex, 0, { id: '__drop', isDropSlot: true })
      : tasks
  );
  let hasTasks = $derived(tasks.length > 0 || currentTask !== null);
  let isLoaded = $state(false);

  function generateUniqueId() {
  let newId;
  let isTaken = true;

  while (isTaken) {
    newId = Math.random().toString(36).substring(2, 8);
    isTaken = tasks.some(task => task.id === newId) ||  currentTask?.id === newId || history.some(task => task.id === newId);
  }
  return newId;
  }

  function compareAlphanumeric(a, b) {
    return a.text.localeCompare(b.text, undefined, { numeric: true, sensitivity: 'base' });
  }

  function shuffle(list) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function customIndex(task) {
    const index = customOrder.indexOf(task.id);
    return index === -1 ? Infinity : index;
  }

  // @ts-ignore
  function addTask(text) {
    const task = {
      id: generateUniqueId(),
      text: text,
      createdAt: Date.now()
    };

    tasks = [...tasks, task];
    customOrder = [...customOrder, task.id];
  }

  // Puts a task back into the list at the spot matching the current sort mode.
  function returnToList(task) {
    let index;
    if (sortMode === 'alphanumeric') {
      index = tasks.findIndex(other => compareAlphanumeric(task, other) < 0);
    } else if (sortMode === 'random') {
      index = Math.floor(Math.random() * (tasks.length + 1));
    } else {
      index = tasks.findIndex(other => customIndex(other) > customIndex(task));
    }

    if (index === -1) index = tasks.length;
    tasks = tasks.toSpliced(index, 0, task);
  }

  function sortTasks(mode) {
    sortMode = mode;
    tasks = mode === 'alphanumeric' ? tasks.toSorted(compareAlphanumeric) : shuffle(tasks);
  }

  function restoreCustomOrder() {
    sortMode = 'custom';
    tasks = tasks.toSorted((a, b) => customIndex(a) - customIndex(b));
  }

  // The current list order becomes the new custom order.
  function saveCustomOrder() {
    const order = tasks.map(task => task.id);

    if (currentTask) {
      const oldIndex = customOrder.indexOf(currentTask.id);
      order.splice(oldIndex === -1 ? 0 : Math.min(oldIndex, order.length), 0, currentTask.id);
    }

    customOrder = order;
    sortMode = 'custom';
  }

  function startTaskDrag(id, point, rect, source = 'list') {
    taskDrag = {
      id,
      source,
      y: point.clientY,
      startY: point.clientY,
      offsetY: point.clientY - rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      moved: false,
      dropIndex: null
    };

    window.addEventListener('pointermove', moveTaskDrag);
    window.addEventListener('pointerup', endTaskDrag);
    window.addEventListener('pointercancel', endTaskDrag);
    navigator.vibrate?.(15);
    requestAnimationFrame(autoScroll);
  }

  function moveTaskDrag(event) {
    if (!taskDrag) return;
    taskDrag.y = event.clientY;
    reorderToPointer();
  }

  // Moves the dragged task (or the history drop slot) to the slot under the pointer.
  function reorderToPointer() {
    const listRect = taskListEl.getBoundingClientRect();
    const y = taskDrag.y - listRect.top + taskListEl.scrollTop;

    if (taskDrag.source === 'history') {
      // History items only drop into the list once they are dragged above the history section.
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

    const from = tasks.findIndex(task => task.id === taskDrag.id);
    if (from === -1 || from === index) return;

    const dragged = tasks[from];
    tasks = tasks.toSpliced(from, 1).toSpliced(index, 0, dragged);
    taskDrag.moved = true;
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

    if (taskDrag?.source === 'history' && taskDrag.dropIndex !== null) {
      const task = history.find(item => item.id === taskDrag.id);
      if (task) {
        history = history.filter(item => item.id !== task.id);
        tasks = tasks.toSpliced(taskDrag.dropIndex, 0, withoutCompletion(task));
        saveCustomOrder();
      }
    } else if (taskDrag?.moved) {
      saveCustomOrder();
    }

    taskDrag = null;
  }

  function withoutCompletion(task) {
    // eslint-disable-next-line no-unused-vars
    const { completedAt, ...rest } = task;
    return rest;
  }

  function returnFromHistory(id) {
    const task = history.find(item => item.id === id);
    if (!task) return;

    history = history.filter(item => item.id !== id);
    returnToList(withoutCompletion(task));
  }

  function editHistory(id, newText) {
    const task = history.find(item => item.id === id);
    if (task) task.text = newText;
  }

  function deleteFromHistory(id) {
    history = history.filter(item => item.id !== id);
    customOrder = customOrder.filter(taskId => taskId !== id);
  }

  function clearHistory() {
    const ids = new Set(history.map(item => item.id));
    customOrder = customOrder.filter(taskId => !ids.has(taskId));
    history = [];
  }

  function editTask(id, newText) {
    if (currentTask && id === currentTask.id) {
      currentTask.text = newText;
    } else {
      const taskToEdit = tasks.find(task => task.id === id);
      if (taskToEdit) {
      taskToEdit.text = newText;
      }
    }
  }

  // @ts-ignore
  function removeTask(id) {
    customOrder = customOrder.filter(taskId => taskId !== id);

    if (id === currentTask?.id) {
      currentTask = null;
    } else {
      tasks = tasks.filter(task => task.id !== id);
    }
  }

  function selectTask(id) {
    if (currentTask) {
      returnToList(currentTask);
    }

    const taskToSelect = tasks.find(task => task.id === id);
    if (taskToSelect) {
      currentTask = taskToSelect;
      tasks = tasks.filter(task => task.id !== id);
      widgets.taskSelected();
    }
  }

  function completeTask(id) {
    const task = currentTask?.id === id ? currentTask : tasks.find(item => item.id === id);
    if (!task) return;

    // Keep the id in the custom order so returning the task puts it back in its old spot.
    history = [{ ...task, completedAt: Date.now() }, ...history];
    if (task === currentTask) {
      currentTask = null;
    } else {
      tasks = tasks.filter(item => item.id !== id);
    }

    playComplete();
    widgets.taskCompleted();
  }

  function unselectTask() {
    if (currentTask) {
      returnToList(currentTask);
      currentTask = null;
    }
  }

  $effect(() => {
    if (!isLoaded) return;
    localStorage.setItem('otl_tasks', JSON.stringify(tasks));
  });

  $effect(() => {
    if (!isLoaded) return;
    localStorage.setItem('otl_current_task', JSON.stringify(currentTask));
  });

  $effect(() => {
    if (!isLoaded) return;
    localStorage.setItem('otl_sort_mode', sortMode);
  });

  $effect(() => {
    if (!isLoaded) return;
    localStorage.setItem('otl_custom_order', JSON.stringify(customOrder));
  });

  $effect(() => {
    if (!isLoaded) return;
    localStorage.setItem('otl_history', JSON.stringify(history));
  });

  $effect(() => {
    if (!isLoaded) return;
    widgets.save();
  });

  // Reset all widgets once the list is empty.
  $effect(() => {
    if (isLoaded && !hasTasks) untrack(() => widgets.resetAll());
  });

  onMount(() => {
    const savedTasks = localStorage.getItem('otl_tasks');
    const savedCurrent = localStorage.getItem('otl_current_task');

    if (savedTasks) {
      // Older saves have no createdAt, keep their stored order.
      const now = Date.now();
      tasks = JSON.parse(savedTasks).map((task, index, list) => ({
        ...task,
        createdAt: task.createdAt ?? now - (list.length - index)
      }));
   }
  
    if (savedCurrent) {
      currentTask = JSON.parse(savedCurrent);
      if (currentTask && currentTask.createdAt === undefined) currentTask.createdAt = Date.now();
    }

    history = JSON.parse(localStorage.getItem('otl_history') ?? '[]');

    const savedMode = localStorage.getItem('otl_sort_mode');
    sortMode = savedMode === 'alphanumeric' || savedMode === 'random' ? savedMode : 'custom';

    // Without a saved custom order fall back to the order the tasks were added.
    const allTasks = currentTask ? [...tasks, currentTask] : tasks;
    const savedOrder = JSON.parse(localStorage.getItem('otl_custom_order') ?? 'null');
    customOrder = savedOrder ?? allTasks.toSorted((a, b) => a.createdAt - b.createdAt).map(task => task.id);
    for (const task of allTasks) {
      if (!customOrder.includes(task.id)) customOrder.push(task.id);
    }

    unlockAudio();
    widgets.load();
    isLoaded = true;
  });
</script>


<main class="page-layout">
  <Wave bottom={hasTasks}/>
  <TaskInput 
  placeholder="Add Task" 
  heading="What's next?" 
  onSubmit={(event) => addTask(event.message)} 
  bottom={hasTasks} />

  <div class="task-warpper" class:bottom={hasTasks ? "bottom" : ""}>
    <NextTask 
    onShuffle={() => sortTasks('random')}
    onSortAlphanumeric={() => sortTasks('alphanumeric')}
    onCustomOrder={() => restoreCustomOrder()}
    onUnselect ={() => unselectTask()}>
      {#if currentTask}
        {#key currentTask.id}
          {@const activeId = currentTask.id}
          <Task 
            text={currentTask.text} 
            onEdit={(event) => editTask(activeId, event.message)} 
            onAction={() => completeTask(activeId)}
            onDelete={() => removeTask(activeId)}
            isCurrent={true} />
        {/key}
      {:else if tasks.length > 0}
        <button class="select-next" onclick={() => selectTask(tasks[0].id)}>Select Task</button>
      {/if}
    </NextTask>

    <WidgetDock />

    <div class="task-layout" bind:this={taskListEl}>
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
            onEdit={(event) => editTask(task.id, event.message)} 
            onAction={() => selectTask(task.id)}
            onDelete={() => removeTask(task.id)}
            onDragStart={(point, rect) => startTaskDrag(task.id, point, rect)}
            isDragging={taskDrag?.id === task.id}
            isCurrent={false} />
          {/if}
        </div>
      {/each}

      <History
        items={history}
        visible={hasTasks}
        draggingId={taskDrag?.source === 'history' ? taskDrag.id : null}
        onReturn={returnFromHistory}
        onDelete={deleteFromHistory}
        onEdit={editHistory}
        onClear={clearHistory}
        onDragStart={(id, point, rect) => startTaskDrag(id, point, rect, 'history')} />
    </div>
  </div>
</main>

<WidgetSideLayer visible={hasTasks} />

{#if taskDrag && draggedTask}
  <div
    class="task-ghost"
    style:left="{taskDrag.left}px"
    style:top="{taskDrag.y - taskDrag.offsetY}px"
    style:width="{taskDrag.width}px">
    <Task text={draggedTask.text} isCurrent={false} isHistory={taskDrag.source === 'history' && taskDrag.dropIndex === null} />
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
  }

  .task-warpper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    transition: transform 2s cubic-bezier(0.76, 0, 0.24, 1);
    transform: translateY(-100%);
  }

  .bottom {
    transform: translateY(0);
  }

  .task-layout {
    position: relative;
    box-sizing: border-box;
    flex-grow: 1;
    width: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    gap: 25px;
    padding-top: 30px;
    padding-bottom: 180px;
  }

  .task-item {
    width: 100%;
  }

  .task-item.placeholder {
    border-radius: 40px;
    outline: 2.5px dashed #494949;
    outline-offset: -2.5px;
  }

  .task-item.placeholder > :global(*) {
    visibility: hidden;
  }

  .task-ghost {
    position: fixed;
    z-index: 2000;
    pointer-events: none;
    transform: scale(1.02);
    filter: drop-shadow(0 12px 30px rgba(0, 0, 0, 0.6));
  }

  .select-next {
    width: 100%;
    min-height: 50px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: "Roboto Slab", serif;
    font-size: 18px;
    color: #7356f4;
    transition: filter 0.2s;
  }

  .select-next:hover {
    filter: brightness(130%);
  }

  .select-next:active {
    filter: brightness(90%);
  }
</style>
