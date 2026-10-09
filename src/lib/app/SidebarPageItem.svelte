<!-- src/lib/app/SidebarPageItem.svelte -->
<!-- A page in the sidebar. Its edit mode works like editing a task: rename it, or delete it with the left button. -->
<script>
  import { fade } from 'svelte/transition';
  import { PAGE_TYPES } from '../pages/index.js';
  import { pages } from './pages.svelte.js';
  import { navigation } from './navigation.svelte.js';
  import { isInDialog } from './confirm.svelte.js';

  const swapFade = { duration: 250 };

  /**
   * @type {{
   *   page: import('../pages/types.js').Page,
   *   active: boolean,
   *   editing: boolean,
   *   onEditChange: (editing: boolean) => void
   * }}
   */
  let { page, active, editing, onEditChange } = $props();

  let draft = $state('');
  /** @type {HTMLElement} */
  let root;
  /** @type {HTMLInputElement | undefined} */
  let input = $state();

  let pageType = $derived(PAGE_TYPES[page.type]);
  let ringing = $derived(pages.isRinging(page));

  // Start every edit from the current name.
  $effect(() => {
    if (!editing) return;
    draft = page.name;
    input?.focus();
    input?.select();
  });

  function save() {
    pages.rename(page.id, draft);
    onEditChange(false);
  }

  function cancel() {
    onEditChange(false);
  }

  async function deletePage() {
    // Stays in edit mode while the dialog asks, cancelling it returns to editing.
    if (await navigation.deletePage(page.id)) onEditChange(false);
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

<div class="row" class:active class:editing class:ringing bind:this={root}>
  {#if editing}
    <button class="icon-btn delete m3-icon" title="Delete Page" in:fade={swapFade} onclick={deletePage}>delete</button>
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
    <button
      class="main"
      class:break-end={ringing && pages.isBreakEnd(page)}
      title={ringing ? `${pageType.label}: ringing` : pageType.label}
      onclick={() => navigation.go({ kind: 'page', id: page.id })}>
      <span class="type-icon m3-icon" in:fade={swapFade}>{pageType.icon}</span>
      <span class="name">{page.name}</span>
    </button>
    <button class="icon-btn edit m3-icon" title="Edit Page" in:fade={swapFade} onclick={() => onEditChange(true)}>edit_square</button>
  {/if}
</div>


<style>
  .row {
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
  @media (hover: none) {
    .edit {
      opacity: 1;
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
