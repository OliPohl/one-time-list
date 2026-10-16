// src/lib/pages/board/index.js
// A board, shown as "Spread": columns side by side, each a stack of pages (Tasks lists, notes and whiteboards, local or linked). Its
// options are the colors and widgets, which each page can also set for itself.

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
  label: 'Spread',
  description: 'Tasks, notes and whiteboards side by side.',
  icon: 'menu_book',
  defaultName: 'Spread',
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
