<!-- src/lib/pages/kanban/KanbanCard.svelte -->
<!-- A Kanban board on the dashboard: every column with its current task and how many tasks are left in it. -->
<script>
  import { getBoardStore } from './board.svelte.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // Shown for one page only, so the store never changes.
  // svelte-ignore state_referenced_locally
  const board = getBoardStore(page.id);
</script>

<ul class="columns">
  {#each board.columns as column (column.id)}
    {@const left = column.list.tasks.length + (column.list.currentTask ? 1 : 0)}
    <li class="column">
      <div class="row">
        <span class="name">{column.name}</span>
        <span class="count">{left} {left === 1 ? 'task' : 'tasks'}</span>
      </div>
      {#if column.list.currentTask}
        <span class="current">{column.list.currentTask.text}</span>
      {/if}
    </li>
  {/each}
</ul>


<style>
  .columns {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 14px;
    background-color: var(--surface);
    border-radius: 18px;
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Stoke", serif;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .count {
    flex-shrink: 0;
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    color: var(--text-muted);
  }

  /* The current task, one line, in the color of the current task frame. */
  .current {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-left: 10px;
    border-left: 2.5px dashed var(--task);
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    color: var(--text);
  }
</style>
