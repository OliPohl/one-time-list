// src/lib/app/pages.svelte.js
// The pages the user created, in sidebar order. Each page's own data is kept by its page type.

import { PAGE_TYPES } from '../pages/index.js';
import { loadJSON, saveJSON } from '../utils/storage.js';
import { uniqueId } from '../utils/id.js';
import { isBreakEnd } from '../widgets/views.js';

const STORAGE_KEY = 'taskbook_pages';
/** @typedef {import('../pages/types.js').Page} Page */

class PageList {
  /** @type {Page[]} */
  list = $state([]);

  /** Loads the pages and starts every page. A fresh install starts without pages, on the New Page screen. */
  load() {
    const saved = loadJSON(STORAGE_KEY, /** @type {Page[]} */ ([]));
    // Pages of types that no longer exist are kept in storage but not shown.
    this.list = saved.filter((page) => PAGE_TYPES[page.type]);

    for (const page of this.list) PAGE_TYPES[page.type].init?.(page);

    $effect.root(() => {
      $effect(() => saveJSON(STORAGE_KEY, [...this.list, ...saved.filter((page) => !PAGE_TYPES[page.type])]));
    });
  }

  /** The first page with an alarm or timer ringing. */
  firstRinging = $derived(this.list.find((page) => this.isRinging(page)));
  /** Some page has an alarm or timer ringing. */
  anyRinging = $derived(Boolean(this.firstRinging));

  /** @param {Page} page */
  isRinging(page) {
    return (PAGE_TYPES[page.type].ringingWidgets?.(page) ?? []).length > 0;
  }

  /** Everything ringing on the page is a pomodoro whose break ended, it then blinks in the break colors. @param {Page} page */
  isBreakEnd(page) {
    const ringing = PAGE_TYPES[page.type].ringingWidgets?.(page) ?? [];
    return ringing.length > 0 && ringing.every(isBreakEnd);
  }

  /** @param {string | undefined} id */
  get(id) {
    return this.list.find((page) => page.id === id);
  }

  /**
   * Adds and starts a page.
   * @param {{type: string, name: string, options: Record<string, any>}} settings
   * @returns {Page}
   */
  create(settings) {
    const page = this.#add(settings);
    PAGE_TYPES[page.type].init?.(page);
    return page;
  }

  /**
   * @param {{type: string, name: string, options: Record<string, any>}} settings
   * @returns {Page}
   */
  #add({ type, name, options }) {
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
