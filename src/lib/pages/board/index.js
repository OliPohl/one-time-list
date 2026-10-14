// src/lib/pages/board/index.js
// Board: columns side by side, each a stack of pages (Tasks lists and notes, local or linked). Its options are the
// colors and widgets, which each page can also set for itself.

import BoardPage from './BoardPage.svelte';
import BoardCard from './BoardCard.svelte';
import BoardOptions from './BoardOptions.svelte';
import { getBoardStore, findBoardStore, deleteBoardStore } from './board.svelte.js';
import { colorsOf, colorsStyle } from '../../colors.js';
import { settings } from '../../app/settings.svelte.js';

/** @type {import('../types.js').PageType} */
export default {
  type: 'board',
  group: 'page',
  label: 'Board',
  description: 'Tasks and notes side by side, new or linked from your pages.',
  icon: 'view_kanban',
  defaultName: 'Board',
  component: BoardPage,
  Options: BoardOptions,
  Card: BoardCard,
  // New boards start with the default colors from the settings, widgets off.
  defaultOptions: () => ({ colors: settings.colors, widgets: false }),
  style: (page) => colorsStyle(colorsOf(page.options)),
  // Load every board on startup so its timers and alarms run while another page is open.
  init: (page) => void getBoardStore(page.id, page),
  ringingWidgets: (page) => findBoardStore(page.id)?.ringingWidgets() ?? [],
  destroy: (page) => deleteBoardStore(page.id)
};
