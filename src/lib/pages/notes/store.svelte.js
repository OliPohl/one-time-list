// src/lib/pages/notes/store.svelte.js
// The text of each Notes page, saved in the browser on every change.

import { loadJSON, saveJSON } from '../../utils/storage.js';

/** @param {string} pageId */
const storageKey = (pageId) => `otl_notes_${pageId}`;

class Note {
  /** Markdown source. */
  text = $state('');
  #stopSaving;

  /** @param {string} pageId */
  constructor(pageId) {
    const saved = loadJSON(storageKey(pageId), /** @type {{text?: string}} */ ({}));
    this.text = typeof saved.text === 'string' ? saved.text : '';
    this.#stopSaving = $effect.root(() => {
      $effect(() => saveJSON(storageKey(pageId), { text: this.text }));
    });
  }

  stop() {
    this.#stopSaving();
  }
}

/** @type {Map<string, Note>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache, the notes themselves are reactive
const notes = new Map();

/** The note of a page, loaded on first use. @param {string} pageId */
export function getNote(pageId) {
  let note = notes.get(pageId);
  if (!note) {
    note = new Note(pageId);
    notes.set(pageId, note);
  }
  return note;
}

/** Stops saving and deletes the saved text. @param {string} pageId */
export function deleteNote(pageId) {
  notes.get(pageId)?.stop();
  notes.delete(pageId);
  localStorage.removeItem(storageKey(pageId));
}
