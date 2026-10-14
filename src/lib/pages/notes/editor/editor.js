// src/lib/pages/notes/editor/editor.js
// The Notes editor: CodeMirror with Markdown, the live preview (livePreview.js) and the keys of the old editor
// (lists continue on Enter, Tab nests them, brackets go around a selection, Ctrl+B / I / K).
// The formatting itself is in format.js, as plain text changes, applied here as typing so Ctrl+Z undoes it.

import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, placeholder, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, insertNewlineAndIndent } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { tags } from '@lezer/highlight';
import { livePreview } from './livePreview.js';
import { toggleWrap, insertLink, SURROUND, surround, continueList, nestListItem } from '../format.js';

/** @typedef {(state: import('../format.js').TextState) => import('../format.js').TextEdit | null} Change */

/**
 * Applies a change from format.js to the editor's text and selection, as one undo step.
 * @param {EditorView} view
 * @param {Change} change
 * @returns {boolean} false if the change didn't apply (returned null)
 */
export function applyChange(view, change) {
  const { main } = view.state.selection;
  const edit = change({ value: view.state.doc.toString(), start: main.from, end: main.to });
  if (!edit) return false;
  view.dispatch({
    changes: { from: edit.from, to: edit.to, insert: edit.insert },
    selection: { anchor: edit.selectStart, head: edit.selectEnd },
    userEvent: 'input',
    scrollIntoView: true
  });
  return true;
}

/** @param {Change} change @returns {import('@codemirror/view').Command} */
const command = (change) => (view) => applyChange(view, change);

const keys = [
  // In a list item: nest it (Shift+Tab: back out). Anywhere else 4 spaces.
  {
    key: 'Tab',
    run: command((state) => nestListItem(state, false) ?? { from: state.start, to: state.end, insert: '    ', selectStart: state.start + 4, selectEnd: state.start + 4 })
  },
  { key: 'Shift-Tab', run: command((state) => nestListItem(state, true)) },
  // In a list the next line starts the next item (Shift+Enter for a plain new line).
  { key: 'Enter', run: (/** @type {EditorView} */ view) => applyChange(view, continueList) || insertNewlineAndIndent(view) },
  { key: 'Shift-Enter', run: command((state) => ({ from: state.start, to: state.end, insert: '\n', selectStart: state.start + 1, selectEnd: state.start + 1 })) },
  { key: 'Mod-b', run: command((state) => toggleWrap(state, '**')) },
  { key: 'Mod-i', run: command((state) => toggleWrap(state, '*')) },
  { key: 'Mod-k', run: command(insertLink) },
  { key: 'Escape', run: (/** @type {EditorView} */ view) => (view.contentDOM.blur(), true) }
];

// A bracket or quote typed with text selected goes around it, like in a code editor.
const surroundSelection = EditorView.inputHandler.of((view, from, to, text) => {
  if (from === to || !(text in SURROUND)) return false;
  return applyChange(view, (state) => surround(state, /** @type {keyof typeof SURROUND} */ (text)));
});

/** Colors of code in ``` blocks and of the Markdown text styles. From the palette, they follow light and dark mode. */
const highlight = HighlightStyle.define([
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.processingInstruction, opacity: '0.45', fontWeight: '400', fontStyle: 'normal' },
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword], color: 'var(--purple)' },
  { tag: [tags.string, tags.regexp, tags.special(tags.string)], color: 'var(--green)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--orange)' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.function(tags.variableName))], color: 'var(--blue)' },
  { tag: [tags.typeName, tags.className, tags.namespace, tags.standard(tags.variableName)], color: 'var(--teal)' },
  { tag: [tags.propertyName, tags.attributeName], color: 'var(--red)' },
  { tag: [tags.tagName, tags.meta], color: 'var(--pink)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--text-muted)', fontStyle: 'italic' }
]);

/** Looks like the formatted note always did: the note's font, headings, lists, quotes and code boxes. */
const theme = EditorView.theme({
  // Fills the note down to the status bar, so pressing anywhere below the text places the caret or starts a
  // selection there (at the end), like in a text editor.
  '&': {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--text)',
    backgroundColor: 'transparent',
    fontFamily: '"Roboto Slab", serif',
    fontSize: '17px'
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { flex: '1 0 auto', alignItems: 'stretch !important', fontFamily: 'inherit', lineHeight: '1.4', overflow: 'visible' },
  // Room below the text, so there's always somewhere to click to keep writing (see `space` of createEditor).
  '.cm-content': { padding: '0 0 var(--editor-space, 33vh)', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)', borderLeftWidth: '1.5px' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--accent), transparent 70%) !important'
  },
  // Above the text, the code boxes' background would hide it otherwise. See-through, the text stays readable.
  '.cm-selectionLayer': { zIndex: '1 !important', pointerEvents: 'none' },
  '.cm-placeholder': { color: 'var(--text-muted)' },

  // Headings: the page title is the main heading in the accent color, so they start with task and wave.
  '.cm-heading': { fontFamily: '"Stoke", serif', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.2' },
  '.cm-heading:not(:first-child)': { paddingTop: '0.5em' },
  '.cm-h1': { fontSize: '1.6em', color: 'var(--task)' },
  '.cm-h2': { fontSize: '1.4em', color: 'var(--wave)' },
  '.cm-h3': { fontSize: '1.25em', color: 'var(--accent)' },
  '.cm-h4': { fontSize: '1.12em', color: 'var(--task)' },
  '.cm-h5': { fontSize: '1.05em', color: 'var(--wave)' },
  '.cm-h6': { fontSize: '1em', color: 'var(--accent)' },

  '.cm-sign': { opacity: '0.45', fontWeight: '400', fontStyle: 'normal' },
  '.cm-link, .cm-link *': { color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '0.15em', cursor: 'text' },
  '.cm-inline-code': {
    padding: '0.1em 0.2em',
    borderRadius: '6px',
    backgroundColor: 'var(--surface-raised)',
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    fontSize: '0.88em'
  },

  // Images from the web, on a line of their own, as wide as the note at most.
  '.cm-image': { display: 'block', padding: '4px 0' },
  '.cm-image img': { display: 'block', maxWidth: '100%', maxHeight: '480px', borderRadius: '12px', cursor: 'text' },
  '.cm-image-broken': { color: 'var(--text-muted)', fontStyle: 'italic' },

  '.cm-bullet': { display: 'inline-block', minWidth: '0.39em', textAlign: 'center' },
  '.cm-task-box': {
    boxSizing: 'border-box',
    width: '0.8em',
    height: '0.8em',
    margin: '0 0.2em 0 0',
    verticalAlign: '-0.12em',
    accentColor: 'var(--accent)',
    cursor: 'pointer'
  },

  '.cm-quote': { borderLeft: '3px solid var(--task)', paddingLeft: '1em !important', color: 'var(--text-soft)' },

  '.cm-rule-line': { display: 'flex', alignItems: 'center' },
  '.cm-rule': { display: 'inline-block', width: '100%', borderTop: '1.5px solid var(--line)', verticalAlign: 'middle' },

  // ``` blocks: one box over all their lines, the fences are its top and bottom edge.
  '.cm-code-line': {
    padding: '0 12px !important',
    backgroundColor: 'var(--surface-raised)',
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    fontSize: '0.88em'
  },
  '.cm-code-first': { borderTopLeftRadius: '10px', borderTopRightRadius: '10px', paddingTop: '4px !important' },
  '.cm-code-last': { borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', paddingBottom: '4px !important' }
});

/** Shown in an empty editor, unless `createEditor` gets its own. */
const PLACEHOLDER = 'Start writing. Markdown works: # Heading, **bold**, - [ ] task';

/**
 * Creates the editor in `parent`. The room below the text is the CSS variable `--editor-space` (default: a third
 * of the window), set it on `parent` for a smaller editor.
 * @param {{
 *   parent: HTMLElement,
 *   text: string,
 *   signs?: boolean,
 *   placeholder?: string,
 *   onChange: (text: string) => void,
 *   onCaret?: (view: EditorView) => void
 * }} options
 */
export function createEditor({ parent, text, signs = false, placeholder: placeholderText = PLACEHOLDER, onChange, onCaret }) {
  const preview = new Compartment();

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      extensions: [
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        EditorState.tabSize.of(4),
        indentUnit.of('    '),
        // Before the default keys, so Enter and Tab do the list things first.
        keymap.of(keys),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        surroundSelection,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(highlight),
        theme,
        placeholder(placeholderText),
        EditorView.contentAttributes.of({ spellcheck: 'true', 'aria-label': 'Note' }),
        preview.of(livePreview({ signs })),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
          if (update.docChanged || update.selectionSet || update.focusChanged) onCaret?.(update.view);
        })
      ]
    })
  });

  return {
    view,
    /** @param {boolean} value */
    setSigns(value) {
      view.dispatch({ effects: preview.reconfigure(livePreview({ signs: value })) });
    },
    /** Replaces the whole text, for changes made elsewhere (the dashboard card). @param {string} value */
    setText(value) {
      if (value === view.state.doc.toString()) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    },
    destroy() {
      view.destroy();
    }
  };
}
