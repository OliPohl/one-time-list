<!-- src/routes/+page.svelte -->
<script >
  import { TaskInput, Task } from '$lib';

  /** @type {Array<{id: number, text: string}>} */
  let tasks = $state([]);

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

</script>

<main class="page-layout">
  <TaskInput placeholder="Add Task" onSubmit={addTask} />

  {#each tasks as task (task.id)}
    <Task text={task.text} onDone={() => removeTask(task.id)} />
  {/each}
</main>

<style>
  .page-layout {
    margin: auto;
    display: flex;
    flex-direction: column;
    gap: 40px;
    justify-content: center;
    align-items: center;
    height: 100vh;

    padding: 0 10px;

    overflow-y: scroll;
    overflow-x: hidden;

    max-width: 600px;
    max-height: 100vh;
  }
</style>