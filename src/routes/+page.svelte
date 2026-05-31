<!-- src/routes/+page.svelte -->
<script >
// @ts-nocheck

  import { TaskInput, Task, Wave, NextTask } from '$lib';

  /** @type {Array<{id: number, text: string}>} */
  let tasks = $state([]);
  let hasTasks = $derived(tasks.length > 0);

  function generateUniqueId() {
  let newId;
  let isTaken = true;

  while (isTaken) {
    newId = Math.random().toString(36).substring(2, 8);
    isTaken = tasks.some(task => task.id === newId);
  }
  return newId;
}

  // @ts-ignore
  function addTask(event) {
    const updatedTasks = [
      ...tasks,
      {
        id: generateUniqueId(),
        text: event.message
      }
    ];

    tasks = updatedTasks.toSorted((a, b) => a.text.localeCompare(b.text));
  }

  function editTask(id, text) {
    const taskToEdit = tasks.find(task => task.id === id);
    if (taskToEdit) {
    taskToEdit.text = text;
    }

    tasks = tasks.toSorted((a, b) => a.text.localeCompare(b.text));
  }

  // @ts-ignore
  function removeTask(id) {
    tasks = tasks.filter(task => task.id !== id);
  }
</script>


<main class="page-layout">
  <Wave bottom={hasTasks}/>
  <TaskInput placeholder="Add Task" heading="What's next?" onSubmit={addTask} bottom={hasTasks} />

  <div class="task-warpper" class:bottom={hasTasks ? "bottom" : ""}>
    <NextTask />

    <div class="task-layout">
      {#each tasks as task (task.id)}
        <Task 
        text={task.text} 
        onEdit={(event) => editTask(task.id, event.message)} 
        onDone={() => removeTask(task.id)}
        onDelete={() => removeTask(task.id)} />
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

    overflow-y: scroll;
    overflow-x: hidden;

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
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    gap: 25px;
    padding-top: 5px;
    padding-bottom: 180px;
  }
</style>