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
  <h1 class="heading">Current Task</h1>
  <div class="task-container">
      {@render children?.()}
    </div>

  <div class="button-container">
    <button class="button button-alpha" onclick={onSelectAlphabetical}>
      <span class="button-icon m3-icon">sort_by_alpha</span>
      <p class="button-text">Get Alphabetical</p>
    </button>

    <button class="button button-unselect" onclick={onUnselect}>
      <span class="button-icon m3-icon">deselect</span>
      <p class="button-text">Deselect</p>
    </button>
    
    <button class="button button-random" onclick={onSelectRandom}>
      <span class="button-icon m3-icon">shuffle</span>
      <p class="button-text">Get Random</p>
    </button>

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

.heading {
  margin: 30px 0 10px 0;
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
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
}

.button {
  background: none;
  border: none;
  outline: none;
  padding: 2px 10px;
  margin: 5px 0;
  cursor: pointer;

  border-radius: 50px;
  transition: transform 0.1s;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.button:hover {
  transform: scale(1.03);
}

.button:active {
  transform: scale(0.97);
}

.button-alpha {
    background-color: #003f79;
}

.button-random {
    background-color: #00820d;
}

.button-unselect {
    background-color: #920020;
}

.button-text {
  color: white;
  font-family: "Stoke", serif;
  font-size: 14px;
  margin: 0;
}

.button-icon {
  font-size: 25px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  color: white;
}
</style>