// src/lib/pages/whiteboard/postIts.js
// Post-it notes on a whiteboard: square Excalidraw rectangles filled with one of the app's colors (palette.js),
// with text in them. Excalidraw grows a rectangle's height to fit the text written in it, so the notes do too.
// A note is marked (`customData.postIt`), so the text written in it is dark (see `convertColors`). Otherwise it's
// an ordinary rectangle, its color is changed with the background colors.

import { APP_COLORS } from './palette.js';

/** The colors a new note can have: the app's colors, without "Bright". */
export const POST_IT_COLORS = APP_COLORS.filter((color) => color.name !== 'Bright');

/** A new note's width and height, in the whiteboard's units. */
const SIZE = 200;

/**
 * A new note centered on a point.
 * @param {{x: number, y: number}} center
 * @param {string} color as stored, see `stored`
 */
export function postItSkeleton(center, color) {
  return {
    type: /** @type {const} */ ('rectangle'),
    x: center.x - SIZE / 2,
    y: center.y - SIZE / 2,
    width: SIZE,
    height: SIZE,
    backgroundColor: color,
    strokeColor: 'transparent',
    fillStyle: /** @type {const} */ ('solid'),
    strokeWidth: 1,
    roughness: 0,
    roundness: null,
    customData: { postIt: true }
  };
}
