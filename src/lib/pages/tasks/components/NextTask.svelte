<!-- src/lib/pages/tasks/components/NextTask.svelte -->
<script>
  let { 
    onShuffle,
    onSortAlphanumeric,
    onCustomOrder,
    onUnselect,
    children
  } = $props();
</script>


<div class="wrapper">
  <div class="heading-container">
    <h2 class="heading">Current Task</h2>

    <div class="button-container">
      <button class="button button-custom" title="Restore Custom Order" onclick={onCustomOrder}>
        <span class="button-icon m3-icon">layers</span>
      </button>

      <button class="button button-alpha" title="Sort Alphanumerically" onclick={onSortAlphanumeric}>
        <span class="button-icon m3-icon">sort_by_alpha</span>
      </button>

      <button class="button button-random" title="Shuffle Tasks" onclick={onShuffle}>
        <span class="button-icon m3-icon">shuffle</span>
      </button>

      <button class="button button-unselect" title="Deselect Current Task" onclick={onUnselect}>
        <span class="button-icon m3-icon">deselect</span>
      </button>
    </div>
  </div>

  <div class="task-container">
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

  display: flex;
  justify-content: center;
  align-items: center;
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
    background-color: var(--task);
}

.button-alpha {
    background-color: #29acdf;
}

.button-random {
    background-color: #2cdf29;
}

.button-unselect {
    background-color: #f73f43;
}

.button-icon {
  font-size: 25px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  color: white;
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