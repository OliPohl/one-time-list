// src/lib/pages/tasks/colors.js
// Colors a Tasks page can use. `wave` fills the wave and the bottom area, `accent` is used for
// headings and the task input, `task` for the current task and selecting tasks.

/** @typedef {{label: string, wave: string, accent: string, task: string}} Colors */

/** @type {Record<string, Colors>} */
export const COLORS = {
  crimson: { label: 'Crimson', wave: '#f73f43', accent: '#d6e550', task: '#7356f4' },
  cobalt: { label: 'Cobalt', wave: '#2d6cf6', accent: '#ff8a65', task: '#3fd0c9' },
  amethyst: { label: 'Amethyst', wave: '#8e4bf0', accent: '#6ef0b8', task: '#ff6fae' },
  emerald: { label: 'Emerald', wave: '#17b26a', accent: '#ffcf4d', task: '#4cc3ff' }
};

export const DEFAULT_COLORS = 'crimson';

/**
 * Key of the colors chosen in a page's options.
 * @param {Record<string, any>} options
 */
export function colorsKey(options) {
  // Pages saved before the option was renamed still have `colorScheme`.
  const key = options.colors ?? options.colorScheme;
  return key in COLORS ? key : DEFAULT_COLORS;
}

/** @param {Record<string, any>} options */
export function colorsOf(options) {
  return COLORS[colorsKey(options)];
}

/** CSS custom properties for the colors, set on the page root. @param {Colors} colors */
export function colorsStyle(colors) {
  return `--wave: ${colors.wave}; --accent: ${colors.accent}; --task: ${colors.task};`;
}
