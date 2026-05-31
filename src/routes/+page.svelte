<!-- src/routes/+page.svelte -->
<script >
// @ts-nocheck
  import { onMount } from 'svelte';
  import { TaskInput, Task, Wave, NextTask } from '$lib';

  /** @type {Array<{id: number, text: string}>} */
  let tasks = $state([]);
  let currentTask = $state(null);
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

  // @ts-ignore
  function addTask(text) {
    const updatedTasks = [
      ...tasks,
      {
        id: generateUniqueId(),
        text: text
      }
    ];

    tasks = updatedTasks.toSorted((a, b) => a.text.localeCompare(b.text));
  }

  function editTask(id, newText) {
    if (id === currentTask.id) {
      currentTask.text = newText;
    } else {
      const taskToEdit = tasks.find(task => task.id === id);
      if (taskToEdit) {
      taskToEdit.text = newText;
      }

      tasks = tasks.toSorted((a, b) => a.text.localeCompare(b.text));
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
      addTask(currentTask.text);
    }

    const taskToSelect = tasks.find(task => task.id === id);
    if (taskToSelect) {
      currentTask = taskToSelect;
      tasks = tasks.filter(task => task.id !== id);
    }
  }

  function unselectTask() {
    if (currentTask) {
      addTask(currentTask.text)
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

  onMount(() => {
    const savedTasks = localStorage.getItem('otl_tasks');
    const savedCurrent = localStorage.getItem('otl_current_task');

    if (savedTasks) {
      tasks = JSON.parse(savedTasks);
   }
  
    if (savedCurrent) {
      currentTask = JSON.parse(savedCurrent);
    }
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
    onSelectRandom = {() => {
      const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
      if (randomTask) selectTask(randomTask.id);
    }}
    onSelectAlphabetical={() => tasks.length > 0 && selectTask(tasks.toSorted((a, b) => a.text.localeCompare(b.text))[0]?.id)}
    onUnselect ={() => unselectTask()}>
      {#if currentTask}
        {#key currentTask.id}
          {@const activeId = currentTask.id}
          <Task 
            text={currentTask.text} 
            onEdit={(event) => editTask(activeId, event.message)} 
            onAction={() => removeTask(activeId)}
            onDelete={() => removeTask(activeId)}
            isCurrent={true} />
        {/key}
      {/if}
    </NextTask>

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