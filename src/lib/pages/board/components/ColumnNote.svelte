<!-- src/lib/pages/board/components/ColumnNote.svelte -->
<!-- A note on a board: the Notes page's editor without its toolbar and status bar, scrolling inside the
     column. Edits `note.text`, a local note's or a linked Notes page's own. -->
<script>
  import { onMount } from 'svelte';
  import { createEditor } from '../../notes/editor/editor.js';

  /** @type {{note: {text: string}}} */
  let { note } = $props();

  /** @type {HTMLElement} */
  let editorParent;
  /** @type {ReturnType<typeof createEditor> | undefined} */
  let editor;

  onMount(() => {
    editor = createEditor({ parent: editorParent, text: note.text, onChange: (text) => (note.text = text) });
    // The text is what the page measures (shareHeight), not the editor, which fills the page.
    editor.view.contentDOM.setAttribute('data-fill-content', '');
    return () => editor?.destroy();
  });

  // Changed elsewhere (the linked page, or ticked on the dashboard): the editor follows.
  $effect(() => editor?.setText(note.text));
</script>

<div class="note" data-fill>
  <div class="editor" bind:this={editorParent}></div>
</div>


<style>
  /* The rest of the app can't be selected, the note can. */
  .note {
    -webkit-user-select: text;
    user-select: text;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    margin: 0 -14px;
    padding: 4px 20px 14px;
  }

  /* Fills the page: a click below the text keeps writing there. No room of its own below the text
     (`--editor-space`), a squeezed note would scroll through it while its text fits. */
  .editor {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    --editor-space: 0px;
  }
</style>
