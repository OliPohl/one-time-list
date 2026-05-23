<!-- src/lib/TaskInput.svelte -->
<script>
  let text = $state('');

  /**
	 * @param {{ target: any; }} event
	 */
  function handleInput(event) {
    const textarea = event.target;
    
    textarea.style.height = 'auto';
    const maxPixelHeight = 18 * 1.5 * 5; 
    
    if (textarea.scrollHeight > maxPixelHeight) {
      textarea.style.height = `${maxPixelHeight}px`;
    } else {
      textarea.style.height = `${textarea.scrollHeight - 4}px`;
    }
  }
</script>


<div class="wrapper">
  <div class="container">
    <textarea 
    name="text" 
    rows=1
    wrap="soft" 
    placeholder="What needs to be done?"
    class="input-field"
    maxlength="500"
    bind:value={text}
    oninput={handleInput}
    ></textarea>
    <span class="send-btn">x</span>
  </div>
</div>


<style>
  .wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    background-color: rgba(255, 255, 255, 0.055);
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
</style>