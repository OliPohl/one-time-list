// src/lib/pages/tasks/colors.js
// Colors a Tasks page can use. `wave` fills the wave and the bottom area, `accent` is used for
// headings and the task input, `task` for the current task and selecting tasks.

/** @typedef {{label: string, wave: string, accent: string, task: string}} Colors */

/** Built from the palette in global.css, so they follow light and dark mode. @type {Record<string, Colors>} */
export const COLORS = {
  crimson: { label: 'Crimson', wave: 'var(--red)', accent: 'var(--yellow)', task: 'var(--purple)' },
  cobalt: { label: 'Cobalt', wave: 'var(--blue)', accent: 'var(--orange)', task: 'var(--teal)' },
  amethyst: { label: 'Amethyst', wave: 'var(--purple)', accent: 'var(--teal)', task: 'var(--pink)' },
  emerald: { label: 'Emerald', wave: 'var(--green)', accent: 'var(--yellow)', task: 'var(--blue)' }
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
