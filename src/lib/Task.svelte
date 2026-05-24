<!-- src/lib/Task.svelte -->
<script>
  let { 
    text = "Empty Task",
    onDone
  } = $props();

  // svelte-ignore state_referenced_locally
  let currentText = $state(text);

  /**
	 * @type {HTMLTextAreaElement}
	 */
  let textarea;

  function handleInput() {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight - 4}px`;
  }

  $effect(() => {
    handleInput();
  });
</script>


<div class="container">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span class="done-btn m3-icon" onclick={onDone}>check_circle</span>
  <textarea 
    name="text" 
    wrap="soft" 
    maxlength="500"
    spellcheck="false"
    class="task"
    disabled
    bind:value={currentText}
    bind:this={textarea}
    oninput={handleInput}
    rows={1}
  >{text}</textarea>
</div>


<style>
  .container {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: left;
    gap: 20px;
    background-color: rgb(69, 69, 69);
    padding: 5px 25px;
    border-radius: 40px;
  }

  .done-btn {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    cursor: pointer ;
    color: #aaaa00;
    transition: color 0.4s, font-variation-settings 0.7s;
  }

  .done-btn:hover{
    color: #fff200;
  }

  .done-btn:hover:active {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30 !important;
    transition: none !important;
  }

  .task {
    height: auto;
    flex-grow: 1;
    font-size: 18px;
    line-height: 1.5;
    background-color: transparent;
    border: none;
    resize: none;
    overflow: hidden;
    color: #bebebe;
  }
</style>