// src/lib/app/pages.svelte.js
// The pages the user created, in sidebar order. Each page's own data is kept by its page type.

import { PAGE_TYPES, DEFAULT_PAGE_TYPE, RENAMED_TYPES } from '../pages/index.js';
import { loadJSON, saveJSON } from '../utils/storage.js';
import { uniqueId } from '../utils/id.js';

const STORAGE_KEY = 'otl_pages';
/** Default names of renamed types, pages still called this get the new default name. */
const OLD_DEFAULT_NAMES = { 'one-time-list': 'One-Time-List', 'task-list': 'Task List' };

/** @param {Page} page */
function migrate(page) {
  const type = /** @type {keyof typeof RENAMED_TYPES} */ (page.type);
  if (!(type in RENAMED_TYPES)) return page;

  const renamed = { ...page, type: RENAMED_TYPES[type] };
  if (page.name === OLD_DEFAULT_NAMES[type]) renamed.name = PAGE_TYPES[renamed.type].defaultName;
  return renamed;
}

/** @typedef {import('../pages/types.js').Page} Page */

class PageList {
  /** @type {Page[]} */
  list = $state([]);

  /** Loads the pages, creates the first one on a fresh install and starts every page. */
  load() {
    const saved = loadJSON(STORAGE_KEY, /** @type {Page[]} */ ([])).map(migrate);
    // Pages of types that no longer exist are kept in storage but not shown.
    this.list = saved.filter((page) => PAGE_TYPES[page.type]);

    if (saved.length === 0) {
      const type = PAGE_TYPES[DEFAULT_PAGE_TYPE];
      const page = this.create({ type: type.type, name: type.defaultName, options: type.defaultOptions() });
      type.importLegacy?.(page.id);
    }

    for (const page of this.list) PAGE_TYPES[page.type].init?.(page);

    $effect.root(() => {
      $effect(() => saveJSON(STORAGE_KEY, [...this.list, ...saved.filter((page) => !PAGE_TYPES[page.type])]));
    });
  }

  /** @param {string | undefined} id */
  get(id) {
    return this.list.find((page) => page.id === id);
  }

  /**
   * @param {{type: string, name: string, options: Record<string, any>}} settings
   * @returns {Page}
   */
  create({ type, name, options }) {
    /** @type {Page} */
    const page = {
      id: uniqueId((id) => Boolean(this.get(id))),
      type,
      name,
      options,
      createdAt: Date.now()
    };

    this.list.push(page);
    // Return the reactive copy so later changes to it are saved.
    return /** @type {Page} */ (this.get(page.id));
  }

  /** Empty names fall back to the type's default name. @param {string} id @param {string} name */
  rename(id, name) {
    const page = this.get(id);
    if (page) page.name = name.trim() || PAGE_TYPES[page.type].defaultName;
  }

  /** Deletes a page and everything it saved. @param {string} id */
  remove(id) {
    const page = this.get(id);
    if (!page) return;

    PAGE_TYPES[page.type].destroy?.(page);
    this.list = this.list.filter((item) => item.id !== id);
  }
}

export const pages = new PageList();
