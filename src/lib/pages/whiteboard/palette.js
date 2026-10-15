// src/lib/pages/whiteboard/palette.js
// The app's colors for everything drawn on a whiteboard (Excalidraw's own colors are replaced, see
// WhiteboardPage). Each color looks like the app's in both themes: Excalidraw draws its canvas through a filter in
// dark mode (THEME_FILTER below), so a color is stored as one value in light mode and another in dark mode, the
// one the filter turns into the app's dark mode color. The drawing is switched between them with the theme
// (`convertColors`). Colors that aren't the app's (drawn before, or pasted) are left alone.

/**
 * The colors in the order of the color pickers, as in global.css (keep in sync): light and dark mode. "Bright" is
 * the text color: Excalidraw's own black in light mode (what was drawn before keeps it), white in dark mode.
 * @type {{name: string, light: string, dark: string}[]}
 */
export const APP_COLORS = [
  { name: 'Bright', light: '#1e1e1e', dark: '#ffffff' },
  { name: 'Red', light: '#e0353a', dark: '#f73f43' },
  { name: 'Orange', light: '#db7f12', dark: '#f7a23f' },
  { name: 'Yellow', light: '#8f9c0c', dark: '#d6e550' },
  { name: 'Green', light: '#1d9e55', dark: '#29c76a' },
  { name: 'Teal', light: '#12a19a', dark: '#3fd0c9' },
  { name: 'Blue', light: '#2459d8', dark: '#2d6cf6' },
  { name: 'Purple', light: '#7356f4', dark: '#7356f4' },
  { name: 'Pink', light: '#df4f8f', dark: '#ff6fae' }
];

/** Text on post-it notes: dark in both themes. Not in the pickers. */
export const INK = { name: 'Ink', light: '#1b1b1b', dark: '#1b1b1b' };

/** @typedef {'light' | 'dark'} Theme */
/** @typedef {{name: string, light: string, dark: string}} AppColor */

/** Excalidraw's dark mode filter is `invert(93%) hue-rotate(180deg)`. */
const INVERT = 0.93;
/** `hue-rotate(180deg)` as the matrix CSS uses for it. */
const HUE_ROTATE = [
  [-0.574, 1.43, 0.144],
  [0.426, 0.43, 0.144],
  [0.426, 1.43, -0.856]
];

/** @param {number} value */
const clamp = (value) => Math.min(1, Math.max(0, value));

/** @param {string} hex */
const fromHex = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);

/** @param {number[]} rgb 0 to 1 */
const toHex = (rgb) => `#${rgb.map((channel) => Math.round(clamp(channel) * 255).toString(16).padStart(2, '0')).join('')}`;

/** How Excalidraw shows `rgb` in dark mode. @param {number[]} rgb 0 to 1 */
function throughFilter(rgb) {
  const inverted = rgb.map((channel) => INVERT + channel * (1 - 2 * INVERT));
  return HUE_ROTATE.map((row) => clamp(row[0] * inverted[0] + row[1] * inverted[1] + row[2] * inverted[2]));
}

/** OKLab, to compare colors as they look. @param {number[]} rgb 0 to 1 */
function oklab(rgb) {
  const [r, g, b] = rgb.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/**
 * How far apart two colors look. A different hue counts much more than a paler one: the filter can't show
 * bright colors (a bright yellow), they come out paler rather than in another hue.
 * @param {number[]} a OKLab
 * @param {number[]} b OKLab
 */
function distance(a, b) {
  const chromaA = Math.hypot(a[1], a[2]);
  const chromaB = Math.hypot(b[1], b[2]);
  const hue = Math.max(0, (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 - (chromaA - chromaB) ** 2);
  return (a[0] - b[0]) ** 2 + (chromaA - chromaB) ** 2 + 8 * hue;
}

/** Starting points of the search below, spread over all colors so it doesn't get stuck on a worse one. */
const SEEDS = [0.1, 0.5, 0.9].flatMap((r) => [0.1, 0.5, 0.9].flatMap((g) => [0.1, 0.5, 0.9].map((b) => [r, g, b])));

/**
 * The color the filter turns into the closest it can show to `hex`, found by searching (the filter clips, it
 * can't simply be undone).
 * @param {string} hex
 */
function underFilter(hex) {
  const target = oklab(fromHex(hex));
  /** @param {number[]} color */
  const error = (color) => distance(oklab(throughFilter(color)), target);
  let best = SEEDS[0];
  let bestError = Infinity;
  for (const seed of SEEDS) {
    let color = seed;
    let colorError = error(color);
    // Steps each channel up or down while that gets closer, in ever smaller steps.
    for (let step = 0.25; step > 1e-3; ) {
      let improved = false;
      for (let channel = 0; channel < 3; channel++) {
        for (const delta of [step, -step]) {
          const next = color.map((value, index) => (index === channel ? clamp(value + delta) : value));
          const nextError = error(next);
          if (nextError < colorError) [color, colorError, improved] = [next, nextError, true];
        }
      }
      if (!improved) step /= 2;
    }
    if (colorError < bestError) [best, bestError] = [color, colorError];
  }
  return toHex(best);
}

/** Worked out once, the search takes a moment. @type {Map<AppColor, string>} */
const darkValues = new Map();

/**
 * The value Excalidraw stores for an app color in a theme.
 * @param {AppColor} color
 * @param {Theme} theme
 */
export function stored(color, theme) {
  if (theme === 'light') return color.light;
  let value = darkValues.get(color);
  if (!value) darkValues.set(color, (value = underFilter(color.dark)));
  return value;
}

/** For each theme, the other theme's values of every color to this theme's. @type {Partial<Record<Theme, Map<string, string>>>} */
const conversions = {};

/** @param {Theme} theme */
function conversion(theme) {
  const other = theme === 'light' ? 'dark' : 'light';
  return (conversions[theme] ??= new Map([...APP_COLORS, INK].map((color) => [stored(color, other), stored(color, theme)])));
}

/**
 * The elements with the app's colors in the theme's values, and the text in new post-it notes in ink (marked
 * `customData.inked`, so it keeps a color given to it later). Null when nothing changes.
 * @param {readonly any[]} elements
 * @param {Theme} theme
 * @param {(element: any, updates: Record<string, any>) => any} newElementWith Excalidraw's, keeps versions right
 */
export function convertColors(elements, theme, newElementWith) {
  const map = conversion(theme);
  const notes = new Set(elements.filter((element) => element.customData?.postIt && !element.isDeleted).map((element) => element.id));
  let changed = false;
  const next = elements.map((element) => {
    if (element.isDeleted) return element;
    /** @type {Record<string, any>} */
    const updates = {};
    for (const key of ['strokeColor', 'backgroundColor']) {
      const value = map.get(element[key]);
      if (value) updates[key] = value;
    }
    if (element.type === 'text' && notes.has(element.containerId) && !element.customData?.inked) {
      updates.strokeColor = stored(INK, theme);
      updates.customData = { ...element.customData, inked: true };
    }
    if (Object.keys(updates).length === 0) return element;
    changed = true;
    return newElementWith(element, updates);
  });
  return changed ? next : null;
}

/**
 * Excalidraw's settings for new elements with the app's colors in the theme's values, or null when they are.
 * @param {{currentItemStrokeColor: string, currentItemBackgroundColor: string}} appState
 * @param {Theme} theme
 */
export function convertCurrentColors(appState, theme) {
  const map = conversion(theme);
  const stroke = map.get(appState.currentItemStrokeColor);
  const background = map.get(appState.currentItemBackgroundColor);
  if (!stroke && !background) return null;
  return {
    currentItemStrokeColor: stroke ?? appState.currentItemStrokeColor,
    currentItemBackgroundColor: background ?? appState.currentItemBackgroundColor
  };
}
