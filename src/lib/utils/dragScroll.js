// src/lib/utils/dragScroll.js
// Svelte attachment that scrolls by dragging empty space with the mouse, like a finger does on a phone: up and down
// whatever scrolls that way under the pointer (a column's tasks, a note, the page), sideways the `sideways` element
// (the board). Released while moving, it glides on and slows down. Touch scrolls by itself, it's left alone.
// Attached to the page's body, the empty space beside a page counts too, `vertical` is what scrolls up and down there.

/** Movement before deciding which way the drag scrolls. */
const LOCK_DISTANCE = 6;
/** Speed (px/ms) kept per frame while gliding, and below which it stops. */
const FRICTION = 0.93;
const MIN_VELOCITY = 0.02;
/** Fastest glide (px/ms), so a quick flick doesn't throw it to the end: it glides about 450px at most. */
const MAX_VELOCITY = 2;
/** Pressing these does what they do, never scrolls: text, buttons, things that are dragged themselves. */
const IGNORE = 'button, a, input, textarea, select, label, [contenteditable="true"], [role="button"], [data-press-drag], [data-dialog], [data-sidebar], .widget, .excalidraw';

/** @param {Element} element */
function scrollsVertically(element) {
  const { overflowY } = getComputedStyle(element);
  return (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight + 1;
}

/**
 * The nearest element from `start` up to `root` that scrolls up and down, else `fallback`, else the page.
 * @param {Element} start @param {Element} root @param {Element | null | undefined} fallback
 */
function verticalScroller(start, root, fallback) {
  for (let element = /** @type {Element | null} */ (start); element; element = element.parentElement) {
    if (scrollsVertically(element)) return element;
    if (element === root) break;
  }
  if (fallback && scrollsVertically(fallback)) return fallback;
  const page = document.scrollingElement;
  return page && page.scrollHeight > page.clientHeight + 1 ? page : null;
}

/**
 * @param {{
 *   sideways?: () => HTMLElement | null | undefined,
 *   vertical?: () => Element | null | undefined,
 *   onPanChange?: (panning: boolean) => void
 * }} [options]
 *   `onPanChange` tells when a sideways drag starts and ends (the board turns its column snapping off meanwhile)
 * @returns {import('svelte/attachments').Attachment<HTMLElement>}
 */
export function dragScroll({ sideways, vertical, onPanChange } = {}) {
  return (node) => {
    /** @type {{x: number, y: number, target: Element, scroller: Element | null, axis: 'x' | 'y' | null, start: number, time: number, velocity: number, last: number} | null} */
    let pan = null;
    let glide = 0;

    /** @param {PointerEvent} event */
    function handlePointerDown(event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      const target = /** @type {Element} */ (event.target);
      if (target.closest(IGNORE)) return;

      cancelAnimationFrame(glide);
      pan = { x: event.clientX, y: event.clientY, target, scroller: null, axis: null, start: 0, time: event.timeStamp, velocity: 0, last: 0 };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }

    /** @param {PointerEvent} event */
    function handlePointerMove(event) {
      if (!pan) return;
      const dx = event.clientX - pan.x;
      const dy = event.clientY - pan.y;

      if (!pan.axis) {
        if (Math.hypot(dx, dy) < LOCK_DISTANCE) return;
        const board = sideways?.();
        const upDown = verticalScroller(pan.target, node, vertical?.());
        if (Math.abs(dy) > Math.abs(dx) && upDown) {
          pan.axis = 'y';
          pan.scroller = upDown;
          pan.start = upDown.scrollTop;
        } else if (Math.abs(dx) >= Math.abs(dy) && board && board.scrollWidth > board.clientWidth) {
          pan.axis = 'x';
          pan.scroller = board;
          pan.start = board.scrollLeft;
          onPanChange?.(true);
        } else {
          return stop();
        }
        pan.last = pan.axis === 'x' ? dx : dy;
        document.documentElement.style.cursor = 'grabbing';
      }

      event.preventDefault();
      const delta = pan.axis === 'x' ? dx : dy;
      const elapsed = Math.max(1, event.timeStamp - pan.time);
      // Smoothed, so one uneven event doesn't decide the glide.
      pan.velocity = 0.8 * ((delta - pan.last) / elapsed) + 0.2 * pan.velocity;
      pan.last = delta;
      pan.time = event.timeStamp;

      const scroller = /** @type {Element} */ (pan.scroller);
      if (pan.axis === 'x') scroller.scrollLeft = pan.start - delta;
      else scroller.scrollTop = pan.start - delta;
    }

    function handlePointerUp() {
      if (pan?.axis) {
        swallowNextClick();
        const velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, -pan.velocity));
        startGlide(pan.axis, /** @type {Element} */ (pan.scroller), velocity);
      }
      stop();
    }

    /** @param {'x' | 'y'} axis @param {Element} scroller @param {number} velocity px/ms */
    function startGlide(axis, scroller, velocity) {
      let time = performance.now();
      const step = (/** @type {number} */ now) => {
        const elapsed = now - time;
        time = now;
        velocity *= Math.pow(FRICTION, elapsed / 16);
        if (Math.abs(velocity) < MIN_VELOCITY) return axis === 'x' && onPanChange?.(false);
        if (axis === 'x') scroller.scrollLeft += velocity * elapsed;
        else scroller.scrollTop += velocity * elapsed;
        glide = requestAnimationFrame(step);
      };
      if (Math.abs(velocity) < MIN_VELOCITY) return axis === 'x' && onPanChange?.(false);
      glide = requestAnimationFrame(step);
    }

    function stop() {
      pan = null;
      document.documentElement.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    }

    // The click that follows releasing a drag must not press whatever is under the mouse.
    function swallowNextClick() {
      /** @param {Event} event */
      const swallow = (event) => {
        event.stopPropagation();
        event.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    }

    node.addEventListener('pointerdown', handlePointerDown);
    return () => {
      node.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(glide);
      if (pan?.axis === 'x') onPanChange?.(false);
      stop();
    };
  };
}
