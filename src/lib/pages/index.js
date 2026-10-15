// src/lib/pages/index.js
// Registry of all page types. To add one, create its folder next to `tasks/` and list it here.
// `dashboard/` and `new-page/` are built-in views of the app, not page types.

import tasks from './tasks/index.js';
import board from './board/index.js';
import notes from './notes/index.js';
import whiteboard from './whiteboard/index.js';
import { clock, timer, pomodoro, calculator, image } from './widget-pages/index.js';

// In the order of the "Add New" list.
/** @type {Record<string, import('./types.js').PageType>} */
export const PAGE_TYPES = {
  [board.type]: board,
  [tasks.type]: tasks,
  [notes.type]: notes,
  [whiteboard.type]: whiteboard,
  [clock.type]: clock,
  [timer.type]: timer,
  [pomodoro.type]: pomodoro,
  [calculator.type]: calculator,
  [image.type]: image
};

/** Types that were renamed: old key -> current key. Saved pages are updated on load. */
export const RENAMED_TYPES = {
  'one-time-list': tasks.type,
  'task-list': tasks.type,
  kanban: board.type
};

/** The type of the page that data from before multiple pages existed is moved into. */
export const DEFAULT_PAGE_TYPE = tasks.type;
