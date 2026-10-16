<!-- src/lib/pages/whiteboard/WhiteboardWindow.svelte -->
<!-- A whiteboard maximized (on a board, or a whiteboard widget): a window over the page with the whole whiteboard to
     draw on, its name and a button to minimize it back to where it came from. Clicking beside the window or Escape
     minimizes it too, so does clicking its bar. Escape only once Excalidraw has nothing left to end with it (writing, drawing, a selection, a menu). -->
<script>
  import { fade, scale } from 'svelte/transition';
  import Whiteboard from './Whiteboard.svelte';

  /** @type {{drawingId: string, name: string, onClose: () => void}} */
  let { drawingId, name, onClose } = $props();

  /** @type {Whiteboard | undefined} */
  let whiteboard = $state();

  // Saved before the window closes (it goes away after its animation): the column shows the drawing right away.
  function close() {
    whiteboard?.flush();
    onClose();
  }

  /** Before Excalidraw gets it: it deselects first, the next Escape closes. @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || whiteboard?.usesEscape()) return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }
</script>

<svelte:window onkeydowncapture={handleKeydown} />

<!-- `data-dialog`: drawn over everything, also when it's inside a board, which leaves its clicks and mouse wheel alone. -->
<div class="window-layer" data-dialog>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={close}></div>

  <div class="window" role="dialog" aria-modal="true" aria-label={name} transition:scale={{ duration: 200, start: 0.94 }}>
    <!-- The bar is outside the drawing, clicking it closes the window like clicking beside it. -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bar" onclick={close}>
      <h2 class="name">{name}</h2>
      <!-- Closes with the bar. -->
      <button class="minimize m3-icon" title="Minimize">close_fullscreen</button>
    </div>
    <div class="area">
      <Whiteboard {drawingId} bind:this={whiteboard} />
    </div>
  </div>
</div>


<style>
  .window-layer {
    position: fixed;
    inset: 0;
    z-index: 4000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background-color: var(--scrim);
  }

  .window {
    position: relative;
    box-sizing: border-box;
    width: min(100%, 1600px);
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--surface-raised);
    border-radius: 30px;
    box-shadow: 0 12px 40px var(--shadow);
  }

  .bar {
    flex-shrink: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 10px 24px;
  }

  .name {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Stoke", serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .minimize {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--text-muted);
    font-size: 22px;
    cursor: pointer;
  }

  .minimize:hover {
    background-color: var(--surface-active);
    color: var(--text);
  }

  /* The whiteboard below the bar, its own corners rounded inside the window's. */
  .area {
    position: relative;
    flex: 1;
    min-height: 0;
    margin: 0 8px 8px;
    overflow: hidden;
    border-radius: 22px;
  }

  @media (max-width: 600px) {
    .window-layer {
      padding: 10px;
    }
  }
</style>
