<!-- src/lib/pages/board/components/ItemSettings.svelte -->
<!-- Settings of a page on a board, opened from its menu. A local page has its name, and by default the board's
     settings; without them its own colors and (a Tasks list) its own widgets option. A linked page shows the
     settings of that page itself, changes there change the page. -->
<script>
  import { fade, scale } from 'svelte/transition';
  import ColorOptions from '../../ColorOptions.svelte';
  import Toggle from '../../../ui/Toggle.svelte';
  import { colorsKey } from '../../../colors.js';
  import { boardWidgetsEnabled } from '../board.svelte.js';
  import { navigation } from '../../../app/navigation.svelte.js';
  import tasksType from '../../tasks/index.js';
  import notesType from '../../notes/index.js';
  import whiteboardType from '../../whiteboard/index.js';

  /**
   * @type {{
   *   item: import('../board.svelte.js').Item,
   *   board: import('../board.svelte.js').BoardStore,
   *   boardPage: import('../../types.js').Page,
   *   onClose: () => void
   * }}
   */
  let { item, board, boardPage, onClose } = $props();

  const TYPES = { tasks: tasksType, notes: notesType, whiteboard: whiteboardType };

  let linkedPage = $derived(board.pageOf(item));
  let linkedType = $derived(linkedPage ? TYPES[/** @type {keyof typeof TYPES} */ (linkedPage.type)] : undefined);

  // svelte-ignore state_referenced_locally
  let name = $state(board.nameOf(item));

  /** Saves the name, an emptied one keeps the old name. */
  function close() {
    board.renameItem(item.id, name);
    onClose();
  }

  /** Off starts with the board's settings, to change from there. @param {boolean} checked */
  function setBoardSettings(checked) {
    if (item.kind === 'link') return;
    if (checked) item.options = { own: false };
    else item.options = { own: true, colors: colorsKey(boardPage.options), widgets: boardWidgetsEnabled(boardPage.options) };
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }
</script>

<svelte:window onkeydowncapture={handleKeyDown} />

<div class="dialog-layer" data-dialog>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={close}></div>

  <div class="dialog" role="dialog" aria-modal="true" aria-label="Page Settings" transition:scale={{ duration: 200, start: 0.94 }}>
    <div class="head">
      <h2 class="heading">Page Settings</h2>
      <button class="close-btn m3-icon" title="Close" onclick={close}>close</button>
    </div>

    {#if linkedPage}
      <p class="note">
        <span class="m3-icon">link</span>
        <span>Linked page: these are the settings of the page itself.</span>
      </p>
    {/if}

    <label class="field">
      <span class="label">Name</span>
      <input
        class="name-input"
        type="text"
        maxlength="60"
        spellcheck="false"
        bind:value={name}
        onkeydown={(event) => event.key === 'Enter' && close()} />
    </label>

    {#if linkedPage && linkedType}
      <linkedType.Options options={linkedPage.options} page={linkedPage} type={linkedPage.type} />
    {:else if item.kind !== 'link'}
      {@const own = item.options.own === true}
      <div class="field">
        <span class="label">Settings</span>
        <Toggle checked={!own} onchange={setBoardSettings}>Same as the board</Toggle>
      </div>
      {#if own}
        <ColorOptions options={item.options} />
        {#if item.kind === 'tasks'}
          <div class="field">
            <span class="label">Widgets</span>
            <!-- Off keeps the widgets but stops them, so nothing rings in the background. -->
            <Toggle checked={item.options.widgets === true} onchange={(checked) => (item.options.widgets = checked)}>Enable widgets</Toggle>
          </div>
        {/if}
      {/if}
    {/if}

    {#if linkedPage}
      <button class="text-btn" onclick={() => navigation.go({ kind: 'page', id: linkedPage.id })}>
        <span class="m3-icon">open_in_new</span>
        <span>Go to Page</span>
      </button>
    {/if}
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
    width: min(100%, 440px);
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
  }

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .heading {
    flex: 1;
    margin: 0;
    font-family: "Stoke", serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .close-btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-muted);
    font-size: 24px;
    cursor: pointer;
    transition: color 0.3s, background-color 0.3s;
  }

  .close-btn:hover {
    color: var(--text);
    background-color: var(--surface-raised);
  }

  .note {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -8px 0 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .note .m3-icon {
    font-size: 18px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
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
    outline: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
  }

  .text-btn {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    cursor: pointer;
    transition: color 0.3s;
  }

  .text-btn:hover {
    color: var(--accent);
  }

  .text-btn .m3-icon {
    font-size: 20px;
  }
</style>
