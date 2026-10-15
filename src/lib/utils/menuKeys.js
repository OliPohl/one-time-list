// src/lib/utils/menuKeys.js
// Menus opened with a keyboard shortcut (a board's "Add New Column", the dashboard's "Link Page"): the first option
// gets the focus, the arrow keys move it, Enter presses the focused option.

/** Focuses the first option of the menu inside `root`. @param {HTMLElement | undefined} root */
export function focusFirstOption(root) {
  /** @type {HTMLElement | null | undefined} */ (root?.querySelector('[role="menu"] button'))?.focus();
}

/**
 * Moves the focus to the next (ArrowDown) or previous (ArrowUp) option, going round at the ends. For `onkeydown` on the menu.
 * @param {KeyboardEvent} event
 */
export function moveFocus(event) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const menu = /** @type {HTMLElement} */ (event.currentTarget);
  const buttons = /** @type {HTMLElement[]} */ ([...menu.querySelectorAll('button')]);
  const index = buttons.indexOf(/** @type {HTMLElement} */ (document.activeElement));
  buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
}
