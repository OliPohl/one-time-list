// src/lib/app/navigation.svelte.js
// Which view is shown and whether the sidebar is open.
// Pages are created by the user at runtime, so views are app state instead of SvelteKit routes.

import { pages } from './pages.svelte.js';
import { confirm } from './confirm.svelte.js';
import { loadJSON, saveJSON } from '../utils/storage.js';

const STORAGE_KEY = 'otl_view';

/** @typedef {{kind: 'dashboard'} | {kind: 'page', id: string} | {kind: 'new-page'}} View */

class Navigation {
  /** @type {View} */
  view = $state({ kind: 'dashboard' });
  sidebarOpen = $state(false);

  /** The page shown right now, if the view is a page. */
  page = $derived(this.view.kind === 'page' ? pages.get(this.view.id) : undefined);

  /** Where "Cancel" on the new page screen goes back to. @type {View} */
  #previous = { kind: 'dashboard' };

  /** Restores the last view, or the dashboard. Call after `pages.load()`. */
  load() {
    const saved = /** @type {View | null} */ (loadJSON(STORAGE_KEY, null));
    const isValid = saved?.kind === 'dashboard' || (saved?.kind === 'page' && pages.get(saved.id));

    // The last page that was open. A first visit (or after "Clear Cache") starts on the dashboard.
    this.view = isValid && saved ? saved : { kind: 'dashboard' };
  }

  /** @param {View} view */
  go(view) {
    if (view.kind === 'new-page' && this.view.kind !== 'new-page') this.#previous = this.view;
    this.view = view;
    this.sidebarOpen = false;
    // The new page screen is a draft, a reload returns to where the user came from.
    if (view.kind !== 'new-page') saveJSON(STORAGE_KEY, view);
  }

  /**
   * Asks first, then deletes a page. If it is shown, the first remaining page (or the dashboard) is shown instead.
   * @param {string} id
   * @returns {Promise<boolean>} true if the page was deleted
   */
  async deletePage(id) {
    const page = pages.get(id);
    if (!page) return false;

    const confirmed = await confirm({
      title: 'Are you sure?',
      message: `"${page.name}" and everything on it will be deleted. This can't be undone.`,
      confirmLabel: 'Delete Page'
    });
    if (!confirmed) return false;

    pages.remove(id);
    if (this.view.kind === 'page' && this.view.id === id) {
      const next = pages.list[0];
      this.go(next ? { kind: 'page', id: next.id } : { kind: 'dashboard' });
    }
    return true;
  }

  /** Leaves the new page screen without creating a page. */
  back() {
    const previous = this.#previous;
    this.go(previous.kind === 'page' && !pages.get(previous.id) ? { kind: 'dashboard' } : previous);
  }
}

export const navigation = new Navigation();
