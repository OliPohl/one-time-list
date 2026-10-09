<!-- src/lib/pages/dashboard/DashboardPage.svelte -->
<!-- Overview: the linked pages as cards (each page type's `Card`), plus one empty slot to link another page. -->
<script>
  import { flip } from 'svelte/animate';
  import { dashboard } from '../../app/dashboard.svelte.js';
  import { pressDrag } from '../../utils/pressDrag.js';
  import DashboardCard from './DashboardCard.svelte';
  import LinkSlot from './LinkSlot.svelte';

  /** Space at the top and bottom of the window where dragging scrolls the page. */
  const SCROLL_EDGE = 70;
  /** Keep in sync with `.slots` below: smallest column width and the gap. */
  const MIN_COLUMN = 320;
  const GAP = 16;

  let gridWidth = $state(0);
  // Width of one grid column, like CSS works it out for `repeat(auto-fill, minmax(min(100%, 320px), 1fr))`.
  // The centered first slot uses it, so it's as wide as the boxes will be.
  let columnWidth = $derived.by(() => {
    const columns = Math.max(1, Math.floor((gridWidth + GAP) / (Math.min(gridWidth, MIN_COLUMN) + GAP)));
    return (gridWidth - GAP * (columns - 1)) / columns;
  });

  /** @type {{id: string, x: number, y: number, offsetX: number, offsetY: number, width: number, height: number} | null} */
  let drag = $state(null);
  /** @type {HTMLElement} */
  let grid;

  let draggedPage = $derived(drag && dashboard.linked.find((page) => page.id === drag?.id));

  /**
   * @param {string} id
   * @param {{clientX: number, clientY: number}} point
   * @param {DOMRect} rect
   */
  function startDrag(id, point, rect) {
    drag = { id, x: point.clientX, y: point.clientY, offsetX: point.clientX - rect.left, offsetY: point.clientY - rect.top, width: rect.width, height: rect.height };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    navigator.vibrate?.(15);
    requestAnimationFrame(autoScroll);
  }

  /** @param {PointerEvent} event */
  function move(event) {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    reorder();
  }

  // The dragged card takes the place of the card under the pointer. Uses the layout positions (offsets inside
  // the grid), not the drawn ones: cards sliding into place would otherwise swap back and forth.
  function reorder() {
    if (!drag) return;
    const base = grid.getBoundingClientRect();
    for (const element of /** @type {NodeListOf<HTMLElement>} */ (grid.querySelectorAll('[data-slot-id]'))) {
      const id = element.dataset.slotId;
      if (!id || id === drag.id) continue;
      const left = base.left + element.offsetLeft;
      const top = base.top + element.offsetTop;
      if (drag.x < left || drag.x > left + element.offsetWidth || drag.y < top || drag.y > top + element.offsetHeight) continue;
      dashboard.move(drag.id, dashboard.linked.findIndex((page) => page.id === id));
      return;
    }
  }

  // Every frame while dragging: scrolls near the top or bottom of the window, and checks the card under the
  // pointer again, since cards that are still sliding into place may not have been under it at the last move.
  function autoScroll() {
    if (!drag) return;
    let speed = 0;
    if (drag.y < SCROLL_EDGE) speed = -(SCROLL_EDGE - drag.y) / 4;
    else if (drag.y > window.innerHeight - SCROLL_EDGE) speed = (drag.y - window.innerHeight + SCROLL_EDGE) / 4;
    if (speed !== 0) window.scrollBy(0, speed);
    reorder();
    requestAnimationFrame(autoScroll);
  }

  function stop() {
    drag = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  }
</script>

<main class="dashboard">
  <h1 class="heading">Dashboard</h1>

  <!-- Nothing linked yet: the empty slot sits in the middle of the page. -->
  <div
    class="slots"
    class:only-empty={dashboard.linked.length === 0}
    style:--column-width="{columnWidth}px"
    bind:this={grid}
    bind:clientWidth={gridWidth}>
    {#each dashboard.linked as page (page.id)}
      <!-- Drag a card by its empty space or header to move it, its buttons and controls keep working. -->
      <div
        class="slot-item"
        class:placeholder={drag?.id === page.id}
        data-slot-id={page.id}
        animate:flip={{ duration: 250 }}
        {@attach pressDrag({
          ignore: 'button, input, textarea, label, a',
          isDragging: () => drag?.id === page.id,
          onStart: (point, rect) => startDrag(page.id, point, rect)
        })}>
        <DashboardCard {page} />
      </div>
    {/each}
    <LinkSlot />
  </div>
</main>

{#if drag && draggedPage}
  <div
    class="ghost"
    style:left="{drag.x - drag.offsetX}px"
    style:top="{drag.y - drag.offsetY}px"
    style:width="{drag.width}px"
    style:height="{drag.height}px">
    <DashboardCard page={draggedPage} ghost />
  </div>
{/if}


<style>
  .dashboard {
    box-sizing: border-box;
    max-width: 1100px;
    min-height: 100vh;
    margin: auto;
    padding: 80px 16px 40px;
  }

  .heading {
    margin: 0 0 24px;
    font-family: "Stoke", serif;
    font-size: 40px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  /* Positioned, so the cards' offsets are measured from the grid (see `reorder`). */
  .slots {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 16px;
  }

  .slots.only-empty {
    min-height: calc(100vh - 220px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .slots.only-empty :global(.slot) {
    width: var(--column-width);
  }

  /* A card fills its grid cell and never gets wider: long names or task text shrink instead. */
  .slot-item {
    display: grid;
    min-width: 0;
  }

  .slot-item > :global(.slot) {
    min-width: 0;
  }

  /* Where the dragged card will land. */
  .slot-item.placeholder > :global(.slot) {
    visibility: hidden;
  }

  .slot-item.placeholder {
    border: 2.5px dashed var(--line);
    border-radius: 30px;
  }

  .ghost {
    position: fixed;
    z-index: 2000;
    display: grid;
    pointer-events: none;
    transform: scale(1.02);
    filter: drop-shadow(0 12px 30px var(--shadow));
  }

  /* Light gray boxes, shared by the cards, the empty slot and the dragged copy. */
  .slots :global(.slot),
  .ghost :global(.slot) {
    box-sizing: border-box;
    min-height: 280px;
    padding: 18px 20px 14px;
    background-color: var(--surface-card);
    border-radius: 30px;
  }

  /* The empty slot blends into the page. */
  .slots :global(.slot.empty) {
    background-color: transparent;
  }
</style>
