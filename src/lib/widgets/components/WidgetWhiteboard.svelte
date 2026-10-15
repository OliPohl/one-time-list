<!-- src/lib/widgets/components/WidgetWhiteboard.svelte -->
<!-- The drawing of a whiteboard widget, filling the widget (see `bare` in Widget): the whole drawing as a preview, a click opens it in the
     whiteboard window to draw (whiteboard/window.svelte.js). While it's open there, or while the widget is dragged
     (a ghost), the preview is only an outline: one Excalidraw on a drawing at a time. -->
<script>
  import Whiteboard from '../../pages/whiteboard/Whiteboard.svelte';
  import { openWhiteboard, isWhiteboardOpen } from '../../pages/whiteboard/window.svelte.js';

  /** @type {{widget: any, ghost?: boolean}} */
  let { widget, ghost = false } = $props();

  let open = $derived(isWhiteboardOpen(widget.drawingId));
</script>

<div class="drawing">
  {#if open}
    <p class="note"><span class="m3-icon">open_in_full</span>Open in a window</p>
  {:else if !ghost}
    <Whiteboard drawingId={widget.drawingId} preview />
    <!-- Not a button: pressing a button never drags a widget, this one is dragged by its drawing. -->
    <div
      class="open"
      role="button"
      tabindex="0"
      title="Open Whiteboard"
      aria-label="Open Whiteboard"
      onclick={() => openWhiteboard(widget.drawingId, 'Whiteboard')}
      onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && openWhiteboard(widget.drawingId, 'Whiteboard')}>
    </div>
  {/if}
</div>


<style>
  .drawing {
    position: relative;
    height: 180px;
    overflow: hidden;
    background-color: var(--bg);
  }

  .note {
    position: absolute;
    inset: 0;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-muted);
  }

  .open {
    position: absolute;
    inset: 0;
    cursor: pointer;
  }
</style>
