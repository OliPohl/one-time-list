// src/lib/pages/tasks/index.js

import TasksPage from './TasksPage.svelte';
import TasksOptions from './TasksOptions.svelte';
import { getListStore, findListStore, deleteListStore, importLegacyList } from './list.svelte.js';
import { colorsOf, colorsStyle } from '../../colors.js';
import { settings } from '../../app/settings.svelte.js';

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
  // New lists start with the default colors from the settings.
  defaultOptions: () => ({ colors: settings.colors }),
  style: (page) => colorsStyle(colorsOf(page.options)),
  // Load every list on startup so its timers and alarms run while another page is open.
  init: (page) => void getListStore(page.id),
  isRinging: (page) => Boolean(findListStore(page.id)?.widgets.list.some((widget) => widget.ringing)),
  destroy: (page) => deleteListStore(page.id),
  importLegacy: importLegacyList
};
