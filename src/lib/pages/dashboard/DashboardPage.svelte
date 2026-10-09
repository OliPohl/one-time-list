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
  <!-- On the same line as the menu button, like the title of a Tasks page. -->
  <h1 class="heading">Dashboard</h1>

  <div class="slots" bind:this={grid}>
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
    /* The title row lines up with the menu button: 14px from the top, 46px tall. */
    padding: 14px 16px 40px;
  }

  .heading {
    min-height: 46px;
    margin: 0 0 18px;
    display: flex;
    align-items: center;
    font-family: "Stoke", serif;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  /*
    Keeps the title clear of the menu button (14px from the left, 46px wide, plus space = 80px): the content
    starts at max(0, (100vw - 1100px) / 2) + 16px, the title gets whatever is missing to 80px. It grows smoothly
    as the window narrows, the boxes below keep the full width.
  */
  .heading {
    padding-left: max(0px, calc(80px - max(0px, (100vw - 1100px) / 2) - 16px));
  }

  /* Positioned, so the cards' offsets are measured from the grid (see `reorder`). */
  .slots {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 16px;
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

  /* An outline, not a border: it takes no space, so the placeholder stays exactly the card's size. */
  .slot-item.placeholder {
    border-radius: 30px;
    outline: 2.5px dashed var(--line);
    outline-offset: -2.5px;
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
