// src/lib/pages/board/shareHeight.js
// Svelte attachment for a board column: its stacked pages share its height. Every page gets as much as it needs;
// when they don't all fit, the space is split evenly, and a page that needs less than its share leaves the rest
// to the others (three full notes get a third each, a short one keeps its size and the other two split the rest).
// CSS can't do this with a column that only has a maximum height, so it's measured and set here.
//
// The pages are the column's children marked `data-stack-item` (`data-natural`: a fixed height they ask for). A page that's too tall for its height scrolls its
// element marked `data-fill`. Children marked `data-lifted` (a page being dragged) take no space.

/**
 * How tall a page would be with all its content showing: its height, with its scrolling part (`data-fill`) as
 * tall as what's in it. Measured without changing any style, so nothing scrolls back to the top.
 * @param {HTMLElement} item
 */
function naturalHeight(item) {
  // The dashed spot of a dragged page says how tall it wants to be.
  if (item.dataset.natural) return Number(item.dataset.natural);
  const fill = /** @type {HTMLElement | null} */ (item.querySelector('[data-fill]'));
  if (!fill) return item.scrollHeight;
  const box = fill.getBoundingClientRect();
  const style = getComputedStyle(fill);
  // Measured by what's marked as its content (`data-fill-content`): a part can be stretched to fill the page (a
  // note's editor, so a click below the text keeps writing), its content is the text in it.
  const marked = fill.querySelectorAll('[data-fill-content]');
  let bottom = box.top + parseFloat(style.paddingTop);
  for (const child of marked.length > 0 ? marked : fill.children) bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
  const content = bottom - box.top + fill.scrollTop + parseFloat(style.paddingBottom);
  // What's above the scrolling part (name, "Add Task", current task) keeps its size even when the page is
  // squeezed, so it's measured from the page's top, not taken from its current height.
  const above = box.top - item.getBoundingClientRect().top;
  return above + content;
}

/** How tall a column gets: two thirds of the window, at most the board's height. Keep in sync with the CSS. */
export const MAX_SHARE = 2 / 3;

/**
 * The column's maximum height in px. Its CSS `max-height` mixes % and dvh, which the browser doesn't report as a
 * number, so it's worked out the same way here.
 * @param {HTMLElement} node
 */
function maxHeight(node) {
  const board = node.parentElement;
  if (!board) return window.innerHeight * MAX_SHARE;
  const style = getComputedStyle(board);
  const boardHeight = board.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  return Math.min(boardHeight, window.innerHeight * MAX_SHARE);
}

/** @param {HTMLElement} node */
export function shareHeight(node) {
  function layout() {
    const items = /** @type {HTMLElement[]} */ ([...node.children].filter((child) => child instanceof HTMLElement && child.hasAttribute('data-stack-item') && !child.hasAttribute('data-lifted')));
    if (items.length === 0) return;

    const natural = items.map(naturalHeight);
    const gap = parseFloat(getComputedStyle(node).rowGap) || 0;
    const available = maxHeight(node) - gap * (items.length - 1);
    if (natural.reduce((sum, height) => sum + height, 0) <= available) {
      for (const item of items) item.style.height = '';
      return;
    }

    // Water-filling: the smallest pages keep their size while it's below an even share of what's left. A page
    // that gets all it needs is rounded up (a fraction of a pixel less and it would scroll), the shares of the
    // squeezed ones down (so they all fit).
    const heights = new Array(items.length).fill(0);
    let left = available;
    let open = items.map((_, index) => index).sort((a, b) => natural[a] - natural[b]);
    while (open.length > 0) {
      const share = left / open.length;
      const fits = open.filter((index) => Math.ceil(natural[index]) <= share);
      if (fits.length === 0) {
        for (const index of open) heights[index] = Math.floor(share);
        break;
      }
      for (const index of fits) {
        heights[index] = Math.ceil(natural[index]);
        left -= heights[index];
      }
      open = open.filter((index) => !fits.includes(index));
    }
    items.forEach((item, index) => (item.style.height = `${heights[index]}px`));
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      layout();
    });
  }

  // Content growing or shrinking (tasks added, a note typed in, a widget's edit panel opening): watched on what's
  // inside each scrolling part and on the rest of each page (name, "Add Task", current task), none of which
  // changes size with the heights set here. Laid out right away, before the frame is drawn: a frame later the
  // content would be a step ahead of the page all through an animation, and the page would show a scrollbar.
  const contentObserver = new ResizeObserver(() => layout());
  function observeContent() {
    contentObserver.disconnect();
    for (const element of node.querySelectorAll('[data-fill-content], [data-stack-item] > * > :not([data-fill])')) contentObserver.observe(element);
  }

  // Pages added, removed, moved or lifted. Their content mounts a moment later, so it's watched from the next
  // frame on.
  const mutationObserver = new MutationObserver(() => {
    requestAnimationFrame(observeContent);
    schedule();
  });
  mutationObserver.observe(node, { childList: true, attributes: true, subtree: true, attributeFilter: ['data-lifted'] });

  observeContent();
  layout();
  window.addEventListener('resize', schedule);

  return () => {
    contentObserver.disconnect();
    mutationObserver.disconnect();
    window.removeEventListener('resize', schedule);
  };
}
