<!-- src/lib/pages/notes/NotesPage.svelte -->
<!-- A Notes page, edited like Obsidian's live preview (CodeMirror, see editor/): the note is shown formatted, the
     Markdown signs only show on the lines being edited. A toolbar on top formats the text (headings, bold,
     lists, ...), its button on the right shows or hides the Markdown signs everywhere, the formatting stays.
     A status bar at the bottom shows the caret's line and column and counts words and characters, like Notepad. -->
<script>
  import { onMount } from 'svelte';
  import PageHeader from '$lib/app/PageHeader.svelte';
  import { getNote } from './store.svelte.js';
  import { createEditor, applyChange } from './editor/editor.js';
  import { toggleWrap, toggleCode, insertLink, toggleLines, insertRule, lineKind } from './format.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // Shown for one page only, so the note never changes.
  // svelte-ignore state_referenced_locally
  const note = getNote(page.id);

  /** @type {HTMLElement} */
  let editorParent;
  /** @type {ReturnType<typeof createEditor> | undefined} */
  let editor;

  /** Where the caret is, for the status bar. */
  let caret = $state({ line: 1, column: 1 });
  /** What the caret's line is (heading, list, ...), its toolbar button shows as on. @type {import('./format.js').LineKind | null} */
  let currentKind = $state(null);
  let focused = $state(false);

  /** The Markdown signs are shown. Saved with the page. */
  let signs = $derived(page.options.signs === true);

  /**
   * The toolbar, left to right. `null` is a divider. Shortcuts work while editing.
   * @type {Array<{icon: string, title: string, run: () => void, kind?: import('./format.js').LineKind} | null>}
   */
  const TOOLS = [
    { icon: 'format_h1', title: 'Heading 1', kind: 'h1', run: () => format((state) => toggleLines(state, 'h1')) },
    { icon: 'format_h2', title: 'Heading 2', kind: 'h2', run: () => format((state) => toggleLines(state, 'h2')) },
    { icon: 'format_h3', title: 'Heading 3', kind: 'h3', run: () => format((state) => toggleLines(state, 'h3')) },
    null,
    { icon: 'format_bold', title: 'Bold (Ctrl+B)', run: () => format((state) => toggleWrap(state, '**')) },
    { icon: 'format_italic', title: 'Italic (Ctrl+I)', run: () => format((state) => toggleWrap(state, '*')) },
    { icon: 'format_strikethrough', title: 'Strikethrough', run: () => format((state) => toggleWrap(state, '~~')) },
    { icon: 'code', title: 'Code (block for several lines)', run: () => format(toggleCode) },
    { icon: 'link', title: 'Link (Ctrl+K)', run: () => format(insertLink) },
    null,
    { icon: 'format_list_bulleted', title: 'Bulleted List', kind: 'bullet', run: () => format((state) => toggleLines(state, 'bullet')) },
    { icon: 'format_list_numbered', title: 'Numbered List', kind: 'number', run: () => format((state) => toggleLines(state, 'number')) },
    { icon: 'checklist', title: 'Checklist', kind: 'task', run: () => format((state) => toggleLines(state, 'task')) },
    { icon: 'format_quote', title: 'Quote', kind: 'quote', run: () => format((state) => toggleLines(state, 'quote')) },
    { icon: 'horizontal_rule', title: 'Divider', run: () => format(insertRule) }
  ];

  /**
   * Formats the text at the caret or selection, as one step Ctrl+Z undoes.
   * @param {(state: import('./format.js').TextState) => import('./format.js').TextEdit} change
   */
  function format(change) {
    if (!editor) return;
    editor.view.focus();
    applyChange(editor.view, change);
  }

  /** @param {import('@codemirror/view').EditorView} view */
  function followCaret(view) {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    caret = { line: line.number, column: head - line.from + 1 };
    currentKind = lineKind(line.text);
    focused = view.hasFocus;
  }

  /** Words of the text, without Markdown signs, task boxes and link addresses. */
  let words = $derived(note.text.replace(/\]\([^)]*\)/g, ']').replace(/\[[ xX]\]/g, '').match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0);
  let characters = $derived(note.text.length);

  function toggleSigns() {
    page.options.signs = !signs;
    delete page.options.source;
  }

  onMount(() => {
    editor = createEditor({
      parent: editorParent,
      text: note.text,
      signs,
      onChange: (text) => (note.text = text),
      onCaret: followCaret
    });
    // An empty note starts ready to write.
    if (!note.text.trim()) editor.view.focus();
    return () => editor?.destroy();
  });

  $effect(() => editor?.setSigns(signs));
  // Changed elsewhere (ticked on the dashboard): the editor follows.
  $effect(() => editor?.setText(note.text));
</script>

<main class="notes-page">
  <PageHeader {page} />

  <div class="note">
    <!-- Pressing a button keeps the editor focused, the formatting goes into it. -->
    <div class="toolbar" role="toolbar" aria-label="Formatting" tabindex="-1" onmousedown={(event) => event.preventDefault()}>
      <div class="tools">
        {#each TOOLS as tool, index (index)}
          {#if tool}
            <button
              class="tool m3-icon"
              class:active={tool.kind && focused && currentKind === tool.kind}
              title={tool.title}
              onclick={tool.run}>{tool.icon}</button>
          {:else}
            <span class="divider" aria-hidden="true"></span>
          {/if}
        {/each}
      </div>
      <button
        class="tool m3-icon"
        class:active={signs}
        title={signs ? 'Hide Markdown Signs' : 'Show Markdown Signs'}
        aria-pressed={signs}
        onclick={toggleSigns}>tag</button>
    </div>

    <div class="editor" bind:this={editorParent}></div>

    <!-- Stays at the bottom of the window while a long note scrolls. -->
    <footer class="status" aria-live="off">
      <span>Ln {caret.line}, Col {caret.column}</span>
      <span class="status-counts">
        <span>{words} {words === 1 ? 'word' : 'words'}</span>
        <span>{characters} {characters === 1 ? 'character' : 'characters'}</span>
      </span>
    </footer>
  </div>
</main>


<style>
  /* Wider than a Tasks page, the note is the whole page. */
  .notes-page {
    box-sizing: border-box;
    max-width: 1100px;
    min-height: 100vh;
    margin: auto;
    padding: 0 10px 30px;
    display: flex;
    flex-direction: column;
  }

  /* Keeps the title clear of the menu button (80px from the left) while the page is only a little narrower than
     the window, like the dashboard title. Below 741px the header has its own layout for that. */
  @media (min-width: 741px) and (max-width: 1260px) {
    .notes-page :global(.page-header) {
      padding-left: max(0px, calc(80px - max(20px, (100vw - 1100px) / 2 + 10px)));
    }
  }

  /* The rest of the app can't be selected, the note can. */
  .note {
    -webkit-user-select: text;
    user-select: text;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-top: 18px;
    padding: 26px 32px 0;
    background-color: var(--surface);
    border-radius: 30px;
  }

  @media (max-width: 500px) {
    .note {
      padding: 20px 20px 0;
    }

    .toolbar {
      margin: -20px -20px 12px;
      padding: 6px 12px;
    }

    .status {
      margin: 0 -20px;
      padding: 8px 20px;
    }
  }

  /* Like Notepad's formatting bar: across the top of the note, stays in view while a long note scrolls. */
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 1;
    margin: -26px -32px 14px;
    padding: 6px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: var(--surface);
    border-bottom: 1.5px solid var(--surface-active);
    border-radius: 30px 30px 0 0;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Scrolls sideways when the window is too narrow for all the buttons. */
  .tools {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tool {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    border-radius: 10px;
    color: var(--text-soft);
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
    cursor: pointer;
    transition: color 0.3s, background-color 0.3s;
  }

  .tool:hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .tool.active {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .divider {
    flex-shrink: 0;
    width: 1.5px;
    height: 22px;
    margin: 0 6px;
    background-color: var(--surface-active);
  }

  /* The editor fills the note down to the status bar (see the theme in editor/editor.js). */
  .editor {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Like Notepad's status bar: across the bottom of the note, small and quiet. Not selectable. */
  .status {
    position: sticky;
    bottom: 0;
    margin: 0 -32px;
    padding: 8px 32px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    background-color: var(--surface);
    border-top: 1.5px solid var(--surface-active);
    border-radius: 0 0 30px 30px;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    -webkit-user-select: none;
    user-select: none;
    cursor: default;
  }

  .status-counts {
    display: flex;
    gap: 16px;
  }
</style>
