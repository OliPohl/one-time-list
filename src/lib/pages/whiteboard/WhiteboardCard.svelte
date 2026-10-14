<!-- src/lib/pages/whiteboard/WhiteboardCard.svelte -->
<!-- A Whiteboard page on the dashboard: how many shapes it has. Excalidraw itself isn't loaded for the dashboard. -->
<script>
  import { shapeCount } from './store.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // Read when the dashboard is shown, the drawing only changes on its page.
  // svelte-ignore state_referenced_locally
  const count = shapeCount(page.id);
</script>

<div class="whiteboard-card">
  <span class="icon m3-icon">draw</span>
  <span class="count">{count === 0 ? 'Nothing drawn yet.' : `${count} ${count === 1 ? 'shape' : 'shapes'}`}</span>
</div>


<style>
  .whiteboard-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-family: "Roboto Slab", serif;
    color: var(--text-muted);
  }

  .icon {
    font-size: 48px;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48;
    color: var(--accent);
  }

  .count {
    font-size: 15px;
  }
</style>
