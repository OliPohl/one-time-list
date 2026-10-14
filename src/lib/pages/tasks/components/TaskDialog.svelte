<!-- src/lib/pages/tasks/components/TaskDialog.svelte -->
<!-- The popup of an advanced task, like a card in Trello or Jira: its title, priority, labels, widgets and a
     Markdown description (the editor of the Notes pages). Every change is saved right away. The page's labels can
     be created, renamed, recolored and deleted here too. Widgets only while the list has them turned on
     (`widgetStore`). -->
<script>
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import TaskTag from './TaskTag.svelte';
  import TaskWidgets from './TaskWidgets.svelte';
  import { WIDGET_TYPES } from '$lib/widgets/store.svelte.js';
  import { PRIORITIES, LABEL_COLORS, LABEL_ICONS, labelIcon } from '../list.svelte.js';
  import { createEditor } from '../../notes/editor/editor.js';
  import { confirm, confirmState } from '../../../app/confirm.svelte.js';

  /**
   * @type {{
   *   task: import('../list.svelte.js').TaskItem,
   *   list: import('../list.svelte.js').LabelOwner,
   *   onClose: () => void,
   *   onDelete: () => void,
   *   widgetStore?: import('$lib/widgets/store.svelte.js').WidgetStore | null
   * }}
   */
  let { task, list, onClose, onDelete, widgetStore = null } = $props();

  let taskWidgets = $derived(widgetStore ? widgetStore.ofTask(task.id) : []);

  // The popup is opened for one task and closed before another one opens.
  // svelte-ignore state_referenced_locally
  let title = $state(task.text);
  /** @type {HTMLElement} */
  let editorParent;
  /** @type {HTMLTextAreaElement | undefined} */
  let titleInput = $state();

  /** Editing the labels: clicking one changes it instead of tagging the task. */
  let editingLabels = $state(false);
  /** The label being created (`id` null) or changed. @type {{id: string | null, name: string, color: string, icon: string} | null} */
  let labelForm = $state(null);
  /** @type {HTMLInputElement | undefined} */
  let labelNameInput = $state();

  /** An emptied title keeps the old one. */
  function updateTitle() {
    if (title.trim()) task.text = title;
  }

  /** The title grows with its lines, Enter adds a new line. */
  function fitTitle() {
    if (!titleInput) return;
    titleInput.style.height = 'auto';
    // scrollHeight leaves out the 2px border on each side.
    titleInput.style.height = `${titleInput.scrollHeight + 4}px`;
  }

  // Fitted again when the title changes (typing, or set back on blur).
  $effect(() => {
    void title;
    fitTitle();
  });

  /** @param {import('../list.svelte.js').Priority} key */
  function togglePriority(key) {
    task.priority = task.priority === key ? undefined : key;
  }

  /** @param {string} id */
  function toggleLabel(id) {
    const labels = task.labels ?? [];
    task.labels = labels.includes(id) ? labels.filter((labelId) => labelId !== id) : [...labels, id];
  }

  /** @param {import('../list.svelte.js').Label} label */
  function clickLabel(label) {
    if (editingLabels) labelForm = { id: label.id, name: label.name, color: label.color, icon: labelIcon(label) };
    else toggleLabel(label.id);
  }

  function newLabel() {
    // A color no label has yet, if there is one.
    const color = LABEL_COLORS.find((key) => !list.labels.some((label) => label.color === key)) ?? LABEL_COLORS[0];
    labelForm = { id: null, name: '', color, icon: 'label' };
  }

  /**
   * While a new label is typed: the page's labels whose name contains the text, to pick one instead of typing it
   * again. Labels the task already has come last.
   */
  let suggestions = $derived.by(() => {
    const text = labelForm?.id === null ? labelForm.name.trim().toLowerCase() : '';
    if (!text) return [];
    const has = (/** @type {import('../list.svelte.js').Label} */ label) => (task.labels ?? []).includes(label.id);
    return list.labels
      .filter((label) => label.name.toLowerCase().includes(text))
      .toSorted((a, b) => Number(has(a)) - Number(has(b)));
  });

  /** A label of the page with this name (any case). @param {string} name */
  const labelNamed = (name) => list.labels.find((label) => label.name.toLowerCase() === name.toLowerCase());
  /** The label with the name being typed, if the page has one. */
  let existingLabel = $derived.by(() => (labelForm ? labelNamed(labelForm.name.trim()) : undefined));

  /** Tags the task with an existing label and closes the form. @param {import('../list.svelte.js').Label} label */
  function pickLabel(label) {
    if (!(task.labels ?? []).includes(label.id)) task.labels = [...(task.labels ?? []), label.id];
    labelForm = null;
  }

  function saveLabel() {
    if (!labelForm) return;
    const name = labelForm.name.trim();
    if (!name) return;
    // A name the page already has picks that label, there are no two labels with the same name.
    const existing = labelNamed(name);
    if (labelForm.id === null && existing) {
      pickLabel(existing);
      return;
    }
    if (existing && existing.id !== labelForm.id) return;
    if (labelForm.id === null) {
      // A new label tags the task right away.
      const label = list.addLabel(name, labelForm.color, labelForm.icon);
      task.labels = [...(task.labels ?? []), label.id];
    } else {
      const label = list.labels.find((item) => item.id === labelForm?.id);
      if (label) Object.assign(label, { name, color: labelForm.color, icon: labelForm.icon });
    }
    labelForm = null;
  }

  async function deleteLabel() {
    const id = labelForm?.id;
    const label = list.labels.find((item) => item.id === id);
    if (!id || !label) return;
    const confirmed = await confirm({
      title: 'Delete Label',
      message: `"${label.name}" is removed from every task of this page.`,
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    list.removeLabel(id);
    labelForm = null;
  }

  async function deleteTask() {
    const confirmed = await confirm({ title: 'Delete Task', message: `"${task.text}" is deleted.`, confirmLabel: 'Delete' });
    if (confirmed) onDelete();
  }

  // Capture phase, so Escape doesn't also close the sidebar or a settings panel behind the popup. The confirm
  // dialog on top handles its own Escape.
  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key !== 'Escape' || confirmState.request) return;
    event.stopPropagation();
    if (labelForm) labelForm = null;
    else onClose();
  }

  $effect(() => {
    if (labelForm) labelNameInput?.focus();
  });

  onMount(() => {
    const editor = createEditor({
      parent: editorParent,
      text: task.description ?? '',
      placeholder: 'Add a description. Markdown works: # Heading, **bold**, - [ ] task',
      onChange: (text) => (task.description = text)
    });
    titleInput?.focus();
    return () => editor.destroy();
  });
</script>

<svelte:window onkeydowncapture={handleKeyDown} />

<div class="dialog-layer" data-dialog>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={onClose}></div>

  <div class="dialog" role="dialog" aria-modal="true" aria-label="Task" transition:scale={{ duration: 200, start: 0.94 }}>
    <div class="head">
      <textarea
        class="title"
        rows="1"
        maxlength="500"
        spellcheck="false"
        aria-label="Task"
        bind:value={title}
        bind:this={titleInput}
        oninput={updateTitle}
        onblur={() => (title = task.text)}></textarea>
      <button class="close-btn m3-icon" title="Close" onclick={onClose}>close</button>
    </div>

    <section class="section">
      <h3 class="section-label">Priority</h3>
      <div class="tags">
        {#each PRIORITIES as priority (priority.key)}
          <TaskTag
            name={priority.label}
            color={priority.color}
            icon="flag"
            selected={task.priority === priority.key}
            onclick={() => togglePriority(priority.key)} />
        {/each}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3 class="section-label">Labels</h3>
        {#if list.labels.length > 0}
          <button class="text-btn" onclick={() => ((editingLabels = !editingLabels), (labelForm = null))}>
            {editingLabels ? 'Done' : 'Edit Labels'}
          </button>
        {/if}
      </div>

      <div class="tags">
        {#each list.labels as label (label.id)}
          <TaskTag
            name={label.name}
            color={label.color}
            icon={editingLabels ? 'edit' : labelIcon(label)}
            selected={editingLabels || (task.labels ?? []).includes(label.id)}
            title={editingLabels ? 'Change Label' : undefined}
            onclick={() => clickLabel(label)} />
        {/each}
        {#if !labelForm}
          <button class="add-label" onclick={newLabel}>
            <span class="add-icon m3-icon">add</span>
            <span>New Label</span>
          </button>
        {/if}
      </div>

      {#if labelForm}
        <div class="label-form">
          <!-- Looks like the label will: its icon and color. -->
          <div class="label-row" style:--tag="var(--{labelForm.color})">
            <span class="label-preview-icon m3-icon" aria-hidden="true">{labelForm.icon}</span>
            <input
              class="label-name"
              type="text"
              maxlength="40"
              placeholder="Label name"
              spellcheck="false"
              bind:value={labelForm.name}
              bind:this={labelNameInput}
              onkeydown={(event) => event.key === 'Enter' && saveLabel()} />
          </div>
          {#if suggestions.length > 0}
            <!-- Labels the page already has: pick one instead of creating it again. -->
            <div class="suggestions">
              <span class="suggestions-label">Use an existing label</span>
              <div class="tags">
                {#each suggestions as label (label.id)}
                  {@const tagged = (task.labels ?? []).includes(label.id)}
                  <TaskTag
                    name={label.name}
                    color={label.color}
                    icon={tagged ? 'check' : labelIcon(label)}
                    selected={tagged}
                    title={tagged ? 'Already on this task' : 'Add to this task'}
                    onclick={() => pickLabel(label)} />
                {/each}
              </div>
            </div>
          {/if}
          <div class="swatches" role="radiogroup" aria-label="Label color">
            {#each LABEL_COLORS as color (color)}
              <button
                class="swatch"
                class:selected={labelForm.color === color}
                style:--swatch="var(--{color})"
                role="radio"
                aria-checked={labelForm.color === color}
                aria-label={color}
                title={color[0].toUpperCase() + color.slice(1)}
                onclick={() => labelForm && (labelForm.color = color)}></button>
            {/each}
          </div>
          <div class="icons" role="radiogroup" aria-label="Label icon">
            {#each LABEL_ICONS as icon (icon)}
              <button
                class="icon-option m3-icon"
                class:selected={labelForm.icon === icon}
                style:--tag="var(--{labelForm.color})"
                role="radio"
                aria-checked={labelForm.icon === icon}
                title={icon.replace(/_/g, ' ')}
                onclick={() => labelForm && (labelForm.icon = icon)}>{icon}</button>
            {/each}
          </div>
          <div class="label-actions">
            {#if labelForm.id !== null}
              <button class="text-btn danger" onclick={deleteLabel}>Delete Label</button>
            {/if}
            <span class="spacer"></span>
            <button class="text-btn" onclick={() => (labelForm = null)}>Cancel</button>
            <!-- An exact name of an existing label uses it. Renaming to another label's name isn't possible. -->
            <button
              class="save-btn"
              disabled={!labelForm.name.trim() || (labelForm.id !== null && existingLabel !== undefined && existingLabel.id !== labelForm.id)}
              onclick={saveLabel}>
              {labelForm.id === null ? (existingLabel ? 'Use Label' : 'Add Label') : 'Save'}
            </button>
          </div>
        </div>
      {/if}
    </section>

    {#if widgetStore}
      <section class="section">
        <h3 class="section-label">Widgets</h3>
        {#if taskWidgets.length > 0}
          <TaskWidgets store={widgetStore} widgets={taskWidgets} quickRemove />
        {/if}
        <!-- Shown in the task, they only react to this task (a timer that starts when it's selected). -->
        <div class="tags">
          {#each Object.entries(WIDGET_TYPES) as [type, { label, icon }] (type)}
            <button class="add-label" onclick={() => widgetStore.add(type, task.id)}>
              <span class="add-icon m3-icon">{icon}</span>
              <span>{label}</span>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <section class="section description">
      <h3 class="section-label">Description</h3>
      <div class="editor" bind:this={editorParent}></div>
    </section>

    <div class="actions">
      <button class="text-btn danger" onclick={deleteTask}>
        <span class="text-icon m3-icon">delete</span>
        <span>Delete Task</span>
      </button>
      <button class="save-btn" onclick={onClose}>Done</button>
    </div>
  </div>
</div>


<style>
  .dialog-layer {
    position: fixed;
    inset: 0;
    z-index: 4000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background-color: var(--scrim);
  }

  .dialog {
    position: relative;
    box-sizing: border-box;
    width: min(100%, 640px);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 22px 26px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 30px;
    box-shadow: 0 12px 40px var(--shadow);
    color: var(--text);
    font-family: "Roboto Slab", serif;
    user-select: text;
    -webkit-user-select: text;
  }

  .head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .title {
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    padding: 6px 12px;
    margin-left: -12px;
    border: 2px solid transparent;
    border-radius: 14px;
    background: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 22px;
    line-height: 1.4;
    resize: none;
    overflow: hidden;
    outline: none;
    transition: border-color 0.2s, background-color 0.2s;
  }

  .title:hover {
    background-color: var(--surface-raised);
  }

  .title:focus {
    border-color: var(--accent);
    background: none;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-soft);
    font-size: 26px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background-color: var(--surface-active);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-label {
    margin: 0;
    font-family: "Stoke", serif;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--task);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .add-label {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 12px 3px 8px;
    border: 1.5px dashed var(--line);
    border-radius: 20px;
    background: none;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    line-height: 1.5;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }

  .add-label:hover {
    border-color: var(--text-muted);
    color: var(--text-soft);
  }

  .add-icon {
    font-size: 18px;
  }

  .label-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background-color: var(--surface-raised);
  }

  .label-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px 0 12px;
    border: 2px solid var(--tag);
    border-radius: 20px;
    background-color: color-mix(in srgb, var(--tag) 14%, var(--surface));
  }

  .label-preview-icon {
    font-size: 20px;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20;
    color: var(--tag);
  }

  .label-name {
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    padding: 7px 0;
    border: none;
    background: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    outline: none;
  }

  .icons {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .icon-option {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 10px;
    background: none;
    color: var(--text-soft);
    font-size: 20px;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  }

  .icon-option:hover {
    background-color: var(--surface-active);
  }

  .icon-option.selected {
    border-color: var(--tag);
    color: var(--tag);
    background-color: color-mix(in srgb, var(--tag) 14%, transparent);
  }

  .label-name::placeholder {
    color: var(--text-muted);
  }

  .suggestions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .suggestions-label {
    font-size: 13px;
    color: var(--text-muted);
  }

  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .swatch {
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background-color: var(--swatch);
    outline: 2.5px solid transparent;
    outline-offset: 2px;
    cursor: pointer;
    transition: outline-color 0.2s;
  }

  .swatch:hover {
    outline-color: var(--line);
  }

  .swatch.selected {
    outline-color: var(--text-soft);
  }

  .label-actions,
  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .actions {
    justify-content: space-between;
  }

  .spacer {
    flex: 1;
  }

  .text-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    cursor: pointer;
    transition: color 0.2s;
  }

  .text-btn:hover {
    color: var(--text);
  }

  .text-btn.danger:hover {
    color: var(--red);
  }

  .text-icon {
    font-size: 20px;
  }

  .save-btn {
    padding: 7px 22px;
    border: none;
    border-radius: 40px;
    background-color: var(--accent);
    color: var(--on-accent);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    cursor: pointer;
    transition: filter 0.2s, opacity 0.2s;
  }

  .save-btn:hover {
    filter: brightness(110%);
  }

  .save-btn:disabled {
    opacity: 0.4;
    cursor: default;
    filter: none;
  }

  /* The Notes editor, a box to write in. The page color, so its code blocks (raised color) still stand out. */
  .editor {
    --editor-space: 24px;
    min-height: 160px;
    max-height: 45vh;
    overflow-y: auto;
    padding: 12px 16px;
    border-radius: 18px;
    background-color: var(--bg);
    display: flex;
    flex-direction: column;
    cursor: text;
  }

  @media (max-width: 500px) {
    .dialog {
      padding: 18px;
    }
  }
</style>
