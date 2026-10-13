<!-- src/lib/pages/tasks/components/NextTask.svelte -->
<script>
  import { COLORS } from '../../../colors.js';

  // The buttons always use the wave colors of the color sets, whichever set the page uses. Priority (advanced tasks
  // only) is orange, like the "Important" priority.
  const buttonColors = `--button-custom: ${COLORS.amethyst.wave}; --button-alpha: ${COLORS.cobalt.wave}; --button-priority: var(--orange); --button-random: ${COLORS.emerald.wave}; --button-unselect: ${COLORS.crimson.wave};`;

  let { 
    onShuffle,
    onSortAlphanumeric,
    /** Advanced tasks only, without it there's no priority button. */
    onSortPriority = undefined,
    onCustomOrder,
    onUnselect,
    // A dragged task is held over the current task box, dropping it there selects it.
    isDropTarget = false,
    taskContainer = $bindable(),
    children
  } = $props();
</script>


<div class="wrapper">
  <div class="heading-container">
    <h2 class="heading">Current Task</h2>

    <div class="button-container" style={buttonColors}>
      <button class="button button-custom" title="Restore Custom Order" onclick={onCustomOrder}>
        <span class="button-icon m3-icon">layers</span>
      </button>

      <button class="button button-alpha" title="Sort Alphanumerically" onclick={onSortAlphanumeric}>
        <span class="button-icon m3-icon">sort_by_alpha</span>
      </button>

      {#if onSortPriority}
        <button class="button button-priority" title="Sort by Priority" onclick={onSortPriority}>
          <span class="button-icon m3-icon">flag</span>
        </button>
      {/if}

      <button class="button button-random" title="Shuffle Tasks" onclick={onShuffle}>
        <span class="button-icon m3-icon">shuffle</span>
      </button>

      <button class="button button-unselect" title="Deselect Current Task" onclick={onUnselect}>
        <span class="button-icon m3-icon">deselect</span>
      </button>
    </div>
  </div>

  <div class="task-container" class:drop-target={isDropTarget} bind:this={taskContainer}>
      {@render children?.()}
  </div>
</div>


<style>
.wrapper {
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
  font-size: 25px;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--task);
}

.task-container {
  width: 100%;
  min-height: 50px;
  border-radius: 40px;
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

.button-container {
  width: auto;
  display: flex;
  gap: 10px;
}

.button {
  background: none;
  border: none;
  outline: none;
  cursor: pointer;

  border-radius: 50px;
  transition: filter 0.2s;

  display: flex;
  align-items: center;
  justify-content: center;
}

.button:hover {
  filter: brightness(110%);
}

.button:active {
    filter: brightness(90%);
}

.button-custom {
    background-color: var(--button-custom);
}

.button-alpha {
    background-color: var(--button-alpha);
}

.button-priority {
    background-color: var(--button-priority);
}

.button-random {
    background-color: var(--button-random);
}

.button-unselect {
    background-color: var(--button-unselect);
}

.button-icon {
  font-size: 25px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  color: var(--on-color);
}

@media (max-width: 480px) {
  .heading {
    font-size: 21px;
  }

  .button-container {
    gap: 8px;
  }

  .button-icon {
    font-size: 21px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 21;
  }
}

@media (max-width: 380px) {
  .heading {
    font-size: 18px;
  }

  .button-container {
    gap: 6px;
  }

  .button-icon {
    font-size: 18px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 18;
  }
}
</style>