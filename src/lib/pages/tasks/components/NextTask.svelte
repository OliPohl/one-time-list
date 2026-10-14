<!-- src/lib/pages/tasks/components/NextTask.svelte -->
<!-- The "Current Task" heading with the list's sort button, and the box the current task is in. -->
<script>
  import SortMenu from './SortMenu.svelte';

  /**
   * `isDropTarget`: a dragged task is held over the current task box, dropping it there selects it.
   * `compact`: smaller heading and button, for a column of a board.
   * @type {{
   *   list: import('../list.svelte.js').TaskList,
   *   isDropTarget?: boolean,
   *   taskContainer?: HTMLElement,
   *   compact?: boolean,
   *   children?: import('svelte').Snippet
   * }}
   */
  let { list, isDropTarget = false, taskContainer = $bindable(), compact = false, children } = $props();
</script>


<div class="wrapper" class:compact>
  <div class="heading-container">
    <h2 class="heading">Current Task</h2>
    <SortMenu {list} />
  </div>

  <div class="task-container" class:drop-target={isDropTarget} bind:this={taskContainer}>
      {@render children?.()}
  </div>
</div>


<style>
.wrapper {
  /* The heading's size, the sort button is as tall as its letters (see SortMenu). */
  --heading-size: 25px;
  box-sizing: border-box;
  /* background-color: aliceblue; */
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.heading-container {
  padding: 18px 0 10px 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.heading {
  margin: 0;
  font-family: "Stoke", serif;
  font-size: var(--heading-size);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--task);
}

.task-container {
  width: 100%;
  min-height: 50px;
  border-radius: var(--task-radius, 40px);
  border-style: dashed;
  border-width: 2.5px;
  border-color:var(--task);
  transition: background-color 0.2s;

  display: flex;
  justify-content: center;
  align-items: center;
}

.task-container.drop-target {
  border-style: solid;
  background-color: color-mix(in srgb, var(--task), transparent 85%);
}

/* A board column. */
.compact {
  --heading-size: 16px;
}

.compact .heading-container {
  padding: 6px 0 8px;
  gap: 8px;
}

.compact .heading {
  white-space: nowrap;
}

@media (max-width: 480px) {
  .wrapper:not(.compact) {
    --heading-size: 21px;
  }
}

@media (max-width: 380px) {
  .wrapper:not(.compact) {
    --heading-size: 18px;
  }
}
</style>
