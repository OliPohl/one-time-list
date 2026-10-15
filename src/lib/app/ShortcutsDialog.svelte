<!-- src/lib/app/ShortcutsDialog.svelte -->
<!-- Every keyboard shortcut and its keys, in columns: pages and the board, opening pages 1 to 9, tasks. Opened from the settings or
     with "?". "+" waits for a key and adds it (a key another action had moves over, which is said below the row),
     × removes one, the arrow resets an action to its default keys. -->
<script>
  import { fade, scale, slide } from 'svelte/transition';
  import { ACTIONS, shortcuts, comboOf, comboLabel } from './shortcuts.svelte.js';
  import Toggle from '../ui/Toggle.svelte';

  /** @typedef {import('./shortcuts.svelte.js').ShortcutAction} ShortcutAction */

  const isPageNumber = (/** @type {ShortcutAction} */ action) => /^page\d$/.test(action.id);

  /** @param {import('./shortcuts.svelte.js').ShortcutGroup} group */
  const inGroup = (group) => ACTIONS.filter((action) => action.group === group && !isPageNumber(action));

  /** The columns, left to right, each with its boxes top to bottom. @type {{title: string, icon: string, actions: ShortcutAction[]}[][]} */
  const COLUMNS = [
    [
      { title: 'Pages', icon: 'description', actions: inGroup('pages') },
      { title: 'Board', icon: 'view_kanban', actions: inGroup('board') }
    ],
    [{ title: 'Open a Page', icon: 'format_list_numbered', actions: ACTIONS.filter(isPageNumber) }],
    [{ title: 'Tasks', icon: 'checklist', actions: inGroup('tasks') }]
  ];

  /** The action waiting for a key. @type {string | null} */
  let recordingId = $state(null);
  /** The last key that moved over from another action, said below the row it went to. @type {{id: string, from: string} | null} */
  let moved = $state(null);

  /** @type {HTMLButtonElement | undefined} */
  let closeButton = $state();

  $effect(() => closeButton?.focus());

  $effect(() => {
    shortcuts.recording = recordingId !== null;
    return () => (shortcuts.recording = false);
  });

  function close() {
    shortcuts.dialogOpen = false;
  }

  /** @param {string} id */
  function startRecording(id) {
    recordingId = id;
    moved = null;
  }

  // Capture phase, so Escape doesn't also close the sidebar behind it. While waiting for a key, every key is that key,
  // Escape stops waiting.
  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (!recordingId) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') return void (recordingId = null);

    const combo = comboOf(event);
    if (!combo) return;
    const other = shortcuts.actionOf(combo, recordingId);
    shortcuts.bind(recordingId, combo);
    moved = other ? { id: recordingId, from: other.label } : null;
    recordingId = null;
  }
</script>

<svelte:window onkeydowncapture={handleKeyDown} onpointerdown={() => (recordingId = null)} />

<div class="dialog-layer" data-dialog>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={close}></div>

  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" transition:scale={{ duration: 200, start: 0.94 }}>
    <div class="head">
      <h2 class="title" id="shortcuts-title">Keyboard Shortcuts</h2>
      <button class="close-btn m3-icon" title="Close" bind:this={closeButton} onclick={close}>close</button>
    </div>
    <div class="intro-row">
      <p class="intro">
        Single keys that work anywhere in the app. They wait while you type. Tasks are picked by pointing at them or with the task keys.
      </p>
      <Toggle checked={shortcuts.enabled} onchange={(checked) => (shortcuts.enabled = checked)}>Enable keyboard shortcuts</Toggle>
    </div>

    <!-- Turned off, the keys can still be changed, they're shown faded. -->
    <div class="columns" class:off={!shortcuts.enabled}>
      {#each COLUMNS as boxes (boxes[0].title)}
        <div class="stack">
          {#each boxes as column (column.title)}
            <section class="column">
              <h3 class="column-title"><span class="m3-icon">{column.icon}</span>{column.title}</h3>
              {#each column.actions as action (action.id)}
                <div class="row" class:waiting={recordingId === action.id}>
                  <span class="action-label">{action.label}</span>
                  <span class="keys">
                    {#each shortcuts.bindings[action.id] ?? [] as combo (combo)}
                      <span class="key">
                        <kbd>{comboLabel(combo)}</kbd>
                        <button class="remove m3-icon" title="Remove {comboLabel(combo)}" onclick={() => shortcuts.unbind(action.id, combo)}>close</button>
                      </span>
                    {/each}
                    {#if recordingId === action.id}
                      <span class="press">Press a key…</span>
                    {:else}
                      <!-- Pressed with the pointer, the window's pointerdown would stop it waiting right away. -->
                      <button
                        class="add m3-icon"
                        title="Add a Key"
                        onpointerdown={(event) => event.stopPropagation()}
                        onclick={() => startRecording(action.id)}>add</button>
                    {/if}
                    {#if !shortcuts.isDefault(action.id)}
                      <button class="reset m3-icon" title="Reset to Default" onclick={() => shortcuts.reset(action.id)}>undo</button>
                    {/if}
                  </span>
                </div>
                {#if moved?.id === action.id}
                  <p class="moved" transition:slide={{ duration: 150 }}>
                    Taken from “{moved.from}”.
                  </p>
                {/if}
              {/each}
            </section>
          {/each}
        </div>
      {/each}
    </div>

    <div class="foot">
      <button class="reset-all" onclick={() => shortcuts.resetAll()}>
        <span class="m3-icon">restart_alt</span>Reset All Shortcuts
      </button>
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
    width: min(100%, 1180px);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 28px 32px;
    background-color: var(--surface);
    border-radius: 30px;
    box-shadow: 0 12px 40px var(--shadow);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .title {
    margin: 0;
    font-family: 'Stoke', serif;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .close-btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    padding: 0;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-soft);
    font-size: 26px;
    cursor: pointer;
    transition:
      color 0.4s,
      background-color 0.4s;
  }

  .close-btn:hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .intro-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 20px;
  }

  .intro {
    margin: 0;
    font-family: 'Roboto Slab', serif;
    font-size: 14px;
    color: var(--text-muted);
  }

  /* As many columns as fit, one on a phone. */
  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 18px;
    align-items: start;
  }

  .columns.off {
    opacity: 0.45;
  }

  .columns {
    transition: opacity 0.3s;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 18px 20px;
    background-color: var(--surface-raised);
    border-radius: 24px;
  }

  .column-title {
    margin: 0 0 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Stoke', serif;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .column-title .m3-icon {
    font-size: 22px;
  }

  .row {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 -8px;
    padding: 0 8px;
    border-radius: 12px;
    font-family: 'Roboto Slab', serif;
    font-size: 15px;
    color: var(--text-soft);
    transition: background-color 0.3s;
  }

  .row:hover,
  .row.waiting {
    background-color: var(--surface-active);
  }

  .action-label {
    min-width: 0;
  }

  .keys {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
  }

  .key {
    display: inline-flex;
    align-items: center;
  }

  kbd {
    min-width: 16px;
    padding: 4px 10px;
    background-color: var(--surface);
    border: 1.5px solid var(--line);
    border-bottom-width: 3px;
    border-radius: 10px;
    color: var(--text);
    font-family: 'Roboto Slab', serif;
    font-size: 14px;
    text-align: center;
    white-space: nowrap;
  }

  .press {
    padding: 4px 10px;
    border: 1.5px dashed var(--accent);
    border-radius: 10px;
    color: var(--accent);
    font-size: 14px;
  }

  .remove,
  .add,
  .reset {
    padding: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 19px;
    cursor: pointer;
    transition: color 0.3s;
  }

  /* The × only shows on the key it removes. */
  .remove {
    width: 0;
    overflow: hidden;
    opacity: 0;
  }

  .key:hover .remove,
  .remove:focus-visible {
    width: 19px;
    margin-left: 2px;
    opacity: 1;
  }

  .add {
    width: 28px;
    height: 28px;
    border: 1.5px solid var(--line);
    border-radius: 10px;
  }

  .remove:hover,
  .add:hover,
  .reset:hover {
    color: var(--accent);
  }

  .moved {
    margin: 0 0 4px;
    font-family: 'Roboto Slab', serif;
    font-size: 12px;
    color: var(--text-muted);
    text-align: right;
  }

  .foot {
    display: flex;
    justify-content: flex-end;
  }

  .reset-all {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: 'Roboto Slab', serif;
    font-size: 14px;
    cursor: pointer;
    transition: color 0.4s;
  }

  .reset-all .m3-icon {
    font-size: 19px;
  }

  .reset-all:hover,
  .reset-all:focus-visible {
    color: var(--accent);
  }

  @media (max-width: 500px) {
    .dialog {
      padding: 22px 18px;
    }

    .title {
      font-size: 24px;
    }

    .column {
      padding: 14px 14px;
    }
  }
</style>
