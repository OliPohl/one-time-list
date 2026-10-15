<!-- src/lib/pages/whiteboard/WhiteboardCard.svelte -->
<!-- A Whiteboard page on the dashboard: the whole drawing as a preview, like a whiteboard in a board's column (the
     card's own button opens the page). Without a drawing, just that it's empty. -->
<script>
  import Whiteboard from './Whiteboard.svelte';
  import { shapeCount } from './store.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // Read when the dashboard is shown, the drawing only changes on its page.
  // svelte-ignore state_referenced_locally
  const count = shapeCount(page.id);
</script>

{#if count === 0}
  <div class="empty">
    <span class="icon m3-icon">draw</span>
    <span>Nothing drawn yet.</span>
  </div>
{:else}
  <div class="preview">
    <Whiteboard drawingId={page.id} preview />
  </div>
{/if}


<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    color: var(--text-muted);
  }

  .icon {
    font-size: 48px;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48;
    color: var(--accent);
  }

  /* Fills the card between its name and its button. */
  .preview {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border-radius: 22px;
  }
</style>
