// src/lib/app/folders.svelte.js
// The sidebar's order: pages and folders of pages, which can be collapsed. Folders can't hold folders.

import { pages } from './pages.svelte.js';
import { loadJSON, saveJSON } from '../utils/storage.js';
import { uniqueId } from '../utils/id.js';

const STORAGE_KEY = 'otl_folders';
const DEFAULT_NAME = 'New Folder';

/** Icons a folder can have, Material Symbols names. `folder` opens and closes with the folder. */
export const FOLDER_ICONS = [
  'folder', 'work', 'home', 'school', 'star', 'favorite', 'bookmark', 'inventory_2',
  'shopping_cart', 'savings', 'fitness_center', 'sports_esports', 'music_note', 'travel_explore', 'flight', 'restaurant',
  'pets', 'code', 'palette', 'lightbulb', 'science', 'event', 'rocket_launch', 'description'
];

/** Colors for a folder's icon, from the palette in global.css (`--red`, ...). An empty key keeps the text color. */
export const FOLDER_COLORS = [
  { key: '', label: 'Default' },
  { key: 'red', label: 'Red' },
  { key: 'orange', label: 'Orange' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
  { key: 'teal', label: 'Teal' },
  { key: 'blue', label: 'Blue' },
  { key: 'purple', label: 'Purple' },
  { key: 'pink', label: 'Pink' }
];

/** @typedef {{kind: 'page', id: string}} PageEntry */
/**
 * `icon` is one of FOLDER_ICONS and `color` a key of FOLDER_COLORS, both missing on folders from before they could
 * be picked.
 * @typedef {{kind: 'folder', id: string, name: string, collapsed: boolean, pageIds: string[], icon?: string, color?: string}} FolderEntry
 */
/** @typedef {PageEntry | FolderEntry} Entry */

/** @param {any} entry @returns {entry is Entry} */
function isEntry(entry) {
  if (entry?.kind === 'page') return typeof entry.id === 'string';
  return entry?.kind === 'folder' && typeof entry.id === 'string' && Array.isArray(entry.pageIds);
}

class Folders {
  /** As saved. May still list deleted pages and miss new ones, see `tree`. @type {Entry[]} */
  #layout = $state([]);

  /** The sidebar's top-level entries. Deleted pages are skipped, pages not placed yet come last. */
  tree = $derived.by(() => {
    /** @type {Set<string>} */
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local lookup, not state
    const placed = new Set();
    /** @param {string} id */
    const take = (id) => {
      if (!pages.get(id) || placed.has(id)) return false;
      placed.add(id);
      return true;
    };

    /** @type {Entry[]} */
    const entries = [];
    for (const entry of this.#layout) {
      if (entry.kind === 'folder') entries.push({ ...entry, pageIds: entry.pageIds.filter(take) });
      else if (take(entry.id)) entries.push(entry);
    }
    for (const page of pages.list) {
      if (take(page.id)) entries.push({ kind: 'page', id: page.id });
    }
    return entries;
  });

  /** Call after `pages.load()`. */
  load() {
    const saved = loadJSON(STORAGE_KEY, /** @type {Entry[]} */ ([]));
    this.#layout = Array.isArray(saved) ? saved.filter(isEntry) : [];

    $effect.root(() => {
      $effect(() => saveJSON(STORAGE_KEY, this.tree));
    });
  }

  /** @param {string} id @returns {FolderEntry | undefined} */
  get(id) {
    const entry = this.tree.find((item) => item.id === id);
    return entry?.kind === 'folder' ? entry : undefined;
  }

  /** The folder a page is in, if any. @param {string} pageId */
  folderOf(pageId) {
    return this.tree.find((entry) => entry.kind === 'folder' && entry.pageIds.includes(pageId));
  }

  /**
   * Adds an empty folder at the end.
   * @param {{name?: string, icon?: string, color?: string}} [settings]
   * @returns {string} its id
   */
  add({ name = '', icon = 'folder', color = '' } = {}) {
    const id = uniqueId((id) => Boolean(this.get(id) || pages.get(id)));
    this.#change((tree) => tree.push({ kind: 'folder', id, name: name.trim() || DEFAULT_NAME, collapsed: false, pageIds: [], icon, color }));
    return id;
  }

  /** @param {string} id @param {{icon?: string, color?: string}} style */
  setStyle(id, { icon, color }) {
    this.#change((tree) => {
      const folder = findFolder(tree, id);
      if (!folder) return;
      if (icon !== undefined) folder.icon = icon;
      if (color !== undefined) folder.color = color;
    });
  }

  /** Empty names fall back to the default name. @param {string} id @param {string} name */
  rename(id, name) {
    this.#change((tree) => {
      const folder = findFolder(tree, id);
      if (folder) folder.name = name.trim() || DEFAULT_NAME;
    });
  }

  /** @param {string} id */
  toggle(id) {
    this.#change((tree) => {
      const folder = findFolder(tree, id);
      if (folder) folder.collapsed = !folder.collapsed;
    });
  }

  /** Deletes a folder. Its pages stay, in its place. @param {string} id */
  remove(id) {
    this.#change((tree) => {
      const index = tree.findIndex((entry) => entry.id === id);
      const folder = tree[index];
      if (folder?.kind !== 'folder') return;
      tree.splice(index, 1, ...folder.pageIds.map((pageId) => /** @type {PageEntry} */ ({ kind: 'page', id: pageId })));
    });
  }

  /**
   * Moves a page into a folder, or to the top level with `folderId` null.
   * @param {string} pageId
   * @param {string | null} folderId
   * @param {number} index position in the target before the page is taken out
   */
  movePage(pageId, folderId, index) {
    this.#change((tree) => {
      const target = folderId === null ? null : findFolder(tree, folderId);
      if (folderId !== null && !target) return;

      // Take the page out, keeping `index` pointing at the same spot.
      const topIndex = tree.findIndex((entry) => entry.kind === 'page' && entry.id === pageId);
      if (topIndex !== -1) {
        tree.splice(topIndex, 1);
        if (!target && topIndex < index) index--;
      }
      for (const entry of tree) {
        if (entry.kind !== 'folder') continue;
        const inFolder = entry.pageIds.indexOf(pageId);
        if (inFolder === -1) continue;
        entry.pageIds.splice(inFolder, 1);
        if (entry === target && inFolder < index) index--;
      }

      if (target) target.pageIds.splice(index, 0, pageId);
      else tree.splice(index, 0, { kind: 'page', id: pageId });
    });
  }

  /** @param {string} id @param {number} index top-level position before the folder is taken out */
  moveFolder(id, index) {
    this.#change((tree) => {
      const from = tree.findIndex((entry) => entry.id === id);
      if (from === -1) return;
      const [folder] = tree.splice(from, 1);
      tree.splice(from < index ? index - 1 : index, 0, folder);
    });
  }

  /** Applies a change to a copy of the current tree and keeps it. @param {(tree: Entry[]) => void} change */
  #change(change) {
    const tree = $state.snapshot(this.tree);
    change(tree);
    this.#layout = tree;
  }
}

/** @param {Entry[]} tree @param {string} id @returns {FolderEntry | undefined} */
function findFolder(tree, id) {
  const entry = tree.find((item) => item.id === id);
  return entry?.kind === 'folder' ? entry : undefined;
}

export const folders = new Folders();
