// src/lib/pages/notes/index.js
// Notes: one Markdown text per page, written in an editor and shown formatted.

import NotesPage from './NotesPage.svelte';
import NotesCard from './NotesCard.svelte';
import NotesOptions from './NotesOptions.svelte';
import { deleteNote } from './store.svelte.js';
import { pageColorsStyle } from '../../colors.js';
import { settings } from '../../app/settings.svelte.js';

/** @type {import('../types.js').PageType} */
export default {
  type: 'notes',
  group: 'page',
  label: 'Notes',
  description: 'Notes written in Markdown.',
  icon: 'notes',
  defaultName: 'Notes',
  component: NotesPage,
  Options: NotesOptions,
  Card: NotesCard,
  // New notes start with the default colors from the settings.
  defaultOptions: () => ({ colors: settings.colors }),
  style: (page) => pageColorsStyle(page.options),
  destroy: (page) => deleteNote(page.id)
};
