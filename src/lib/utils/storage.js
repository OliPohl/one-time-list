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

/** @param {string} key @param {unknown} value */
export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked, the app keeps working without saving.
  }
}
