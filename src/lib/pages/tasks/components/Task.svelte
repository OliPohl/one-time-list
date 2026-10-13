<!-- src/lib/pages/tasks/components/Task.svelte -->
<script>
  import { fade } from 'svelte/transition';
  import { pressDrag } from '../../../utils/pressDrag.js';
  import TaskTag from './TaskTag.svelte';
  import { descriptionPreview, labelIcon } from '../list.svelte.js';

  const swapFade = { duration: 250 };
  /** After the first click on delete, a second click within this time deletes the task. */
  const DELETE_CONFIRM_MS = 3000;

  let { 
    text = "Empty Task",
    onAction,
    onDelete,
    onEdit,
    isCurrent,
    /** Completed task: the action returns it to the list and delete is always shown. */
    isHistory = false,
    /** Enables reordering by dragging the task. */
    onDragStart = undefined,
    isDragging = false,
    /** Advanced task: edit opens the task popup (`onOpen`), its tags and the start of its description show. */
    advanced = false,
    onOpen = undefined,
    description = '',
    /** @type {{label: string, color: string} | null} */
    priority = null,
    /** @type {import('../list.svelte.js').Label[]} */
    labels = []
  } = $props();

  let preview = $derived(advanced ? descriptionPreview(description) : '');
  let hasTags = $derived(advanced && (priority !== null || labels.length > 0));

  let currentText = $derived(text);
  let isEditing = $state(false)
  /** True after the first click on a delete button. */
  let deleteArmed = $state(false);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let disarmTimer;
  let deleteIcon = $derived(deleteArmed ? "delete_forever" : "delete");
  let deleteTitle = $derived(deleteArmed ? "Click again to delete" : "Delete Task");
  let doneIcon = $derived(isEditing ? deleteIcon : isCurrent ? "check_circle" : isHistory ? "undo" : "arrow_circle_up");
  let pressing = $state(false);
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

  /** The click that armed delete, it reaches the window too and must not disarm it right away. @type {Event | null} */
  let armingClick = null;

  // Deleting needs a second click, the first one only changes the icon.
  /** @param {MouseEvent} event */
  function requestDelete(event) {
    // The task is a label: without this the click is also sent to the textarea, which would disarm again.
    event.preventDefault();
    clearTimeout(disarmTimer);
    if (deleteArmed) {
      deleteArmed = false;
      onDelete();
      return;
    }
    deleteArmed = true;
    armingClick = event;
    disarmTimer = setTimeout(() => (deleteArmed = false), DELETE_CONFIRM_MS);
  }

  /** Any other click forgets the first delete click. @param {MouseEvent} event */
  function disarmOnClick(event) {
    if (deleteArmed && event !== armingClick) deleteArmed = false;
  }

  // Entering or leaving edit mode forgets a first delete click.
  $effect(() => {
    void isEditing;
    deleteArmed = false;
  });

  $effect(() => () => clearTimeout(disarmTimer));

  function cancelEdit() {
    isEditing = false;
    currentText = text;
    queueMicrotask(handleInput)
    textarea.disabled = true;
  }

  // @ts-ignore
  function handleClickOutside(event) {
    if (!isEditing) return;

    // composedPath is captured at dispatch, so it still holds buttons the
    // click itself swapped out of the DOM.
    if (componentRef && !event.composedPath().includes(componentRef)) {
      cancelEdit();
    }
  }

  $effect(() => {
    handleInput();
  });

  // Re-measure once styles/fonts are ready and whenever the width changes,
  // otherwise the height is calculated with the fallback font on page load.
  $effect(() => {
    let lastWidth = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === lastWidth) return;
      lastWidth = textarea.clientWidth;
      handleInput();
    });

    observer.observe(textarea);
    document.fonts?.ready.then(handleInput);
    return () => observer.disconnect();
  });
</script>

<svelte:window onclick={(event) => { disarmOnClick(event); handleClickOutside(event); }} />

<label
  class="container"
  class:pressing
  bind:this={componentRef}
  {@attach pressDrag({
    enabled: () => Boolean(onDragStart) && !isEditing,
    ignore: '.m3-icon',
    isDragging: () => isDragging,
    onPressChange: (value) => (pressing = value),
    onStart: (point, rect) => onDragStart(point, rect)
  })}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  {#key doneIcon}
    <span 
    class="done-btn m3-icon" 
    class:editing={isEditing} 
    class:current={isCurrent}
    class:armed={isEditing && deleteArmed}
    title={isEditing ? deleteTitle : isHistory ? "Return Task to List" : isCurrent ? undefined : "Select Task"}
    in:fade={swapFade}
    onclick={isEditing ? requestDelete : onAction}>{doneIcon}</span>
  {/key}
  
  <div class="body">
    <!-- Priority on the left, labels on the right. -->
    {#if hasTags}
      <div class="tags">
        {#if priority}
          <TaskTag name={priority.label} color={priority.color} icon="flag" title="Priority" />
        {/if}
        <span class="labels">
          {#each labels as label (label.id)}
            <TaskTag name={label.name} color={label.color} icon={labelIcon(label)} />
          {/each}
        </span>
      </div>
    {/if}

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

    {#if preview}
      <span class="description">{preview}</span>
    {/if}
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  {#if isEditing}
    <span class="cancel-btn m3-icon" in:fade={swapFade} onclick={cancelEdit}>close</span>
  {/if}
  {#key isEditing}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="edit-btn m3-icon"
      class:editing={isEditing}
      title={advanced ? "Open Task" : undefined}
      in:fade={swapFade}
      onclick={advanced && onOpen ? (/** @type {MouseEvent} */ event) => (event.preventDefault(), onOpen()) : handleEdit}>{advanced ? "open_in_new" : isEditing ? "check" : "edit_square"}</span>
  {/key}
  {#if isHistory && !isEditing}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    {#key deleteIcon}
      <span class="delete-btn m3-icon" class:armed={deleteArmed} title={deleteTitle} in:fade={swapFade} onclick={requestDelete}>{deleteIcon}</span>
    {/key}
  {/if}
</label>


<style>
  .container {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: left;
    background-color: var(--surface);
    padding: 5px 25px;
    border-radius: 40px;
    border-style: solid;
    border-width: 2.5px;
    border-color:transparent;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    transition: transform 0.15s;
  }

  .container.pressing {
    transform: scale(0.98);
  }

  .done-btn {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    cursor: pointer ;
    color: var(--text-soft);
    transition: color 0.4s, font-variation-settings 0.7s;
  }

  .done-btn:hover{
    color: var(--task);
  }

  .done-btn:active {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30 !important;
    transition: none !important;
    color: color-mix(in srgb, var(--task), black 12%);
  }

  .done-btn.current:hover {
    color: var(--accent);
  }

  .done-btn.current:active {
    color: var(--accent);
  }

  .done-btn.editing {
    color: var(--red);
    transition: none;
  }

  .done-btn.editing:hover {
    color: var(--red);
    transition: none;
  }

  .done-btn.editing:active {
    color: var(--red);
    transition: none;
  }

  .edit-btn {
    opacity: 0;
    pointer-events: none;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    color: var(--text-soft);
    transition: opacity 0.3s;
  }

  .container:hover .edit-btn,
  .edit-btn.editing {
    opacity: 100%;
    pointer-events: all;
    cursor: pointer;
  }

  .edit-btn.editing {
    color: var(--green);
    transition: none;
  }

  .edit-btn.editing:hover {
    color: var(--green-hover);
  }

  .delete-btn {
    margin-left: 10px;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.4s;
  }

  .delete-btn:hover {
    color: var(--red);
  }

  .done-btn.armed,
  .delete-btn.armed {
    color: var(--red);
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30;
  }

  .delete-btn.armed {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  }

  .cancel-btn {
    margin-right: 5px;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.4s;
  }

  .cancel-btn:hover {
    color: var(--text-soft);
  }

  /* Fills the space next to the buttons. The text, and on advanced tasks its tags and description. */
  .body {
    flex-grow: 1;
    width: 0;
    min-width: 0;
    margin: 0 20px;
    display: flex;
    flex-direction: column;
  }

  .tags {
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .labels {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    overflow: hidden;
  }

  .description {
    margin-bottom: 4px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    line-height: 1.4;
    color: var(--text-muted);
  }

  .task {
    height: auto;
    /* Without the textarea's built-in minimum width (about 20 characters). */
    width: 100%;
    min-width: 0;
    font-size: 18px;
    line-height: 1.5;
    background-color: transparent;
    border: none;
    resize: none;
    overflow: hidden;
    font-family: "Roboto Slab", serif;
    color: var(--text);
    margin: 0;
  }

  /* Let presses reach the container so the task can be dragged */
  .task:disabled {
    pointer-events: none;
  }

  .task:enabled {
    -webkit-user-select: text;
    user-select: text;
  }
</style>