// src/lib/utils/pressDrag.js
// Svelte attachment that starts dragging an element.
// Mouse / pen: the drag starts as soon as the pointer moves while the button is held.
// Touch: moving has to keep scrolling the page, so the finger is held still briefly first.

export const TOUCH_HOLD_MS = 150;
const DRAG_THRESHOLD = 4;
const TOUCH_MOVE_TOLERANCE = 10;

/**
 * @param {{
 *   onStart: (point: {clientX: number, clientY: number}, rect: DOMRect) => void,
 *   onPressChange?: (pressing: boolean) => void,
 *   isDragging: () => boolean,
 *   enabled?: () => boolean,
 *   ignore?: string
 * }} options
 * @returns {import('svelte/attachments').Attachment<HTMLElement>}
 */
export function pressDrag({ onStart, onPressChange, isDragging, enabled = () => true, ignore = 'button, input' }) {
  return (node) => {
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let holdTimer;
    let pressing = false;
    let isTouch = false;
    /** @type {{clientX: number, clientY: number}} */
    let origin = { clientX: 0, clientY: 0 };
    /** @type {{clientX: number, clientY: number}} */
    let point = origin;

    /** @param {boolean} value */
    function setPressing(value) {
      if (pressing === value) return;
      pressing = value;
      onPressChange?.(value);
    }

    function start() {
      const rect = node.getBoundingClientRect();
      cancel();
      onStart(origin, rect);
    }

    /** @param {PointerEvent} event */
    function handlePointerDown(event) {
      if (event.button !== 0 || !enabled()) return;
      // Only empty space starts a drag, never buttons or inputs.
      if (/** @type {Element} */ (event.target).closest(ignore)) return;

      isTouch = event.pointerType === 'touch';
      origin = { clientX: event.clientX, clientY: event.clientY };
      point = origin;

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', cancel);
      window.addEventListener('pointercancel', cancel);

      if (isTouch) {
        setPressing(true);
        holdTimer = setTimeout(start, TOUCH_HOLD_MS);
      }
    }

    /** @param {PointerEvent} event */
    function handleMove(event) {
      point = event;
      const distance = Math.hypot(point.clientX - origin.clientX, point.clientY - origin.clientY);

      if (isTouch) {
        // Moving before the hold finished means the user is scrolling.
        if (distance > TOUCH_MOVE_TOLERANCE) cancel();
      } else if (distance > DRAG_THRESHOLD) {
        start();
      }
    }

    function cancel() {
      clearTimeout(holdTimer);
      setPressing(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('pointercancel', cancel);
    }

    // Stop touch scrolling while dragging (needs a non-passive listener).
    /** @param {TouchEvent} event */
    function preventScroll(event) {
      if (isDragging()) event.preventDefault();
    }

    /** @param {Event} event */
    function preventContextMenu(event) {
      if (pressing || isDragging()) event.preventDefault();
    }

    // Lets other gestures (like the sidebar swipe) leave draggable elements alone.
    node.dataset.pressDrag = '';
    node.addEventListener('pointerdown', handlePointerDown);
    node.addEventListener('touchmove', preventScroll, { passive: false });
    node.addEventListener('contextmenu', preventContextMenu);

    return () => {
      cancel();
      delete node.dataset.pressDrag;
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('touchmove', preventScroll);
      node.removeEventListener('contextmenu', preventContextMenu);
    };
  };
}
