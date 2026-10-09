// src/lib/pages/widget-pages/index.js
// The widgets as page types: one page type per widget, all sharing `WidgetPage.svelte`.
// A widget page's type key is the type of its widget.

import WidgetPage from './WidgetPage.svelte';
import WidgetPageOptions from './WidgetPageOptions.svelte';
import { getWidgetPageStore, findWidgetPageStore, deleteWidgetPageStore } from './store.svelte.js';
import { WIDGET_TYPES } from '../../widgets/store.svelte.js';

const DESCRIPTIONS = {
  clock: 'The time, with an alarm.',
  timer: 'A countdown that rings when it ends.',
  pomodoro: 'Focus sessions with breaks in between.'
};

/**
 * @param {keyof typeof WIDGET_TYPES} widgetType
 * @returns {import('../types.js').PageType}
 */
function widgetPageType(widgetType) {
  const { label, icon } = WIDGET_TYPES[widgetType];
  return {
    type: widgetType,
    label,
    description: DESCRIPTIONS[widgetType],
    icon,
    defaultName: label,
    component: WidgetPage,
    Options: WidgetPageOptions,
    defaultOptions: () => ({}),
    // Load every widget page on startup so its timers and alarms run while another page is open.
    init: (page) => void getWidgetPageStore(page),
    isRinging: (page) => Boolean(findWidgetPageStore(page.id)?.list.some((widget) => widget.ringing)),
    destroy: (page) => deleteWidgetPageStore(page.id)
  };
}

export const clock = widgetPageType('clock');
export const timer = widgetPageType('timer');
export const pomodoro = widgetPageType('pomodoro');
