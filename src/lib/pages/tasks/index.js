// src/lib/pages/tasks/index.js

import TasksPage from './TasksPage.svelte';
import TasksOptions from './TasksOptions.svelte';
import TasksCard from './TasksCard.svelte';
import { getListStore, findListStore, deleteListStore, importLegacyList, removeLegacyList } from './list.svelte.js';
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
  Card: TasksCard,
  // New lists start with the default colors from the settings.
  defaultOptions: () => ({ colors: settings.colors, widgets: true }),
  style: (page) => colorsStyle(colorsOf(page.options)),
  // Load every list on startup so its timers and alarms run while another page is open.
  init: (page) => {
    getListStore(page.id, page);
    removeLegacyList();
  },
  ringingWidgets: (page) => findListStore(page.id)?.widgets.list.filter((widget) => widget.ringing) ?? [],
  destroy: (page) => deleteListStore(page.id),
  importLegacy: importLegacyList
};
