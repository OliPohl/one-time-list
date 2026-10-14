// src/lib/pages/whiteboard/index.js
// Whiteboard: an Excalidraw whiteboard over the whole window, to draw and sketch on. In the page's colors.

import WhiteboardPage from './WhiteboardPage.svelte';
import WhiteboardCard from './WhiteboardCard.svelte';
import ColorOptions from '../ColorOptions.svelte';
import { deleteDrawing } from './store.js';
import { colorsOf, colorsStyle } from '../../colors.js';
import { settings } from '../../app/settings.svelte.js';

/** @type {import('../types.js').PageType} */
export default {
  type: 'whiteboard',
  group: 'page',
  label: 'Whiteboard',
  description: 'A whiteboard to draw and sketch on, made with Excalidraw.',
  icon: 'draw',
  defaultName: 'Whiteboard',
  component: WhiteboardPage,
  Options: ColorOptions,
  Card: WhiteboardCard,
  // New whiteboards start with the default colors from the settings.
  defaultOptions: () => ({ colors: settings.colors }),
  style: (page) => colorsStyle(colorsOf(page.options)),
  destroy: (page) => deleteDrawing(page.id)
};
