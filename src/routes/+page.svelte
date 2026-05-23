<!-- src/routes/+page.svelte -->
<script>
  import { TaskInput } from '$lib';

  // @ts-ignore
  function addTask(event) {
    console.log("Value recieved", event.message);
  }
</script>

<main class="page-layout">
  <TaskInput placeholder="Add Task" onSubmit={addTask} />
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
  }
</style>