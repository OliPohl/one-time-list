// src/lib/pages/whiteboard/window.svelte.js
// The whiteboard window of the whiteboard widgets: one at a time, over the page (AppShell shows it). A widget shows
// its drawing as a preview, the window to draw. A board's whiteboards open their own window (see BoardItem).

/** @type {{current: {drawingId: string, name: string} | null}} */
export const whiteboardWindow = $state({ current: null });

/** @param {string} drawingId @param {string} name */
export function openWhiteboard(drawingId, name) {
  whiteboardWindow.current = { drawingId, name };
}

export function closeWhiteboard() {
  whiteboardWindow.current = null;
}

/** Whether a drawing is open in the window, its preview then shows nothing. @param {string} drawingId */
export function isWhiteboardOpen(drawingId) {
  return whiteboardWindow.current?.drawingId === drawingId;
}
