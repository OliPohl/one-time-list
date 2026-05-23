<!-- src/lib/TaskInput.svelte -->
<script>
  let { 
    placeholder = "Add Task"
  } = $props();

  let text = $state('');
  let isPressed = $state(false);
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
  
  // @ts-ignore
  function handleKeyDown(event) {
    if (event.key === 'Enter' && event.shiftKey) return; 

    if (event.key === 'Enter') {
      event.preventDefault();
      event.target.style.height = 'auto';
      submit();
    }
  }

  function submit() {
    if (!text) return;
    console.log("Value submitted:", text.trim());
    text = "";
    animatePress();
  }

  function animatePress() {
    isPressed = true;
    setTimeout(() => {
      isPressed = false;
    }, 10);
  }
</script>


<div class="wrapper">
  <label class="container" class:active={isActive}>
    <textarea 
    name="text" 
    rows=1
    wrap="soft" 
    placeholder={placeholder}
    class="input-field"
    maxlength="500"
    bind:value={text}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    ></textarea>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span class="send-btn m3-icon" onclick={submit} class:pressed={isPressed}>add_circle</span>
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
    transition: color 0.4s, font-variation-settings 0.7s;
  }

  .active > .send-btn {
    color: #dc3737;
    cursor: pointer;
  }

  .active > .send-btn:hover {
    color: #ff0000;
  }

  .active > .send-btn:active,
  .send-btn.pressed {
    color: #ff0000 !important;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30 !important;
    transition: none !important;
  }
</style>