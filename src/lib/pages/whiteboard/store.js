// src/lib/pages/whiteboard/store.js
// The drawing of each Whiteboard page: its Excalidraw elements, the images in it and where it was looked at.

import { loadJSON, saveJSON } from '../../utils/storage.js';

/** @param {string} pageId */
const storageKey = (pageId) => `otl_whiteboard_${pageId}`;

/**
 * What's saved of a drawing. `view` is the scroll position and zoom, so it opens where it was left.
 * @typedef {{elements: any[], files: Record<string, any>, view?: {scrollX: number, scrollY: number, zoom: number}}} Drawing
 */

/** @param {string} pageId @returns {Drawing} */
export function loadDrawing(pageId) {
  const saved = loadJSON(storageKey(pageId), /** @type {any} */ ({}));
  return {
    elements: Array.isArray(saved.elements) ? saved.elements : [],
    files: saved.files && typeof saved.files === 'object' ? saved.files : {},
    view: saved.view
  };
}

/** @param {string} pageId @param {Drawing} drawing */
export function saveDrawing(pageId, drawing) {
  saveJSON(storageKey(pageId), drawing);
}

/** @param {string} pageId */
export function deleteDrawing(pageId) {
  localStorage.removeItem(storageKey(pageId));
}

/** How many shapes a drawing has, for the dashboard. @param {string} pageId */
export function shapeCount(pageId) {
  return loadDrawing(pageId).elements.filter((element) => !element.isDeleted).length;
}
