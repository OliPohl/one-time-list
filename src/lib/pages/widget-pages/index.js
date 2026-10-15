// src/lib/pages/widget-pages/index.js
// The widgets as page types: one page type per widget, all sharing `WidgetPage.svelte`.
// A widget page's type key is the type of its widget.

import WidgetPage from './WidgetPage.svelte';
import WidgetPageOptions from './WidgetPageOptions.svelte';
import WidgetCard from './WidgetCard.svelte';
import { getWidgetPageStore, findWidgetPageStore, deleteWidgetPageStore } from './store.svelte.js';
import { WIDGET_TYPES } from '../../widgets/store.svelte.js';
import { pageColorsStyle } from '../../colors.js';
import { settings } from '../../app/settings.svelte.js';

const DESCRIPTIONS = {
  clock: 'The time, with an alarm.',
  timer: 'A countdown that rings when it ends.',
  pomodoro: 'Focus sessions with breaks in between.',
  calculator: 'A simple calculator, also with the keyboard.',
  image: 'A picture, uploaded or from a link.',
  // No page of its own, there's the Whiteboard page.
  whiteboard: 'A small whiteboard to sketch on.'
};

/**
 * @param {keyof typeof WIDGET_TYPES} widgetType
 * @returns {import('../types.js').PageType}
 */
function widgetPageType(widgetType) {
  const { label, icon } = WIDGET_TYPES[widgetType];
  return {
    type: widgetType,
    group: 'widget',
    label,
    description: DESCRIPTIONS[widgetType],
    icon,
    defaultName: label,
    component: WidgetPage,
    Options: WidgetPageOptions,
    Card: WidgetCard,
    // New widget pages start with the default colors from the settings.
    defaultOptions: () => ({ colors: settings.colors }),
    style: (page) => pageColorsStyle(page.options),
    // Load every widget page on startup so its timers and alarms run while another page is open.
    init: (page) => void getWidgetPageStore(page),
    ringingWidgets: (page) => findWidgetPageStore(page.id)?.list.filter((widget) => widget.ringing) ?? [],
    destroy: (page) => deleteWidgetPageStore(page.id)
  };
}

export const clock = widgetPageType('clock');
export const timer = widgetPageType('timer');
export const pomodoro = widgetPageType('pomodoro');
export const calculator = widgetPageType('calculator');
export const image = widgetPageType('image');
