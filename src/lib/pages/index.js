// src/lib/pages/index.js
// Registry of all page types. To add one, create its folder next to `tasks/` and list it here.
// `dashboard/` and `new-page/` are built-in views of the app, not page types.

import tasks from './tasks/index.js';
import { clock, timer, pomodoro } from './widget-pages/index.js';

/** @type {Record<string, import('./types.js').PageType>} */
export const PAGE_TYPES = {
  [tasks.type]: tasks,
  [clock.type]: clock,
  [timer.type]: timer,
  [pomodoro.type]: pomodoro
};

/** Types that were renamed: old key -> current key. Saved pages are updated on load. */
export const RENAMED_TYPES = {
  'one-time-list': tasks.type,
  'task-list': tasks.type
};

/** The type a fresh install starts with. */
export const DEFAULT_PAGE_TYPE = tasks.type;
