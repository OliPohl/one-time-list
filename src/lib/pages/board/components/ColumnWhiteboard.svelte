<!-- src/lib/pages/board/components/ColumnWhiteboard.svelte -->
<!-- A whiteboard on a board: the whole drawing as a preview in the column, a click opens it in a window to draw
     (WhiteboardWindow). While the window is open the column shows no preview: one Excalidraw on a drawing at a time,
     the window's changes are shown when it closes. -->
<script>
  import Whiteboard from '../../whiteboard/Whiteboard.svelte';

  /** @type {{drawingId: string, open: boolean, onOpen: () => void}} */
  let { drawingId, open, onOpen } = $props();
</script>

<!-- The board gives it room like a note's text (see shareHeight): `.size` is how tall it'd like to be, it shrinks
     when its column is full. -->
<div class="whiteboard-box" data-fill>
  <div class="size" data-fill-content></div>
  {#if open}
    <p class="opened"><span class="m3-icon">open_in_full</span>Open in a window</p>
  {:else}
    <Whiteboard {drawingId} preview />
    <button class="open" title="Open Whiteboard" aria-label="Open Whiteboard" onclick={onOpen}>
      <span class="m3-icon">open_in_full</span>
    </button>
  {/if}
</div>


<style>
  .whiteboard-box {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border-radius: var(--task-radius);
  }

  .size {
    height: 320px;
  }

  .opened {
    position: absolute;
    inset: 0;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 2.5px dashed var(--line);
    border-radius: var(--task-radius);
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    color: var(--text-muted);
  }

  /* The whole preview opens the window. Its icon shows on hover, in the corner. */
  .open {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 10px;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
  }

  .open .m3-icon {
    padding: 6px;
    border-radius: 50%;
    background-color: var(--surface-raised);
    opacity: 0;
    transition: opacity 0.15s;
  }

  .open:hover .m3-icon,
  .open:focus-visible .m3-icon {
    opacity: 1;
  }
</style>
