// src/lib/app/folders.svelte.js
// The sidebar's order: pages and folders of pages, which can be collapsed. Folders can't hold folders.

import { pages } from './pages.svelte.js';
import { loadJSON, saveJSON } from '../utils/storage.js';
import { uniqueId } from '../utils/id.js';
import { withGameJamIcons } from '../icons.js';

const STORAGE_KEY = 'taskbook_folders';
const DEFAULT_NAME = 'New Folder';

/** Icons a folder can have, Material Symbols names: everyday ones, then game jam ones. `folder` opens and closes with the folder. */
export const FOLDER_ICONS = withGameJamIcons([
  'folder', 'work', 'home', 'school', 'star', 'favorite', 'bookmark', 'inventory_2',
  'shopping_cart', 'savings', 'fitness_center', 'sports_esports', 'music_note', 'travel_explore', 'flight', 'restaurant',
  'pets', 'code', 'palette', 'lightbulb', 'science', 'event', 'rocket_launch', 'description'
]);

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
 * A folder holds pages and other folders (`children`), in their order. `icon` is one of FOLDER_ICONS and `color` a
 * key of FOLDER_COLORS, both missing on folders from before they could be picked.
 * @typedef {{kind: 'folder', id: string, name: string, collapsed: boolean, children: Entry[], icon?: string, color?: string}} FolderEntry
 */
/** @typedef {PageEntry | FolderEntry} Entry */

/**
 * A saved entry, or null if it isn't one. Folders from before they could hold folders list their pages in `pageIds`.
 * @param {any} entry
 * @returns {Entry | null}
 */
function readEntry(entry) {
  if (entry?.kind === 'page') return typeof entry.id === 'string' ? { kind: 'page', id: entry.id } : null;
  if (entry?.kind !== 'folder' || typeof entry.id !== 'string') return null;
  const saved = Array.isArray(entry.children)
    ? entry.children
    : Array.isArray(entry.pageIds) ? entry.pageIds.map((/** @type {string} */ id) => ({ kind: 'page', id })) : [];
  // eslint-disable-next-line no-unused-vars
  const { pageIds, ...folder } = entry;
  return { ...folder, children: saved.map(readEntry).filter((/** @type {Entry | null} */ item) => item !== null) };
}

/** Every page in entries, also in folders inside folders. @param {Entry[]} entries @returns {string[]} */
export function pageIdsIn(entries) {
  return entries.flatMap((entry) => (entry.kind === 'page' ? [entry.id] : pageIdsIn(entry.children)));
}

/**
 * The entry (page or folder) with this id anywhere in the entries, the list it's in and its position there.
 * @param {Entry[]} entries
 * @param {string} id
 * @returns {{entry: Entry, list: Entry[], index: number} | null}
 */
function locate(entries, id) {
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.id === id) return { entry, list: entries, index };
    if (entry.kind === 'folder') {
      const found = locate(entry.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** @param {Entry[]} entries @param {string} id @returns {FolderEntry | undefined} */
function findFolder(entries, id) {
  const entry = locate(entries, id)?.entry;
  return entry?.kind === 'folder' ? entry : undefined;
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
    /** @param {Entry[]} entries @returns {Entry[]} */
    const clean = (entries) =>
      entries.flatMap((entry) => {
        /** @type {Entry[]} */
        const kept = entry.kind === 'folder' ? [{ ...entry, children: clean(entry.children) }] : take(entry.id) ? [entry] : [];
        return kept;
      });

    const entries = clean(this.#layout);
    for (const page of pages.list) {
      if (take(page.id)) entries.push({ kind: 'page', id: page.id });
    }
    return entries;
  });

  /** Call after `pages.load()`. */
  load() {
    const saved = loadJSON(STORAGE_KEY, /** @type {any[]} */ ([]));
    this.#layout = Array.isArray(saved) ? saved.map(readEntry).filter((entry) => entry !== null) : [];

    $effect.root(() => {
      $effect(() => saveJSON(STORAGE_KEY, this.tree));
    });
  }

  /** A folder anywhere in the tree. @param {string} id @returns {FolderEntry | undefined} */
  get(id) {
    return findFolder(this.tree, id);
  }

  /** The folder a page or folder is directly in, if any. @param {string} id @returns {FolderEntry | undefined} */
  parentOf(id) {
    /** @param {Entry[]} entries @param {FolderEntry | undefined} parent @returns {FolderEntry | undefined | null} */
    const search = (entries, parent) => {
      for (const entry of entries) {
        if (entry.id === id) return parent;
        if (entry.kind === 'folder') {
          const found = search(entry.children, entry);
          if (found !== null) return found;
        }
      }
      return null;
    };
    return search(this.tree, undefined) ?? undefined;
  }

  /** True if `id` is the folder `folderId` or anywhere inside it. @param {string} id @param {string} folderId */
  isInside(id, folderId) {
    const folder = this.get(folderId);
    return id === folderId || (folder !== undefined && locate(folder.children, id) !== null);
  }

  /**
   * Adds an empty folder at the end.
   * @param {{name?: string, icon?: string, color?: string}} [settings]
   * @returns {string} its id
   */
  add({ name = '', icon = 'folder', color = '' } = {}) {
    const id = uniqueId((id) => Boolean(this.get(id) || pages.get(id)));
    this.#change((tree) => tree.push({ kind: 'folder', id, name: name.trim() || DEFAULT_NAME, collapsed: false, children: [], icon, color }));
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

  /** Deletes a folder. What it holds (pages and folders) stays, in its place. @param {string} id */
  remove(id) {
    this.#change((tree) => {
      const found = locate(tree, id);
      if (found?.entry.kind !== 'folder') return;
      found.list.splice(found.index, 1, ...found.entry.children);
    });
  }

  /**
   * Moves a page or a folder (with everything in it) into a folder, or to the top level with `folderId` null.
   * A folder can't go into itself or a folder inside it.
   * @param {string} id
   * @param {string | null} folderId
   * @param {number} index position in the target before the entry is taken out
   */
  move(id, folderId, index) {
    if (folderId !== null && this.isInside(folderId, id)) return;
    this.#change((tree) => {
      const target = folderId === null ? tree : findFolder(tree, folderId)?.children;
      const found = locate(tree, id);
      if (!target || !found) return;

      // Take it out, keeping `index` pointing at the same spot.
      found.list.splice(found.index, 1);
      if (found.list === target && found.index < index) index--;
      target.splice(index, 0, found.entry);
    });
  }

  /** Applies a change to a copy of the current tree and keeps it. @param {(tree: Entry[]) => void} change */
  #change(change) {
    const tree = $state.snapshot(this.tree);
    change(tree);
    this.#layout = tree;
  }
}

export const folders = new Folders();
