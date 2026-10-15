<!-- src/lib/app/SidebarRow.svelte -->
<!-- A page or folder in the sidebar. Its edit mode works like editing a task: rename it, or delete it with the left button.
     `extra` is shown below the row while editing (a folder's icon and color). -->
<script>
  import { fade, slide } from 'svelte/transition';
  import { isInDialog } from './confirm.svelte.js';

  const swapFade = { duration: 250 };

  /**
   * @type {{
   *   icon: string,
   *   iconColor?: string,
   *   name: string,
   *   title: string,
   *   kind: string,
   *   active?: boolean,
   *   ringing?: boolean,
   *   breakEnd?: boolean,
   *   editing: boolean,
   *   onEditChange: (editing: boolean) => void,
   *   onOpen: () => void,
   *   onRename: (name: string) => void,
   *   onDelete: () => boolean | Promise<boolean>,
   *   extra?: import('svelte').Snippet,
   *   shortcut?: string
   * }}
   */
  let { icon, iconColor, name, title, kind, active = false, ringing = false, breakEnd = false, editing, onEditChange, onOpen, onRename, onDelete, extra, shortcut = '' } = $props();

  let draft = $state('');
  /** @type {HTMLElement} */
  let root;
  /** @type {HTMLInputElement | undefined} */
  let input = $state();

  // Start every edit from the current name.
  $effect(() => {
    if (!editing) return;
    draft = name;
    input?.focus();
    input?.select();
  });

  function save() {
    onRename(draft);
    onEditChange(false);
  }

  function cancel() {
    onEditChange(false);
  }

  async function remove() {
    // Stays in edit mode while a dialog asks, cancelling it returns to editing.
    if (await onDelete()) onEditChange(false);
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Enter') save();
    if (event.key === 'Escape') {
      // Only leave edit mode, the sidebar stays open.
      event.stopPropagation();
      cancel();
    }
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    // composedPath is captured at dispatch, so it still holds buttons the click swapped out.
    if (editing && !event.composedPath().includes(root) && !isInDialog(event)) cancel();
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="row-wrap" bind:this={root}>
  <div class="row" class:active class:editing class:ringing>
    {#if editing}
      <button class="icon-btn delete m3-icon" title="Delete {kind}" in:fade={swapFade} onclick={remove}>delete</button>
      <input
        class="name-input"
        type="text"
        maxlength="60"
        spellcheck="false"
        bind:value={draft}
        bind:this={input}
        onkeydown={handleKeyDown} />
      <button class="icon-btn cancel m3-icon" title="Cancel" in:fade={swapFade} onclick={cancel}>close</button>
      <button class="icon-btn save m3-icon" title="Save Name" in:fade={swapFade} onclick={save}>check</button>
    {:else}
      <!-- While ringing it blinks in the global default colors, like the menu button. -->
      <button class="main" class:break-end={breakEnd} {title} onclick={onOpen}>
        <span class="type-icon m3-icon" style:color={iconColor} in:fade={swapFade}>{icon}</span>
        <span class="name">{name}</span>
      </button>
      <button class="icon-btn edit m3-icon" title="Edit {kind}" in:fade={swapFade} onclick={() => onEditChange(true)}>edit_square</button>
      <!-- The key that opens it (keyboard shortcuts), where the edit button shows on hover. -->
      {#if shortcut}
        <span class="shortcut" aria-hidden="true">{shortcut}</span>
      {/if}
    {/if}
  </div>
  {#if editing && extra}
    <div class="extra" transition:slide={{ duration: 200 }}>{@render extra()}</div>
  {/if}
</div>


<style>
  .row {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 4px;
    /* Same height in and out of edit mode, see `.item` in Sidebar.svelte. */
    height: var(--sidebar-item-height);
    padding-right: 8px;
    border-radius: 20px;
    color: var(--text-soft);
    transition: color 0.4s, background-color 0.4s;
  }

  /* Editing with extra options: they sit in the same highlighted box as the row. */
  .row-wrap:has(> .extra) {
    border-radius: 20px;
    background-color: var(--surface-active);
  }

  .extra {
    padding: 0 8px 8px;
  }

  .row.active,
  .row.editing {
    background-color: var(--surface-active);
  }

  .row.active {
    color: var(--accent);
  }

  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14px;
    align-self: stretch;
    padding: 0 0 0 16px;
    background: none;
    border: none;
    color: inherit;
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    text-align: left;
    cursor: pointer;
  }

  .row:not(.editing):hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  /* An alarm or timer of this page rings: blink until it's confirmed. */
  .row.ringing:not(.editing) .main {
    animation: blink var(--blink-duration) ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { color: var(--widget-blink-alt); }
    50% { color: var(--widget-blink); }
  }

  .type-icon {
    flex-shrink: 0;
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name-input {
    flex: 1;
    min-width: 0;
    padding: 4px 2px;
    background: none;
    border: none;
    border-bottom: 2px solid var(--accent);
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
  }

  .icon-btn {
    flex-shrink: 0;
    padding: 4px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 23px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
    cursor: pointer;
    transition: color 0.4s, opacity 0.3s;
  }

  .edit {
    opacity: 0;
    color: var(--text-soft);
  }

  .row:hover .edit,
  .edit:focus-visible {
    opacity: 1;
  }

  /* Touch screens have no hover, keep the edit button visible there. */
  .shortcut {
    position: absolute;
    right: 14px;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    pointer-events: none;
    transition: opacity 0.3s;
  }

  /* Makes room for the edit button. */
  .row:hover .shortcut,
  .row:focus-within .shortcut {
    opacity: 0;
  }

  @media (hover: none) {
    .edit {
      opacity: 1;
    }

    /* The edit button always shows there, and there's no keyboard. */
    .shortcut {
      display: none;
    }
  }

  .delete {
    margin-left: 10px;
    color: var(--red);
  }

  .cancel:hover {
    color: var(--text-soft);
  }

  .save {
    color: var(--green);
  }

  .save:hover {
    color: var(--green-hover);
  }
</style>
