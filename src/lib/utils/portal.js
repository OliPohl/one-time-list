// src/lib/utils/portal.js
// Attachment that moves an element to the end of <body>, out of containers that would catch its events or
// clip it (e.g. a popup opened from a draggable dashboard card).

/** @param {HTMLElement} node */
export function portal(node) {
  document.body.append(node);
  return () => node.remove();
}
