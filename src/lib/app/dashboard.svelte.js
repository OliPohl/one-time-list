// src/lib/app/dashboard.svelte.js
// Which pages are shown on the dashboard, in order. Each slot shows the page's `Card` (see PageType).

import { pages } from './pages.svelte.js';
import { loadJSON, saveJSON } from '../utils/storage.js';

const STORAGE_KEY = 'otl_dashboard';

class Dashboard {
  /** Page ids. Deleted pages are skipped and dropped on the next save. @type {string[]} */
  slots = $state([]);
  /** Set when "Add New Page" is chosen from a slot: the new page gets linked when it's created. */
  linkNextPage = $state(false);

  /** The linked pages that still exist. */
  linked = $derived(this.slots.map((id) => pages.get(id)).filter((page) => page !== undefined));
  /** Pages that can still be linked. */
  unlinked = $derived(pages.list.filter((page) => !this.slots.includes(page.id)));

  load() {
    const saved = loadJSON(STORAGE_KEY, /** @type {string[]} */ ([]));
    this.slots = Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [];

    $effect.root(() => {
      $effect(() => saveJSON(STORAGE_KEY, this.linked.map((page) => page.id)));
    });
  }

  /** @param {string} id */
  link(id) {
    if (!this.slots.includes(id)) this.slots.push(id);
  }

  /** Moves a linked page to `index` among the linked pages. @param {string} id @param {number} index */
  move(id, index) {
    const order = this.linked.map((page) => page.id);
    const from = order.indexOf(id);
    if (from === -1 || from === index) return;
    order.splice(from, 1);
    order.splice(index, 0, id);
    this.slots = order;
  }

  /** @param {string} id */
  unlink(id) {
    this.slots = this.slots.filter((slot) => slot !== id);
  }
}

export const dashboard = new Dashboard();
