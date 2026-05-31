<!-- src/lib/Task.svelte -->
<script>
  let { 
    text = "Empty Task",
    onAction,
    onDelete,
    onEdit,
    isCurrent
  } = $props();

  let currentText = $derived(text);
  let isEditing = $state(false)
  /**
	 * @type {HTMLLabelElement}
	 */
  let componentRef;

  /**
	 * @type {HTMLTextAreaElement}
	 */
  let textarea;

  function handleInput() {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight - 4}px`;
  }

  function handleEdit() {
    if (isEditing) {
      isEditing = false;

      if (currentText.trim() == "" || currentText == text) {
        currentText = text;
      } else {
        text = currentText;
        onEdit({ message: text });
      }
      queueMicrotask(handleInput)
      
      textarea.disabled = true;
    } else {
      isEditing = true;
      textarea.disabled = false;
      textarea.focus();
    }
  }

  function cancelEdit() {
    isEditing = false;
    currentText = text;
    queueMicrotask(handleInput)
    textarea.disabled = true;
  }

  // @ts-ignore
  function handleClickOutside(event) {
    if (!isEditing) return;

    if (componentRef && !componentRef.contains(event.target)) {
      cancelEdit();
    }
  }

  $effect(() => {
    handleInput();
  });
</script>

<svelte:window onclick={handleClickOutside} />

<label class="container" bind:this={componentRef}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span 
  class="done-btn m3-icon" 
  class:editing={isEditing} 
  class:current={isCurrent}
  onclick={isEditing ? onDelete : onAction}>{isEditing ? "delete" : isCurrent ? "check_circle" : "arrow_circle_up"}</span>
  
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

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span class="cancel-btn m3-icon" class:editing={isEditing} onclick={cancelEdit}>close</span>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span class="edit-btn m3-icon" class:editing={isEditing} onclick={handleEdit}>{isEditing ? "check" : "edit_square"}</span>
</label>


<style>
  .container {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: left;
    background-color: rgb(0, 0, 0);
    padding: 5px 25px;
    border-radius: 40px;
    border-style: solid;
    border-width: 2.5px;
    border-color:#ffffff00;
  }

  .done-btn {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    cursor: pointer ;
    color: #cacaca;
    transition: color 0.4s, font-variation-settings 0.7s;
  }

  .done-btn:hover{
    color: #7356f4;
  }

  .done-btn:active {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30 !important;
    transition: none !important;
    color: #6a51d9;
  }

  .done-btn.current:hover {
    color: #d6e550;
  }

  .done-btn.current:active {
    color: #c3d04c;
  }

  .done-btn.editing {
    color: #f73f43;
    transition: none;
  }

  .edit-btn {
    opacity: 0;
    pointer-events: none;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    color: #dadada;
    transition: opacity 0.3s;
  }

  .container:hover .edit-btn,
  .edit-btn.editing {
    opacity: 100%;
    pointer-events: all;
    cursor: pointer;
  }

  .edit-btn.editing {
    color: #29df50;
    transition: none;
  }

  .edit-btn.editing:hover {
    color: #1fff50;
  }

  .cancel-btn {
    display: none;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    color: #b7b7b7;
    cursor: pointer;
    transition: color 0.4s;
  }

  .cancel-btn.editing {
    display: block !important;
    margin-right: 5px;
  }

  .cancel-btn.editing:hover {
    color: #e0e0e0;
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
    font-family: "Roboto Slab", serif;
    color: #ffffff;
    margin: 0 20px;
  }
</style>