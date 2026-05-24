<!-- src/lib/TaskInput.svelte -->
<script>
  let { 
    placeholder = "Add Task",
    heading = "What's next?",
    bottom = true,
    onSubmit
  } = $props();

  let text = $state('');
  let isPressed = $state(false);
  let isActive = $derived(text.trim().length > 0);
  /**
	 * @type {HTMLTextAreaElement}
	 */
  let textarea;

  function handleInput() {
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
      submit();
    }
  }

  function submit() {
    if (!text) return;
    // console.log("Value submitted:", text.trim());
    onSubmit({ message: text });
    text = "";
    textarea.style.height = 'auto';
    animatePress();
  }

  function animatePress() {
    isPressed = true;
    setTimeout(() => {
      isPressed = false;
    }, 10);
  }
</script>


<div class="wrapper" class:bottom={bottom}>
  <div class="heading-wrapper">
    <h1 class="heading">{heading}</h1>
  </div>
  <div class="input-wrapper">
    <label class="container" class:active={isActive}>
      <textarea 
      name="text" 
      rows=1
      wrap="soft" 
      placeholder={placeholder}
      class="input-field"
      maxlength="500"
      spellcheck="false"
      bind:value={text}
      oninput={handleInput}
      onkeydown={handleKeyDown}
      bind:this={textarea}
      ></textarea>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="send-btn m3-icon" onclick={submit} class:pressed={isPressed}>add_circle</span>
    </label>
  </div>
</div>


<style>
  .wrapper {
    position: fixed;
    left: 50%;
    bottom: 50%;
    transform: translate(-50%, 50%);
    gap: 70px;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transition: bottom 2s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .bottom {
    bottom: 160px;
  }

  .heading-wrapper {
    height: 150px;
    display: flex;
    align-items: end;
    justify-content: center;
    transition: opacity 2s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .bottom > .heading-wrapper {
    opacity: 0;
    pointer-events: none;

  }


  .heading {
    margin: 0 10px;
    font-family: "Stoke", serif;
    font-size: 50px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: #d6e550;
    text-align: center;
  }

  .input-wrapper {
    box-sizing: border-box;
    width: 100%;
    height: 150px;
    max-width: 620px;
    display: flex;
    align-items: start;
    justify-content: center;
  }

  .container {
    box-sizing: border-box;
    width: 100%;
    margin: 0 10px;
    display: flex;
    align-items: center;
    justify-content: left;
    background-color: rgb(0, 0, 0);
    padding: 15px 25px;
    border-radius: 40px;
    border-style: solid;
    border-width: 2.5px;
    border-color:#d6e550;
  }

  .input-field {
    flex-grow: 1;
    font-size: 18px;
    line-height: 1.5;
    background-color: transparent;
    border: none;
    resize: none;
    overflow:scroll;
    color: #ffffff;
    font-family: "Roboto Slab", serif;
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
    color: #d6e550;
    cursor: pointer;
  }

  .active > .send-btn:hover {
    color: #e1f053;
  }

  .active > .send-btn:active,
  .send-btn.pressed {
    color: #eeff55 !important;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30 !important;
    transition: none !important;
  }
</style>