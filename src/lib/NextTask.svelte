<!-- src/lib/NextTask.svelte -->
<script>
  let { 
    onSelectRandom,
    onSelectAlphabetical,
    onUnselect,
    children
  } = $props();
</script>


<div class="wrapper">
  <div class="heading-container">
    <h1 class="heading">Current Task</h1>

    <div class="button-container">
      <button class="button button-alpha" title="Select Task Alphabetically" onclick={onSelectAlphabetical}>
        <span class="button-icon m3-icon">sort_by_alpha</span>
      </button>

      <button class="button button-random" title="Select Task Random" onclick={onSelectRandom}>
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
  padding: 30px 0 10px 0;
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
  color: #7356f4;
}

.task-container {
  width: 100%;
  min-height: 50px;
  border-radius: 40px;
  border-style: dashed;
  border-width: 2.5px;
  border-color:#7356f4;

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

@media (max-width: 380px) {
  .heading {
    font-size: 18px;
  }

  .button-icon {
    font-size: 18px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 18;
  }
}
</style>