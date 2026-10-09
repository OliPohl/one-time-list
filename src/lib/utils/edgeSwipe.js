// src/lib/utils/edgeSwipe.js
// Svelte attachment for a drawer on the left: swiping right from the screen edge pulls it open,
// swiping left anywhere while it's open pushes it closed. The drawer follows the finger or mouse.

const EDGE = 24;
/** Movement before deciding between a horizontal swipe and a vertical scroll. */
const LOCK_DISTANCE = 10;
/** Faster swipes than this (px/ms) open or close the drawer regardless of how far they went. */
const FLING_VELOCITY = 0.4;
/** Swipes never start on these, so text can still be selected. */
const IGNORE = 'input, textarea, [contenteditable="true"], [data-dialog]';
/**
 * A mouse drag on these moves the element instead. Touch doesn't need this: a touch drag only starts
 * after holding still and then cancels its touchmove events, which ends the swipe.
 */
const IGNORE_MOUSE = `${IGNORE}, [data-press-drag]`;

/**
 * @param {{
 *   isOpen: () => boolean,
 *   width: () => number,
 *   onProgress: (progress: number | null) => void,
 *   onEnd: (open: boolean) => void
 * }} options progress is 0 (closed) to 1 (open) while the swipe moves, null once released
 * @returns {import('svelte/attachments').Attachment<Window | HTMLElement>}
 */
export function edgeSwipe({ isOpen, width, onProgress, onEnd }) {
  return (target) => {
    /** @type {{x: number, y: number, time: number, opening: boolean, locked: boolean} | null} */
    let swipe = null;
    let progress = 0;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} time
     * @param {EventTarget | null} element
     * @param {string} ignore
     */
    function begin(x, y, time, element, ignore) {
      swipe = null;
      const opening = !isOpen();
      if (opening && x > EDGE) return;
      if (element instanceof Element && element.closest(ignore)) return;

      swipe = { x, y, time, opening, locked: false };
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {Event} event
     * @returns {boolean} true while this swipe moves the drawer
     */
    function move(x, y, event) {
      if (!swipe) return false;
      // Something else (dragging a task or widget) already handles this touch.
      if (event.defaultPrevented && !swipe.locked) return (swipe = null), false;

      const dx = x - swipe.x;
      const dy = y - swipe.y;

      if (!swipe.locked) {
        if (Math.hypot(dx, dy) < LOCK_DISTANCE) return false;
        const towards = swipe.opening ? dx > 0 : dx < 0;
        if (!towards || Math.abs(dx) < Math.abs(dy)) return (swipe = null), false;
        swipe.locked = true;
      }

      event.preventDefault();
      const size = Math.max(1, width());
      progress = Math.min(1, Math.max(0, swipe.opening ? dx / size : 1 + dx / size));
      onProgress(progress);
      return true;
    }

    /**
     * @param {number} x
     * @param {number} time
     * @returns {boolean} true if a swipe ended
     */
    function finish(x, time) {
      if (!swipe?.locked) return (swipe = null), false;

      const velocity = (x - swipe.x) / Math.max(1, time - swipe.time);
      const open = velocity > FLING_VELOCITY ? true : velocity < -FLING_VELOCITY ? false : progress > 0.5;

      swipe = null;
      onProgress(null);
      onEnd(open);
      return true;
    }

    function cancel() {
      if (swipe?.locked) {
        onProgress(null);
        onEnd(!swipe.opening);
      }
      swipe = null;
    }

    // Touch

    /** @param {TouchEvent} event */
    function handleTouchStart(event) {
      if (event.touches.length !== 1) return (swipe = null);
      const touch = event.touches[0];
      begin(touch.clientX, touch.clientY, event.timeStamp, event.target, IGNORE);
    }

    /** @param {TouchEvent} event */
    function handleTouchMove(event) {
      const touch = event.touches[0];
      if (touch) move(touch.clientX, touch.clientY, event);
    }

    /** @param {TouchEvent} event */
    function handleTouchEnd(event) {
      finish(event.changedTouches[0]?.clientX ?? 0, event.timeStamp);
    }

    // Mouse and pen (touch is handled above, its pointer events are ignored)

    /** @param {PointerEvent} event */
    function handlePointerDown(event) {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      begin(event.clientX, event.clientY, event.timeStamp, event.target, IGNORE_MOUSE);
    }

    /** @param {PointerEvent} event */
    function handlePointerMove(event) {
      if (event.pointerType !== 'touch') move(event.clientX, event.clientY, event);
    }

    /** @param {PointerEvent} event */
    function handlePointerUp(event) {
      if (event.pointerType === 'touch') return;
      // The click that follows releasing a swipe must not press whatever is under the mouse.
      if (finish(event.clientX, event.timeStamp)) swallowNextClick();
    }

    /** @param {PointerEvent} event */
    function handlePointerCancel(event) {
      if (event.pointerType !== 'touch') cancel();
    }

    function swallowNextClick() {
      /** @param {Event} event */
      const swallow = (event) => {
        event.stopPropagation();
        event.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      // No click follows when the mouse was released over a different element.
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    }

    /** @type {Array<[string, EventListener, AddEventListenerOptions?]>} */
    const listeners = [
      ['touchstart', /** @type {EventListener} */ (handleTouchStart), { passive: true }],
      ['touchmove', /** @type {EventListener} */ (handleTouchMove), { passive: false }],
      ['touchend', /** @type {EventListener} */ (handleTouchEnd)],
      ['touchcancel', cancel],
      ['pointerdown', /** @type {EventListener} */ (handlePointerDown)],
      ['pointermove', /** @type {EventListener} */ (handlePointerMove)],
      ['pointerup', /** @type {EventListener} */ (handlePointerUp)],
      ['pointercancel', /** @type {EventListener} */ (handlePointerCancel)]
    ];

    for (const [type, listener, options] of listeners) target.addEventListener(type, listener, options);
    return () => {
      for (const [type, listener, options] of listeners) target.removeEventListener(type, listener, options);
    };
  };
}
