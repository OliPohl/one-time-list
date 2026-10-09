// src/lib/utils/storage.js
// localStorage helpers that never throw (private mode, blocked or corrupt storage).

/**
 * @template T
 * @param {string} key
 * @param {T} fallback returned when nothing (valid) is saved
 * @returns {T}
 */
export function loadJSON(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Every key the app saves starts with this. Other sites on the same address share the storage. */
export const KEY_PREFIX = 'otl_';

let paused = false;

/** @param {string} key @param {unknown} value */
export function saveJSON(key, value) {
  if (paused) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked, the app keeps working without saving.
  }
}

/** Deletes everything this app saved and stops saving, so nothing writes it back before the page reloads. */
export function clearAppData() {
  paused = true;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(KEY_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Storage is blocked, nothing was saved either.
  }
}
