<!-- src/lib/pages/tasks/TasksCard.svelte -->
<!-- A Tasks page on the dashboard: its current task (complete, edit, delete) or a button to select one,
     and how many tasks are done. It uses the page's own list, so changes show on the page too. -->
<script>
  import Task from './components/Task.svelte';
  import { getListStore } from './list.svelte.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // Shown for one page only, so the store never changes.
  // svelte-ignore state_referenced_locally
  const list = getListStore(page.id);

  let done = $derived(list.history.length);
  let total = $derived(list.tasks.length + (list.currentTask ? 1 : 0) + list.history.length);
</script>

<div class="tasks-card">
  <span class="label">Current Task</span>

  <div class="current">
    {#if list.currentTask}
      {#key list.currentTask.id}
        {@const id = list.currentTask.id}
        <Task
          text={list.currentTask.text}
          isCurrent={true}
          onAction={() => list.completeTask(id)}
          onDelete={() => list.removeTask(id)}
          onEdit={(/** @type {{message: string}} */ event) => list.editTask(id, event.message)} />
      {/key}
    {:else if list.tasks.length > 0}
      <button class="select" onclick={() => list.selectTask(list.tasks[0].id)}>Select Task</button>
    {:else}
      <span class="empty">No tasks left</span>
    {/if}
  </div>

  <span class="stats">{done} of {total} {total === 1 ? 'task' : 'tasks'} completed</span>
</div>


<style>
  .tasks-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-family: "Stoke", serif;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--task);
  }

  /* Same dashed frame as the current task on the page. */
  .current {
    box-sizing: border-box;
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2.5px dashed var(--task);
    border-radius: 40px;
  }

  .select {
    width: 100%;
    min-height: 50px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    color: var(--task);
    transition: filter 0.2s;
  }

  .select:hover {
    filter: brightness(130%);
  }

  .empty {
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    color: var(--text-muted);
  }

  .stats {
    text-align: center;
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    color: var(--text-muted);
  }
</style>
