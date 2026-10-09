// src/lib/pages/widget-pages/store.svelte.js
// A widget page keeps exactly one widget in its own WidgetStore. Like the Tasks lists, the stores stay
// loaded for every page so timers and alarms keep running while another page is shown.

import { WidgetStore } from '../../widgets/store.svelte.js';

/** @param {string} pageId */
const storageKey = (pageId) => `otl_widget_page_${pageId}`;

/** @type {Map<string, WidgetStore>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache, the stores themselves are reactive
const stores = new Map();

/**
 * The loaded store of a widget page. On first use it gets the widget set up on the "New Page" screen
 * (`page.options.widget`), or a new one.
 * @param {import('../types.js').Page} page
 */
export function getWidgetPageStore(page) {
  let store = stores.get(page.id);
  if (!store) {
    store = new WidgetStore(storageKey(page.id));
    store.load();

    if (!store.list.some((widget) => widget.type === page.type)) {
      const draft = page.options.widget;
      if (draft?.type === page.type) store.list.push({ ...draft });
      else store.add(page.type);
    }
    // The draft is only needed until the page has its own store.
    delete page.options.widget;

    stores.set(page.id, store);
  }
  return store;
}

/** The store of a page if it's loaded, without loading it. @param {string} pageId */
export function findWidgetPageStore(pageId) {
  return stores.get(pageId);
}

/** The widget of a widget page. @param {import('../types.js').Page} page */
export function widgetOf(page) {
  return getWidgetPageStore(page).list.find((widget) => widget.type === page.type);
}

/** @param {string} pageId */
export function deleteWidgetPageStore(pageId) {
  (stores.get(pageId) ?? new WidgetStore(storageKey(pageId))).destroy();
  stores.delete(pageId);
}
