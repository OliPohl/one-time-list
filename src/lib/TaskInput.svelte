<!-- src/lib/TaskInput.svelte -->
<script>
  let text = $state('');
  let isActive = $derived(text.trim().length > 0);

  /**
	 * @param {{ target: any; }} event
	 */
  function handleInput(event) {
    const textarea = event.target;
    
    textarea.style.height = 'auto';
    const maxPixelHeight = 18 * 1.5 * 3; 
    
    if (textarea.scrollHeight > maxPixelHeight) {
      textarea.style.height = `${maxPixelHeight}px`;
    } else {
      textarea.style.height = `${textarea.scrollHeight - 4}px`;
    }
  }
</script>


<div class="wrapper">
  <label class="container" class:active={isActive}>
    <textarea 
    name="text" 
    rows=1
    wrap="soft" 
    placeholder="Add Task"
    class="input-field"
    maxlength="500"
    bind:value={text}
    oninput={handleInput}
    ></textarea>
    <span class="send-btn m3-icon">add_circle</span>
  </label>
</div>


<style>
  .wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    background-color: rgba(255, 255, 255, 0);
  }

  .container {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: left;
    background-color: rgb(69, 69, 69);
    padding: 15px 25px;
    border-radius: 40px;
  }

  .input-field {
    flex-grow: 1;
    font-size: 18px;
    line-height: 1.5;
    background-color: transparent;
    border-color: transparent;
    resize: none;
    overflow:scroll;
    color: #bebebe;
  }

  .send-btn {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    cursor: auto;
    color: #8c8c8c;
    margin-left: 5px;
    transition: none;
  }

  .active > .send-btn {
    color: #dc3737;
    cursor: pointer;
    transition: all 0.2s;
    transition: font-variation-settings 0.4s;
  }

  .active > .send-btn:hover {
    color: #ff0000;
  }

  .active > .send-btn:active {
    color: #ff0000;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    transition: none;
  }
</style>