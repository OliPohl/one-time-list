// src/lib/pages/kanban/index.js
// Kanban: columns side by side, each a small Tasks page. Same options as a Tasks page (colors, widgets).

import KanbanPage from './KanbanPage.svelte';
import KanbanCard from './KanbanCard.svelte';
import TasksOptions from '../tasks/TasksOptions.svelte';
import { getBoardStore, findBoardStore, deleteBoardStore } from './board.svelte.js';
import { colorsOf, colorsStyle } from '../../colors.js';
import { settings } from '../../app/settings.svelte.js';

/** @type {import('../types.js').PageType} */
export default {
  type: 'kanban',
  group: 'page',
  label: 'Kanban Board',
  description: 'Columns of tasks side by side, drag tasks between them.',
  icon: 'view_kanban',
  defaultName: 'Board',
  component: KanbanPage,
  Options: TasksOptions,
  Card: KanbanCard,
  // New boards start with the default colors from the settings, widgets off.
  defaultOptions: () => ({ colors: settings.colors, widgets: false }),
  style: (page) => colorsStyle(colorsOf(page.options)),
  // Load every board on startup so its timers and alarms run while another page is open.
  init: (page) => void getBoardStore(page.id, page),
  ringingWidgets: (page) => findBoardStore(page.id)?.widgets.list.filter((widget) => widget.ringing) ?? [],
  destroy: (page) => deleteBoardStore(page.id)
};
