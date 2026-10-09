// src/lib/pages/tasks/index.js

import TasksPage from './TasksPage.svelte';
import TasksOptions from './TasksOptions.svelte';
import { getListStore, deleteListStore, importLegacyList } from './list.svelte.js';
import { DEFAULT_COLORS, colorsOf, colorsStyle } from './colors.js';

export { getListStore };

/** @type {import('../types.js').PageType} */
export default {
  type: 'tasks',
  label: 'Tasks',
  description: 'Tasks you do once, one at a time.',
  icon: 'checklist',
  defaultName: 'Tasks',
  component: TasksPage,
  Options: TasksOptions,
  defaultOptions: () => ({ colors: DEFAULT_COLORS }),
  style: (page) => colorsStyle(colorsOf(page.options)),
  // Load every list on startup so its timers and alarms run while another page is open.
  init: (page) => void getListStore(page.id),
  destroy: (page) => deleteListStore(page.id),
  importLegacy: importLegacyList
};
