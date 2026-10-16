// src/lib/pages/whiteboard/library.js
// The whiteboard's library (Excalidraw's shapes kept to reuse), shared by every whiteboard and saved in the browser
// like the drawings. A library picked on Excalidraw's library site (libraries.excalidraw.com, "Browse libraries")
// comes back as a link in the app's address (`#addLibrary=...`): after asking, it's loaded from there and added.

import { loadJSON, saveJSON } from '../../utils/storage.js';
import { confirm } from '../../app/confirm.svelte.js';

const STORAGE_KEY = 'taskbook_whiteboard_library';

/** Hosts a library may be loaded from, like Excalidraw's own check (its ALLOWED_LIBRARY_URLS). */
const ALLOWED = [
  { host: 'excalidraw.com', path: '/' },
  { host: 'raw.githubusercontent.com', path: '/excalidraw/excalidraw-libraries/' }
];

/** @returns {any[]} */
export function loadLibrary() {
  const items = loadJSON(STORAGE_KEY, /** @type {any[]} */ ([]));
  return Array.isArray(items) ? items : [];
}

/** @param {readonly any[]} items */
export function saveLibrary(items) {
  saveJSON(STORAGE_KEY, items);
}

/** Whether another tab changed the library. @param {StorageEvent} event */
export const isLibraryChange = (event) => event.key === STORAGE_KEY;

/** @param {string} link */
function isAllowed(link) {
  try {
    const url = new URL(link);
    return (
      url.protocol === 'https:' &&
      ALLOWED.some(({ host, path }) => (url.hostname === host || url.hostname.endsWith(`.${host}`)) && url.pathname.startsWith(path))
    );
  } catch {
    return false;
  }
}

/** Takes `addLibrary` (and the token that comes with it) out of the app's address. */
function clearHash() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  hash.delete('addLibrary');
  hash.delete('token');
  const rest = hash.toString();
  history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}${rest ? `#${rest}` : ''}`);
}

/**
 * Adds a library sent back from Excalidraw's library site, if the app was opened with one. Asks first, nothing is
 * loaded without a yes. Run on startup.
 */
export async function addLibraryFromAddress() {
  const link = new URLSearchParams(window.location.hash.slice(1)).get('addLibrary');
  if (!link) return;
  clearHash();
  if (!isAllowed(link)) return;

  const name = new URL(link).pathname.split('/').pop()?.replace(/\.excalidrawlib$/, '').replace(/[-_]+/g, ' ') || 'library';
  const add = await confirm({
    title: 'Add Library',
    message: `Add "${name}" to your whiteboard library? It's loaded from ${new URL(link).hostname}.`,
    confirmLabel: 'Add'
  });
  if (!add) return;

  try {
    const [{ loadLibraryFromBlob, mergeLibraryItems }, response] = await Promise.all([import('@excalidraw/excalidraw'), fetch(link)]);
    if (!response.ok) throw new Error(`${response.status}`);
    const items = await loadLibraryFromBlob(await response.blob(), 'published');
    saveLibrary(mergeLibraryItems(/** @type {any} */ (loadLibrary()), items));
  } catch (error) {
    console.error(error);
    await confirm({ title: 'Add Library', message: "The library couldn't be loaded.", confirmLabel: 'OK' });
  }
}
