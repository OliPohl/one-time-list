<!-- src/routes/+page.svelte -->
<script >
// @ts-nocheck
  import { onMount, untrack } from 'svelte';
  import { TaskInput, Task, Wave, NextTask } from '$lib';
  import { WidgetDock, WidgetSideLayer, widgets } from '$lib/widgets';

  /** @type {Array<{id: string, text: string, createdAt: number}>} */
  let tasks = $state([]);
  let currentTask = $state(null);
  /** How the list is ordered: by time added until a sort button is clicked. */
  let sortMode = $state('added');
  let hasTasks = $derived(tasks.length > 0 || currentTask !== null);
  let isLoaded = $state(false);

  function generateUniqueId() {
  let newId;
  let isTaken = true;

  while (isTaken) {
    newId = Math.random().toString(36).substring(2, 8);
    isTaken = tasks.some(task => task.id === newId) ||  currentTask?.id === newId;
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

  // @ts-ignore
  function addTask(text) {
    tasks = [
      ...tasks,
      {
        id: generateUniqueId(),
        text: text,
        createdAt: Date.now()
      }
    ];
  }

  // Puts a task back into the list at the spot matching the current sort mode.
  function returnToList(task) {
    let index;
    if (sortMode === 'alphanumeric') {
      index = tasks.findIndex(other => compareAlphanumeric(task, other) < 0);
    } else if (sortMode === 'random') {
      index = Math.floor(Math.random() * (tasks.length + 1));
    } else {
      index = tasks.findIndex(other => other.createdAt > task.createdAt);
    }

    if (index === -1) index = tasks.length;
    tasks = tasks.toSpliced(index, 0, task);
  }

  function sortAndSelect(mode) {
    if (tasks.length === 0) return;

    sortMode = mode;
    tasks = mode === 'alphanumeric' ? tasks.toSorted(compareAlphanumeric) : shuffle(tasks);
    selectTask(tasks[0].id);
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
    }
  }

  function completeTask(id) {
    removeTask(id);
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

    sortMode = localStorage.getItem('otl_sort_mode') ?? 'added';

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
    onSelectRandom={() => sortAndSelect('random')}
    onSelectAlphanumeric={() => sortAndSelect('alphanumeric')}
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
      {/if}
    </NextTask>

    <WidgetDock />

    <div class="task-layout">
      {#each tasks as task (task.id)}
        <Task 
        text={task.text} 
        onEdit={(event) => editTask(task.id, event.message)} 
        onAction={() => selectTask(task.id)}
        onDelete={() => removeTask(task.id)}
        isCurrent={false} />
      {/each}
    </div>
  </div>
</main>

<WidgetSideLayer visible={hasTasks} />


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
</style>