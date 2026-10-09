// src/lib/pages/types.js
// Shapes shared by all page types. Pure JSDoc, nothing is exported at runtime.

/**
 * A page the user created. Saved by the page registry in `app/pages.svelte.js`.
 * @typedef {object} Page
 * @property {string} id
 * @property {string} type key into PAGE_TYPES
 * @property {string} name
 * @property {Record<string, any>} options set on the "New Page" screen
 * @property {number} createdAt
 */

/**
 * Everything the app needs to know about a kind of page. Each page type lives in its own folder
 * under `src/lib/pages/` and registers itself in `src/lib/pages/index.js`.
 * @typedef {object} PageType
 * @property {string} type unique key, saved with every page
 * @property {string} label shown in the "New Page" type list
 * @property {string} description one line under the label
 * @property {string} icon Material Symbols name, shown in the sidebar
 * @property {string} defaultName name given to new pages of this type
 * @property {import('svelte').Component<{page: Page}>} component the full page
 * @property {import('svelte').Component<{options: Record<string, any>, type: string, page?: Page}>} [Options] customization shown when
 *   creating a page (without `page`) and in the page settings (with `page`), edits `options` in place
 * @property {() => Record<string, any>} defaultOptions
 * @property {(page: Page) => string} [style] CSS custom properties (e.g. the colors) for the whole app while the page is shown
 * @property {(page: Page) => any[]} [ringingWidgets] the widgets of the page whose alarm or timer rings, the sidebar then blinks it
 * @property {(page: Page) => void} [init] called once for every page on startup, e.g. to start its timers
 * @property {(page: Page) => void} [destroy] called when a page is deleted, removes its saved data
 * @property {(pageId: string) => boolean} [importLegacy] moves data from before multiple pages existed into `pageId`
 */

export {};
