// src/lib/widgets/context.js
// The page that shows widgets provides its store, all widget components read it from here.

import { createContext } from 'svelte';

/** @type {[() => import('./store.svelte.js').WidgetStore, (store: import('./store.svelte.js').WidgetStore) => import('./store.svelte.js').WidgetStore]} */
export const [getWidgets, setWidgets] = createContext();
