<!-- src/lib/app/PageHeader.svelte -->
<!-- Title of a page with its settings: the name, the options of the page type and deleting the page. -->
<script>
  import { PAGE_TYPES } from '../pages/index.js';
  import { pages } from './pages.svelte.js';
  import { navigation } from './navigation.svelte.js';
  import { isInDialog } from './confirm.svelte.js';

  /**
   * `visible` is false while the page hides the header, it then can't be focused and its settings close.
   * `icon` is shown before the title, `centered` puts icon, title and settings button in the middle of the page.
   * @type {{page: import('../pages/types.js').Page, visible?: boolean, icon?: string, centered?: boolean}}
   */
  let { page, visible = true, icon = '', centered = false } = $props();

  let open = $state(false);
  /** @type {HTMLElement} */
  let root;

  let pageType = $derived(PAGE_TYPES[page.type]);

  // Hiding the header also closes its settings.
  $effect(() => {
    if (!visible && open) close();
  });

  function close() {
    open = false;
    // An emptied name falls back to the default once the user is done.
    pages.rename(page.id, page.name);
  }

  function toggle() {
    if (open) close();
    else open = true;
  }

  function deletePage() {
    navigation.deletePage(page.id);
  }

  /** @param {MouseEvent} event */
  function handleClickOutside(event) {
    if (open && !event.composedPath().includes(root) && !isInDialog(event)) close();
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (open && event.key === 'Escape') close();
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeyDown} />

<header class="page-header" class:centered inert={!visible} bind:this={root}>
  {#if icon}<span class="title-icon m3-icon">{icon}</span>{/if}
  <h1 class="title">{page.name}</h1>

  <button class="settings-btn m3-icon" class:open title="Page Settings" aria-expanded={open} onclick={toggle}>settings</button>

  {#if open}
    <div class="panel">
      <label class="field">
        <span class="label">Name</span>
        <input
          class="name-input"
          type="text"
          maxlength="60"
          spellcheck="false"
          bind:value={page.name}
          onkeydown={(event) => event.key === 'Enter' && close()} />
      </label>

      {#if pageType.Options}
        <pageType.Options options={page.options} {page} type={page.type} />
      {/if}

      <button class="delete-btn" onclick={deletePage}>
        <span class="delete-icon m3-icon">delete</span>
        <span>Delete Page</span>
      </button>
    </div>
  {/if}
</header>


<style>
  .page-header {
    position: relative;
    z-index: 1100;
    box-sizing: border-box;
    width: 100%;
    min-height: 46px;
    margin-top: 14px;
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 1fr 46px;
    align-items: center;
    gap: 12px;
  }

  .page-header.centered {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 0;
  }

  .title-icon {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    color: var(--accent);
  }

  /* Without room beside the column the menu button sits in the first column, the title is centered between both buttons. */
  @media (max-width: 740px) {
    .page-header:not(.centered) {
      grid-template-columns: 46px 1fr 46px;
    }

    .page-header:not(.centered) .title {
      grid-column: 2;
      text-align: center;
    }
  }

  .title {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Stoke", serif;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .settings-btn {
    grid-column: -2;
    grid-row: 1;
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-soft);
    font-size: 28px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 28;
    cursor: pointer;
    transition: color 0.4s, background-color 0.4s, transform 0.4s;
  }

  .settings-btn:hover,
  .settings-btn.open {
    color: var(--accent);
    background-color: var(--surface-raised);
  }

  .settings-btn.open {
    transform: rotate(60deg);
  }

  .panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    box-sizing: border-box;
    width: min(100%, 420px);
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 30px;
    box-shadow: 0 12px 40px var(--shadow);
    animation: drop-in 0.2s ease-out;
  }

  /* Below the middle of a centered header, `translate` keeps the drop-in animation's transform free. */
  .centered .panel {
    right: auto;
    left: 50%;
    width: min(calc(100vw - 20px), 420px);
    translate: -50% 0;
  }

  @keyframes drop-in {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    color: var(--text-muted);
  }

  .name-input {
    box-sizing: border-box;
    width: 100%;
    padding: 10px 20px;
    background-color: var(--surface);
    border: 2.5px solid var(--accent);
    border-radius: 40px;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
  }

  .delete-btn {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    cursor: pointer;
    transition: color 0.4s;
  }

  .delete-btn:hover {
    color: var(--red);
  }

  .delete-icon {
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
  }
</style>
