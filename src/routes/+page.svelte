<!-- src/routes/+page.svelte -->
<script >
  import { TaskInput, Task } from '$lib';

  /** @type {Array<{id: number, text: string}>} */
  let tasks = $state([]);
  let hasTasks = $state(false);

  // @ts-ignore
  function addTask(event) {
    console.log("Value recieved", event.message);
    
    const lastTask = tasks.at(-1);
    tasks.push({
      id: lastTask ? lastTask.id + 1 : 1,
      text: event.message
    })
  }

  // @ts-ignore
  function removeTask(id) {
    tasks = tasks.filter(task => task.id !== id);
  }

  $effect(() => {
    tasks.length ? hasTasks = true : hasTasks = false;
  })

</script>

<main class="page-layout">
  <TaskInput placeholder="Add Task" onSubmit={addTask} bottom={hasTasks} />
  <div class="task-layout">
    {#each tasks as task (task.id)}
      <Task text={task.text} onDone={() => removeTask(task.id)} />
    {/each}
  </div>
</main>

<style>
  .page-layout {
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;

    padding: 0 10px;

    overflow-y: scroll;
    overflow-x: hidden;

    max-width: 600px;
    max-height: 100vh;
  }

  .task-layout {
    box-sizing: border-box;
    background-color: rgb(2, 2, 2);
    flex-grow: 1;
    width: 100%;
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    gap: 25px;
    padding-top: 10%;
    padding-bottom: 20%;
  }
</style>