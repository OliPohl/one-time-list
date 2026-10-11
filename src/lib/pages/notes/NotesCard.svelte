<!-- src/lib/pages/notes/NotesCard.svelte -->
<!-- A Notes page on the dashboard: the start of the note, formatted. Its checkboxes can be ticked here too. -->
<script>
  import Markdown from './Markdown.svelte';
  import { getNote } from './store.svelte.js';
  import { toggleTask } from './markdown.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // Shown for one page only, so the note never changes.
  // svelte-ignore state_referenced_locally
  const note = getNote(page.id);
</script>

{#if note.text.trim()}
  <div class="notes-card">
    <Markdown text={note.text} compact onToggleTask={(index) => (note.text = toggleTask(note.text, index))} />
  </div>
{:else}
  <p class="empty">Nothing written yet.</p>
{/if}


<style>
  /* Always the same height, whatever the note holds: the card stays as tall as the other dashboard cards (280px)
     and nothing moves while the note changes. Long notes fade out at the bottom, "Open Page" shows the rest. */
  .notes-card {
    height: 154px;
    overflow: hidden;
    mask-image: linear-gradient(to bottom, black 75%, transparent);
  }

  .empty {
    height: 154px;
    margin: 0;
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    color: var(--text-muted);
  }
</style>
