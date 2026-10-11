<!-- src/lib/pages/notes/NotesPage.svelte -->
<!-- A Notes page, edited like Obsidian's live preview: the note is shown formatted, the block that's clicked turns
     back into its Markdown to edit it, with the caret where it was clicked. Dragging only selects text (also across
     blocks), it never opens the editor. Arrow keys move between blocks, clicking below the note adds a new one.
     A toolbar on top formats the text being edited (headings, bold, lists, ...), its button on the right shows or
     hides the Markdown signs (##, **, ...), the formatting stays.
     A status bar at the bottom shows the caret's line and column and counts words and characters, like Notepad. -->
<script>
  import { onMount, tick } from 'svelte';
  import PageHeader from '$lib/app/PageHeader.svelte';
  import Markdown from './Markdown.svelte';
  import { getNote } from './store.svelte.js';
  import { toggleTask, splitBlocks, countBreaks, parseCodeBlock, highlightCodeDraft, highlightCodeSource, hasListItems, mirrorList } from './markdown.js';
  import { toggleWrap, toggleCode, insertLink, toggleLines, insertRule, lineKind, SURROUND, surround, continueList, nestListItem } from './format.js';
  import './code-theme.css';

  /** @typedef {import('./markdown.js').Block} Block */

  /** Height of a line of the note (17px text, 1.4 line height), for the empty lines between blocks. */
  const LINE = 17 * 1.4;

  /**
   * Empty lines before a block, beyond the usual blank line between blocks. They're shown as lines that can be
   * clicked, like in a text editor.
   * @param {number} gap line breaks before the block
   * @param {boolean} first the first block of the note, where every line break is an empty line
   */
  const emptyLines = (gap, first) => Math.max(0, first ? gap : gap - 2);

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // Shown for one page only, so the note never changes.
  // svelte-ignore state_referenced_locally
  const note = getNote(page.id);

  /**
   * The block being edited: the note is `prefix + draft + suffix`, `draft` is in the editor. `length` is the
   * draft's length when editing started, the blocks after it keep their keys (and their elements) while it changes.
   * A ``` code block is edited whole, fences included (```js, to change the language), in the code box.
   * `restore` is the note before a new block was started at its end: left empty, the note goes back to it.
   * @type {{prefix: string, draft: string, suffix: string, length: number, restore?: string} | null}
   */
  let edit = $state(note.text.trim() ? null : { prefix: '', draft: note.text, suffix: '', length: note.text.length });
  /** @type {HTMLTextAreaElement | undefined} */
  let editor = $state();
  /**
   * Where the note was pressed, until it's let go: a block (its key and element), the space below the note, or
   * neither (its padding).
   * `empty` is an empty line between blocks: where the block after it starts and which line it is.
   * @type {{x: number, y: number, key: string | null, element: HTMLElement | null, below: boolean, empty: {anchor: number, line: number} | null} | null}
   */
  let press = null;
  /** Moving less than this between pressing and letting go is a click, more is selecting text. */
  const CLICK_DISTANCE = 5;
  /** Space at the top and bottom of the window where selecting scrolls the page. */
  const SCROLL_EDGE = 40;
  /** @type {HTMLElement} */
  let noteElement;
  /** @type {HTMLElement} */
  let statusBar;
  /** @type {HTMLElement} */
  let toolbar;
  /** The mouse while it's selecting text, also outside the note or the window. @type {{x: number, y: number} | null} */
  let selectPointer = null;
  /** A second click this soon after a click opened the editor is a double click on the formatted text. */
  const DOUBLE_CLICK_MS = 500;
  /** When and where in the source the last click opened the editor. @type {{time: number, position: number} | null} */
  let lastOpen = null;

  /** Where the caret is in the whole note, for the status bar. Kept after the editor closes. */
  let caret = $state({ line: 1, column: 1 });
  /** What the caret's line is (heading, list, ...), its toolbar button shows as on. @type {import('./format.js').LineKind | null} */
  let currentKind = $state(null);

  /**
   * The toolbar, left to right. `null` is a divider. Shortcuts work while editing.
   * @type {Array<{icon: string, title: string, run: () => void, kind?: import('./format.js').LineKind} | null>}
   */
  const TOOLS = [
    { icon: 'format_h1', title: 'Heading 1', kind: 'h1', run: () => format((state) => toggleLines(state, 'h1')) },
    { icon: 'format_h2', title: 'Heading 2', kind: 'h2', run: () => format((state) => toggleLines(state, 'h2')) },
    { icon: 'format_h3', title: 'Heading 3', kind: 'h3', run: () => format((state) => toggleLines(state, 'h3')) },
    null,
    { icon: 'format_bold', title: 'Bold (Ctrl+B)', run: () => format((state) => toggleWrap(state, '**')) },
    { icon: 'format_italic', title: 'Italic (Ctrl+I)', run: () => format((state) => toggleWrap(state, '*')) },
    { icon: 'format_strikethrough', title: 'Strikethrough', run: () => format((state) => toggleWrap(state, '~~')) },
    { icon: 'code', title: 'Code (block for several lines)', run: () => format(toggleCode) },
    { icon: 'link', title: 'Link (Ctrl+K)', run: () => format(insertLink) },
    null,
    { icon: 'format_list_bulleted', title: 'Bulleted List', kind: 'bullet', run: () => format((state) => toggleLines(state, 'bullet')) },
    { icon: 'format_list_numbered', title: 'Numbered List', kind: 'number', run: () => format((state) => toggleLines(state, 'number')) },
    { icon: 'checklist', title: 'Checklist', kind: 'task', run: () => format((state) => toggleLines(state, 'task')) },
    { icon: 'format_quote', title: 'Quote', kind: 'quote', run: () => format((state) => toggleLines(state, 'quote')) },
    { icon: 'horizontal_rule', title: 'Divider', run: () => format(insertRule) }
  ];

  /**
   * Formats the text being edited, applied as typing so Ctrl+Z undoes it like any other change. Text selected in
   * the formatted note is formatted where it is, then edited. Without either a new block at the end is started.
   * @param {(state: import('./format.js').TextState) => import('./format.js').TextEdit} change
   */
  async function format(change) {
    if (!editor || document.activeElement !== editor) {
      if (formatSelection(change)) return;
      if (!edit) await addBlock();
      if (!editor) return;
      editor.focus();
    }
    const field = editor;
    const { from, to, insert, selectStart, selectEnd } = change({ value: field.value, start: field.selectionStart, end: field.selectionEnd });
    field.setSelectionRange(from, to);
    const typed = insert ? document.execCommand('insertText', false, insert) : from === to || document.execCommand('delete');
    // Browsers without the command: change the text directly (that can't be undone with Ctrl+Z).
    if (!typed && edit) {
      field.setRangeText(insert, from, to);
      edit.draft = field.value;
    }
    field.setSelectionRange(selectStart, selectEnd);
    updateCaret();
  }

  /**
   * Formats text selected in the formatted note, in the note's Markdown, then opens the editor on the result with
   * the formatted text selected.
   * @param {(state: import('./format.js').TextState) => import('./format.js').TextEdit} change
   * @returns {boolean} whether there was such a selection
   */
  function formatSelection(change) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !noteElement) return false;
    const range = selection.getRangeAt(0);
    if (!noteElement.contains(range.commonAncestorContainer)) return false;
    const span = selectedSource(range);
    if (!span) return false;

    selection.removeAllRanges();
    const moved = finish();
    const text = note.text;
    const { from, to, insert, selectStart, selectEnd } = change({ value: text, start: moved(span.start), end: moved(span.end) });
    note.text = text.slice(0, from) + insert + text.slice(to);
    const block = splitBlocks(note.text).find((item) => item.start <= selectStart && selectEnd <= item.start + item.raw.length);
    if (block) editBlock(block, { start: selectStart - block.start, end: selectEnd - block.start });
    return true;
  }

  /** Empty lines at the end of the note, after its last block (each line break one). */
  let trailingLines = $derived.by(() => {
    const last = segments.at(-1);
    return last ? countBreaks(note.text.slice(last.start + last.raw.length)) : 0;
  });

  /** Words of the text, without Markdown signs, task boxes and link addresses. */
  let words = $derived(note.text.replace(/\]\([^)]*\)/g, ']').replace(/\[[ xX]\]/g, '').match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0);
  let characters = $derived(note.text.length);

  /** Follows the caret in the editor, as it moves or text is typed. */
  function updateCaret() {
    if (!edit || !editor || document.activeElement !== editor) return;
    const position = edit.prefix.length + (editor.selectionDirection === 'backward' ? editor.selectionStart : editor.selectionEnd);
    const before = note.text.slice(0, position);
    caret = { line: before.split('\n').length, column: position - before.lastIndexOf('\n') };
    const lineStart = editor.value.lastIndexOf('\n', editor.selectionStart - 1) + 1;
    const lineEnd = editor.value.indexOf('\n', editor.selectionStart);
    currentKind = lineKind(editor.value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd));
  }

  /** The Markdown signs are shown. Saved with the page. */
  let signs = $derived(page.options.signs === true);

  /**
   * Everything shown in order, the editor among the blocks. One list with keys from the blocks' positions, so the
   * elements of the other blocks stay when the editor opens or closes (a text selection in them stays too).
   * @type {Array<Block & {key: string, editor?: boolean}>}
   */
  let segments = $derived.by(() => {
    /** @param {Block} block @param {number} [shift] @param {number} [keyShift] */
    const segment = (block, shift = 0, keyShift = shift) => ({ ...block, start: block.start + shift, key: String(block.start + keyShift) });
    if (!edit) return splitBlocks(note.text).map((block) => segment(block));
    const { prefix, draft, suffix, length } = edit;
    const beforeEditor = splitBlocks(prefix);
    const last = beforeEditor.at(-1);
    return [
      ...beforeEditor.map((block) => segment(block)),
      {
        start: prefix.length,
        raw: draft,
        key: 'editor',
        editor: true,
        gap: countBreaks(prefix.slice(last ? last.start + last.raw.length : 0))
      },
      ...splitBlocks(suffix).map((block) => segment(block, prefix.length + draft.length, prefix.length + length))
    ];
  });
  let editorIndex = $derived(segments.findIndex((segment) => segment.editor));
  let before = $derived(editorIndex === -1 ? [] : segments.slice(0, editorIndex));
  let after = $derived(editorIndex === -1 ? [] : segments.slice(editorIndex + 1));
  /** The editor shows a heading in its size and color. */
  let headingLevel = $derived(edit && !edit.draft.includes('\n') ? (/^(#{1,6})\s+\S/.exec(edit.draft)?.[1].length ?? 0) : 0);
  /**
   * The colored code behind the code editor, while a ``` code block is edited: its fences faint, its code colored in
   * the language the first fence names. A block whose closing fence is being typed still counts.
   */
  let codeLayer = $derived.by(() => {
    if (!edit || !/^ {0,3}(```|~~~)/.test(edit.draft)) return null;
    const block = parseCodeBlock(edit.draft);
    return block ? highlightCodeSource(block) : highlightCodeDraft(edit.draft);
  });
  /** @type {HTMLElement | undefined} */
  let codeLayerElement = $state();
  /** Lists being typed show their bullets and boxes, drawn under the editor's see-through text. */
  let listLayer = $derived(edit && codeLayer === null && headingLevel === 0 && hasListItems(edit.draft) ? mirrorList(edit.draft) : null);

  // Every change is written to the note right away.
  $effect(() => {
    if (edit) note.text = edit.prefix + edit.draft + edit.suffix;
  });

  // The editor grows with its text, the page scrolls instead.
  $effect(() => {
    void edit?.draft;
    void headingLevel;
    if (!editor) return;
    // The code editor lies over its colored code, which sets the height.
    if (codeLayer !== null) {
      editor.style.height = '';
      return;
    }
    editor.style.height = 'auto';
    editor.style.height = `${editor.scrollHeight}px`;
  });

  function toggleSigns() {
    finish();
    page.options.signs = !signs;
    delete page.options.source;
  }

  /**
   * Leaves the editor. Its text stays as it is, returns (empty lines) included, like in a text editor. Only an
   * empty editor goes away, with its own line: one line break.
   * @returns {(position: number) => number} where a position in the note before is now
   */
  function finish() {
    if (!edit) return (position) => position;
    const { prefix, draft, suffix, restore } = edit;
    edit = null;
    note.text = prefix + draft + suffix;
    if (draft) return (position) => position;

    if (restore !== undefined) {
      note.text = restore;
      return (position) => Math.min(position, restore.length);
    }
    // The empty line goes: the line break before it, or after it at the start of the note.
    const removed = prefix.endsWith('\n') ? prefix.length - 1 : suffix.startsWith('\n') ? prefix.length : -1;
    if (removed === -1) return (position) => position;
    note.text = note.text.slice(0, removed) + note.text.slice(removed + 1);
    return (position) => (position > removed ? position - 1 : position);
  }

  /** @typedef {'start' | 'end' | {start: number, end: number}} Caret where in the block's source */

  /**
   * Edits a block, with the caret at its start, end or a range of its source.
   * @param {Block} block
   * @param {Caret} [caret]
   */
  async function editBlock(block, caret = 'end') {
    const start = finish()(block.start);
    const text = note.text;
    const prefix = text.slice(0, start);
    const suffix = text.slice(start + block.raw.length);
    edit = { prefix, draft: block.raw, suffix, length: block.raw.length };
    await placeCaret(caret);
  }

  /** Starts a new block at the end of the note. */
  async function addBlock() {
    finish();
    const text = note.text;
    // Returns at the end are kept, a blank line keeps the new block apart from the last one.
    const prefix = !text.trim() ? '' : text.endsWith('\n\n') ? text : text.replace(/\n?$/, '\n\n');
    edit = { prefix, draft: '', suffix: '', length: 0, restore: text };
    await placeCaret('end');
  }

  /**
   * Opens the editor on an empty line of the note, clicked between blocks (or after the last one), like clicking an
   * empty line in a text editor. `anchor` is where the block after the empty lines starts (the note's length for the
   * empty lines at its end), `line` which of them was clicked, counted from the top.
   * @param {number} anchor
   * @param {number} line
   */
  async function editEmptyLine(anchor, line) {
    const at = finish()(anchor);
    const text = note.text;
    const blocks = splitBlocks(text);
    const above = blocks.filter((block) => block.start + block.raw.length <= at).at(-1);
    const end = above ? above.start + above.raw.length : 0;
    const breaks = countBreaks(text.slice(end, at));
    const atEnd = at >= text.length;

    // The new line sits where it was clicked, everything below stays in place (one line break more, the editor's).
    let before;
    let after;
    if (!above) {
      before = line;
      after = atEnd ? 0 : breaks - line + 1;
    } else if (atEnd) {
      before = line + 2;
      after = Math.max(0, breaks - line - 1);
    } else {
      before = line + 2;
      after = breaks - line - 1;
    }
    edit = {
      prefix: text.slice(0, end) + '\n'.repeat(before),
      draft: '',
      suffix: '\n'.repeat(after) + text.slice(at),
      length: 0
    };
    await placeCaret('end');
  }

  // An empty note opens ready to write.
  onMount(() => {
    if (edit) placeCaret('end');
  });

  /** @param {Caret} caret */
  async function placeCaret(caret) {
    await tick();
    if (!editor) return;
    editor.focus();
    if (typeof caret === 'object') {
      editor.setSelectionRange(caret.start, caret.end);
    } else {
      const position = caret === 'start' ? 0 : editor.value.length;
      editor.setSelectionRange(position, position);
    }
  }

  /**
   * Leaving the editor closes it. Not while the note is pressed (letting go decides), and not when the editor was
   * only swapped for the other kind (code or text): the new one has the focus by the time this checks.
   */
  function handleEditorBlur() {
    if (press) return;
    setTimeout(() => {
      if (!press && (!editor || document.activeElement !== editor)) finish();
    }, 0);
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (!edit || !editor) return;
    const { selectionStart, selectionEnd, value } = editor;
    const collapsed = selectionStart === selectionEnd;

    const shortcut = (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey ? event.key.toLowerCase() : '';
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // In a list item: nest it (Shift+Tab: back out). Anywhere else 4 spaces (instead of leaving the editor).
      event.preventDefault();
      const outdent = event.shiftKey;
      format((state) => nestListItem(state, outdent) ?? { from: state.start, to: state.end, insert: '    ', selectStart: state.start + 4, selectEnd: state.start + 4 });
    } else if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && continueList({ value, start: selectionStart, end: selectionEnd })) {
      // In a list the next line starts the next item (Shift+Enter for a plain new line).
      event.preventDefault();
      format((state) => continueList(state) ?? { from: state.start, to: state.end, insert: '\n', selectStart: state.start + 1, selectEnd: state.start + 1 });
    } else if (!collapsed && event.key in SURROUND && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // A bracket or quote around the selected text, like in a code editor.
      event.preventDefault();
      format((state) => surround(state, /** @type {keyof typeof SURROUND} */ (event.key)));
    } else if (shortcut === 'b' || shortcut === 'i' || shortcut === 'k') {
      event.preventDefault();
      if (shortcut === 'b') format((state) => toggleWrap(state, '**'));
      else if (shortcut === 'i') format((state) => toggleWrap(state, '*'));
      else format(insertLink);
    } else if (event.key === 'Escape') {
      // Only leaves the editor, nothing else closes.
      event.stopPropagation();
      editor.blur();
    } else if (event.key === 'ArrowUp' && collapsed && !value.slice(0, selectionStart).includes('\n') && before.length > 0) {
      event.preventDefault();
      editBlock(before[before.length - 1], 'end');
    } else if (event.key === 'ArrowDown' && collapsed && !value.slice(selectionEnd).includes('\n') && after.length > 0) {
      event.preventDefault();
      editBlock(after[0], 'start');
    } else if (event.key === 'Backspace' && value === '' && before.length > 0) {
      // Deleting an empty block goes back to the end of the one above.
      event.preventDefault();
      editBlock(before[before.length - 1], 'end');
    } else if (event.key === 'Backspace' && collapsed && selectionStart === 0 && before.length > 0) {
      event.preventDefault();
      joinBefore();
    } else if (event.key === 'Delete' && collapsed && selectionEnd === value.length && after.length > 0) {
      event.preventDefault();
      joinAfter();
    } else if (event.key === 'ArrowLeft' && collapsed && selectionStart === 0 && before.length > 0) {
      event.preventDefault();
      editBlock(before[before.length - 1], 'end');
    } else if (event.key === 'ArrowRight' && collapsed && selectionEnd === value.length && after.length > 0) {
      event.preventDefault();
      editBlock(after[0], 'start');
    }
  }

  /**
   * Backspace at the start of a block, like in a text editor: removes an empty line above it, or joins it to the
   * block above (on the next line, a second Backspace puts them on one line).
   */
  async function joinBefore() {
    if (!edit) return;
    const above = before[before.length - 1];
    const aboveEnd = above.start + above.raw.length;
    const gap = countBreaks(edit.prefix.slice(aboveEnd));
    if (gap > 2) {
      edit.prefix = edit.prefix.slice(0, aboveEnd) + '\n'.repeat(gap - 1);
      await placeCaret('start');
      return;
    }
    const caret = above.raw.length + 1;
    edit = { prefix: edit.prefix.slice(0, above.start), draft: `${above.raw}\n${edit.draft}`, suffix: edit.suffix, length: edit.length + caret };
    await placeCaret({ start: caret, end: caret });
  }

  /** Delete at the end of a block: removes an empty line below it, or joins the block below to it. */
  async function joinAfter() {
    if (!edit) return;
    const below = after[0];
    const breaks = /^\s*/.exec(edit.suffix)?.[0] ?? '';
    const gap = countBreaks(breaks);
    const caret = edit.draft.length;
    if (gap > 2) {
      edit.suffix = '\n'.repeat(gap - 1) + edit.suffix.slice(breaks.length);
    } else {
      const belowEnd = below.start - edit.prefix.length - edit.draft.length + below.raw.length;
      edit = { prefix: edit.prefix, draft: `${edit.draft}\n${below.raw}`, suffix: edit.suffix.slice(belowEnd), length: edit.length };
    }
    await placeCaret({ start: caret, end: caret });
  }

  /**
   * Pressing the note remembers where, letting go decides (see `handleRelease`). Meanwhile an open editor stays
   * open, closing it would move the text under the pointer.
   * @param {PointerEvent} event
   */
  function handlePress(event) {
    const target = /** @type {Element} */ (event.target);
    // Links, checkboxes and the editor do their own thing.
    if (event.button !== 0 || target.closest('a, input, textarea, .toolbar')) return;
    const element = /** @type {HTMLElement | null} */ (target.closest('[data-key]'));
    const emptyRow = /** @type {HTMLElement | null} */ (target.closest('[data-empty-anchor]'));
    const empty = emptyRow
      ? { anchor: Number(emptyRow.dataset.emptyAnchor), line: Math.floor((event.clientY - emptyRow.getBoundingClientRect().top) / LINE) }
      : null;
    press = { x: event.clientX, y: event.clientY, key: element?.dataset.key ?? null, element, below: Boolean(target.closest('[data-below]')), empty };
    if (event.pointerType === 'mouse') startSelecting(event);
  }

  /**
   * Only the note's text can be selected. Dragging past it (over the header, the status bar, the margins or out of
   * the window) would stop the selection there, so the selection follows the mouse to the nearest text instead,
   * and the page scrolls while the mouse is at or past the top or bottom of the window.
   * @param {PointerEvent} event
   */
  function startSelecting(event) {
    selectPointer = { x: event.clientX, y: event.clientY };
    const start = { ...selectPointer };
    /** @param {PointerEvent} move */
    const follow = (move) => {
      if (selectPointer) selectPointer = { x: move.clientX, y: move.clientY };
    };
    const stop = () => {
      selectPointer = null;
      window.removeEventListener('pointermove', follow);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', follow);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);

    const frame = () => {
      if (!selectPointer) return;
      if (Math.hypot(selectPointer.x - start.x, selectPointer.y - start.y) > CLICK_DISTANCE) followSelection(selectPointer);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /**
   * Scrolls near the window's edges and, if the mouse isn't over the note's text, extends the selection to the
   * text closest to it: the first or last visible line above or below the text, the line's start or end beside it.
   * @param {{x: number, y: number}} pointer
   */
  function followSelection({ x, y }) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !noteElement) return;

    let scrolled = false;
    if (y < SCROLL_EDGE) scrolled = scrollPage(-(SCROLL_EDGE - y) / 3);
    else if (y > window.innerHeight - SCROLL_EDGE) scrolled = scrollPage((y - window.innerHeight + SCROLL_EDGE) / 3);

    const blocks = noteElement.querySelectorAll('.block');
    if (blocks.length === 0) return;
    const first = blocks[0].getBoundingClientRect();
    const last = blocks[blocks.length - 1].getBoundingClientRect();
    const left = first.left + 1;
    const right = first.right - 1;
    // Only what's on screen and not behind the status bar can be found from a point.
    const top = Math.max(first.top, toolbar.getBoundingClientRect().bottom, 0) + 2;
    const bottom = Math.min(last.bottom, statusBar.getBoundingClientRect().top, window.innerHeight) - 2;
    if (bottom <= top) return;

    const inside = x >= left && x <= right && y >= top && y <= bottom;
    if (inside && !scrolled) return;

    let pointX = Math.min(Math.max(x, left), right);
    const pointY = Math.min(Math.max(y, top), bottom);
    // Above the start or below the end of the whole note: all the way to its start or end.
    if (y < top && first.top >= 0) pointX = left;
    if (y > bottom && last.bottom <= Math.min(statusBar.getBoundingClientRect().top, window.innerHeight)) pointX = right;

    const caret = caretAt(pointX, pointY);
    if (caret && noteElement.contains(caret.node)) selection.extend(caret.node, caret.offset);
  }

  /** @param {number} speed @returns {boolean} whether the page moved */
  function scrollPage(speed) {
    const before = window.scrollY;
    window.scrollBy(0, Math.max(-40, Math.min(40, speed)));
    return window.scrollY !== before;
  }

  /**
   * The text position at a point of the window.
   * @param {number} x
   * @param {number} y
   * @returns {{node: Node, offset: number} | null}
   */
  function caretAt(x, y) {
    if ('caretPositionFromPoint' in document) {
      const position = document.caretPositionFromPoint(x, y);
      return position && { node: position.offsetNode, offset: position.offset };
    }
    // Older Safari.
    const range = /** @type {any} */ (document).caretRangeFromPoint?.(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }

  /**
   * A click edits the clicked block with the caret at the same text, or adds a block when below the note.
   * Dragging selects text and leaves the note as it is (only an open editor closes).
   * @param {PointerEvent} event
   */
  function handleRelease(event) {
    if (!press) return;
    const { x, y, key, element, below, empty } = press;
    press = null;

    const selection = window.getSelection();
    const dragged = Math.hypot(event.clientX - x, event.clientY - y) > CLICK_DISTANCE || (selection && !selection.isCollapsed);
    if (dragged) return void finish();
    if (below) return void addBlock();
    if (empty) return void editEmptyLine(empty.anchor, empty.line);

    const block = segments.find((segment) => segment.key === key && !segment.editor);
    if (!block || !element) return void finish();

    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !element.contains(range.startContainer)) return void editBlock(block);
    const shownBefore = textBefore(element, range.startContainer, range.startOffset);
    let position = sourceOffset(block.raw, shownBefore);
    // Clicked at the start of a word (after a space or at the start of the block): the caret goes right before
    // that word, after any Markdown signs in between (closing **, "- [ ] ", line breaks).
    if (!shownBefore || /\s$/.test(shownBefore)) {
      const next = /\S/.exec(textAfter(element, range.startContainer, range.startOffset))?.[0];
      const found = next ? block.raw.indexOf(next, position) : -1;
      if (found !== -1) position = found;
    }
    lastOpen = { time: Date.now(), position };
    editBlock(block, { start: position, end: position });
  }

  /**
   * The first click of a double click opened the editor, the Markdown signs moved the text. The second click then
   * selects the word that was double clicked, not whatever is under the pointer now.
   */
  function handleDoubleClick() {
    if (!editor || !lastOpen || Date.now() - lastOpen.time > DOUBLE_CLICK_MS) return;
    const { value } = editor;
    const isWordChar = (/** @type {string | undefined} */ char) => char !== undefined && /[\p{L}\p{N}_]/u.test(char);
    let start = lastOpen.position;
    let end = lastOpen.position;
    while (isWordChar(value[start - 1])) start--;
    while (isWordChar(value[end])) end++;
    editor.setSelectionRange(start, end);
    lastOpen = null;
  }

  /**
   * The text shown in `element` before a point in it.
   * @param {HTMLElement} element
   * @param {Node} node
   * @param {number} offset
   */
  function textBefore(element, node, offset) {
    const range = document.createRange();
    range.setStart(element, 0);
    range.setEnd(node, offset);
    return range.toString();
  }

  /**
   * The text shown in `element` after a point in it.
   * @param {HTMLElement} element
   * @param {Node} node
   * @param {number} offset
   */
  function textAfter(element, node, offset) {
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(element, element.childNodes.length);
    return range.toString();
  }

  /**
   * Where shown text ends in the Markdown source: its letters are found in order, Markdown signs are skipped.
   * Spaces and line breaks aren't matched, the formatted text has them in other places than the source.
   * @param {string} raw
   * @param {string} shown
   */
  function sourceOffset(raw, shown) {
    let position = 0;
    for (const char of shown) {
      if (/\s/.test(char)) continue;
      const found = raw.indexOf(char, position);
      if (found === -1) continue;
      position = found + 1;
    }
    return position;
  }

  /**
   * Text selected in the formatted note can be changed like in a text editor: Backspace and Delete remove it,
   * typing replaces it, Ctrl+X cuts it. The editor then opens where it was.
   * @param {KeyboardEvent} event
   */
  function handleSelectionKey(event) {
    if (editor && document.activeElement === editor) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !noteElement) return;
    const range = selection.getRangeAt(0);
    if (!noteElement.contains(range.commonAncestorContainer)) return;

    const command = event.ctrlKey || event.metaKey;
    const typed = event.key.length === 1 && !command && !event.altKey ? event.key : null;
    const cut = command && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'x';
    if (!typed && !cut && event.key !== 'Backspace' && event.key !== 'Delete') return;

    const span = selectedSource(range);
    if (!span) return;
    event.preventDefault();
    if (cut) navigator.clipboard?.writeText(selection.toString()).catch(() => {});
    selection.removeAllRanges();
    // A bracket or quote goes around the selected text instead of replacing it.
    const pair = typed && typed in SURROUND ? SURROUND[/** @type {keyof typeof SURROUND} */ (typed)] : null;
    const text = note.text.slice(span.start, span.end);
    replaceSource(span.start, span.end, pair ? pair[0] + text + pair[1] : (typed ?? ''));
  }

  /**
   * Where a selection of the formatted note is in its Markdown. Blocks selected from their very start or to their
   * very end are taken whole, with their Markdown signs ("# ", "**", "- [ ] ", ...).
   * @param {Range} range
   * @returns {{start: number, end: number} | null}
   */
  function selectedSource(range) {
    const elements = /** @type {HTMLElement[]} */ ([...noteElement.querySelectorAll('[data-key]')]).filter((element) => range.intersectsNode(element));
    const blockOf = (/** @type {HTMLElement} */ element) => segments.find((segment) => segment.key === element.dataset.key && !segment.editor);
    const first = elements.length ? blockOf(elements[0]) : undefined;
    const last = elements.length ? blockOf(elements[elements.length - 1]) : undefined;
    if (!first || !last) return null;

    let start = first.start;
    const firstElement = elements[0];
    if (firstElement.contains(range.startContainer)) {
      const shownBefore = textBefore(firstElement, range.startContainer, range.startOffset);
      if (shownBefore.trim()) {
        const offset = sourceOffset(first.raw, shownBefore);
        const next = /\S/.exec(range.toString())?.[0];
        const found = next ? first.raw.indexOf(next, offset) : -1;
        start = first.start + (found === -1 ? offset : found);
      }
    }

    let end = last.start + last.raw.length;
    const lastElement = elements[elements.length - 1];
    if (lastElement.contains(range.endContainer) && textAfter(lastElement, range.endContainer, range.endOffset).trim()) {
      end = last.start + sourceOffset(last.raw, textBefore(lastElement, range.endContainer, range.endOffset));
    }
    return end > start ? { start, end } : null;
  }

  /**
   * Replaces part of the note's Markdown and opens the editor right after the new text. Blank lines left on both
   * sides of what was removed become one, like the blank line between blocks.
   * @param {number} start
   * @param {number} end
   * @param {string} insert
   */
  function replaceSource(start, end, insert) {
    const moved = finish();
    const text = note.text;
    let head = text.slice(0, moved(start));
    let tail = text.slice(moved(end));
    const headBreaks = /\n*$/.exec(head)?.[0].length ?? 0;
    const tailBreaks = /^\n*/.exec(tail)?.[0].length ?? 0;
    // Only removing text leaves blank lines to tidy up, typed text stays between them.
    if (!insert) {
      if (!head.trim()) {
        head = '';
        tail = tail.replace(/^\s+/, '');
      } else if (!tail.trim()) {
        head = head.replace(/\s+$/, '');
        tail = '';
      } else if (headBreaks + tailBreaks > 2) {
        tail = tail.slice(Math.max(0, tailBreaks - Math.max(0, 2 - headBreaks)));
      }
    }

    note.text = head + insert + tail;
    const caret = head.length + insert.length;
    const block = splitBlocks(note.text).find((item) => item.start <= caret && caret <= item.start + item.raw.length);
    if (block) editBlock(block, { start: caret - block.start, end: caret - block.start });
    // Everything deleted: ready to write again.
    else if (!note.text.trim()) addBlock();
  }

  /** @param {Block} block @param {number} index */
  function toggleInBlock(block, index) {
    finish();
    note.text = note.text.slice(0, block.start) + toggleTask(block.raw, index) + note.text.slice(block.start + block.raw.length);
  }
</script>

{#snippet emptyRows(/** @type {Block} */ segment, /** @type {number} */ index)}
  {@const lines = emptyLines(segment.gap ?? 0, index === 0)}
  {#if lines > 0}
    <!-- Empty lines before the block: click one to write on it. -->
    <div class="empty-lines" data-empty-anchor={segment.start} style:height="{lines * LINE}px"></div>
  {/if}
{/snippet}

<svelte:window onpointerup={handleRelease} onpointercancel={() => (press = null)} onkeydown={handleSelectionKey} />
<svelte:document onselectionchange={updateCaret} />

<main class="notes-page">
  <PageHeader {page} />

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="note" onpointerdown={handlePress} bind:this={noteElement}>
    <!-- Pressing a button keeps the editor focused (and open), the formatting goes into it. -->
    <div class="toolbar" role="toolbar" aria-label="Formatting" tabindex="-1" onmousedown={(event) => event.preventDefault()} bind:this={toolbar}>
      <div class="tools">
        {#each TOOLS as tool, index (index)}
          {#if tool}
            <button
              class="tool m3-icon"
              class:active={tool.kind && edit !== null && currentKind === tool.kind}
              title={tool.title}
              onclick={tool.run}>{tool.icon}</button>
          {:else}
            <span class="divider" aria-hidden="true"></span>
          {/if}
        {/each}
      </div>
      <button
        class="tool m3-icon"
        class:active={signs}
        title={signs ? 'Hide Markdown Signs' : 'Show Markdown Signs'}
        aria-pressed={signs}
        onclick={toggleSigns}>tag</button>
    </div>

    {#each segments as segment, index (segment.key)}
      {#if segment.editor && edit}
        <!-- In a block like the formatted ones, so editing doesn't move anything. -->
        {@render emptyRows(segment, index)}
        <div class="block" class:heading={headingLevel > 0}>
          {#if codeLayer !== null}
            <!-- The code box: the colored code below, the textarea with see-through text on top, in the same font. -->
            <div class="code-box">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by highlight.js and highlightCodeSource -->
              <pre class="code-layer" aria-hidden="true" bind:this={codeLayerElement}>{@html codeLayer + '\n'}</pre>
              <textarea
                class="editor code-input"
                wrap="off"
                spellcheck="false"
                bind:value={edit.draft}
                bind:this={editor}
                onkeydown={handleKeyDown}
                oninput={updateCaret}
                onscroll={() => codeLayerElement && editor && (codeLayerElement.scrollLeft = editor.scrollLeft)}
                onblur={handleEditorBlur}></textarea>
            </div>
          {:else}
            <!-- The editor over its drawn list (when it has one), both in the same place. -->
            <div class="text-editor">
              {#if listLayer !== null}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by mirrorList -->
                <div class="mirror" aria-hidden="true">{@html listLayer + '\n'}</div>
              {/if}
              <textarea
                class="editor heading-{headingLevel}"
                class:mirrored={listLayer !== null}
                rows="1"
                placeholder={before.length || after.length ? '' : 'Start writing. Markdown works: # Heading, **bold**, - [ ] task'}
                spellcheck="true"
                bind:value={edit.draft}
                bind:this={editor}
                onkeydown={handleKeyDown}
                oninput={updateCaret}
                ondblclick={handleDoubleClick}
                onblur={handleEditorBlur}></textarea>
            </div>
          {/if}
        </div>
      {:else}
        {@render emptyRows(segment, index)}
        <div class="block" data-key={segment.key}>
          <Markdown text={segment.raw} {signs} onToggleTask={(index) => toggleInBlock(segment, index)} />
        </div>
      {/if}
    {:else}
      <p class="empty" data-below>Nothing written yet. Click to start writing.</p>
    {/each}

    <!-- The space below the note: clicking it starts a new block at the end. -->
    {#if trailingLines > 0}
      <div class="empty-lines" data-empty-anchor={note.text.length} style:height="{trailingLines * LINE}px"></div>
    {/if}
    <div class="below" data-below></div>

    <!-- Stays at the bottom of the window while a long note scrolls. -->
    <footer class="status" aria-live="off" bind:this={statusBar}>
      <span>Ln {caret.line}, Col {caret.column}</span>
      <span class="status-counts">
        <span>{words} {words === 1 ? 'word' : 'words'}</span>
        <span>{characters} {characters === 1 ? 'character' : 'characters'}</span>
      </span>
    </footer>
  </div>
</main>


<style>
  /* Wider than a Tasks page, the note is the whole page. */
  .notes-page {
    box-sizing: border-box;
    max-width: 1100px;
    min-height: 100vh;
    margin: auto;
    padding: 0 10px 30px;
    display: flex;
    flex-direction: column;
  }

  /* Keeps the title clear of the menu button (80px from the left) while the page is only a little narrower than
     the window, like the dashboard title. Below 741px the header has its own layout for that. */
  @media (min-width: 741px) and (max-width: 1260px) {
    .notes-page :global(.page-header) {
      padding-left: max(0px, calc(80px - max(20px, (100vw - 1100px) / 2 + 10px)));
    }
  }

  /* The rest of the app can't be selected, the note can. */
  .note {
    -webkit-user-select: text;
    user-select: text;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-top: 18px;
    padding: 26px 32px 0;
    background-color: var(--surface);
    border-radius: 30px;
  }

  @media (max-width: 500px) {
    .note {
      padding: 20px 20px 0;
    }

    .toolbar {
      margin: -20px -20px 12px;
      padding: 6px 12px;
    }

    .status {
      margin: 0 -20px;
      padding: 8px 20px;
    }
  }

  /* Like Notepad's formatting bar: across the top of the note, stays in view while a long note scrolls. */
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 1;
    margin: -26px -32px 14px;
    padding: 6px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: var(--surface);
    border-bottom: 1.5px solid var(--surface-active);
    border-radius: 30px 30px 0 0;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Scrolls sideways when the window is too narrow for all the buttons. */
  .tools {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tool {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    border-radius: 10px;
    color: var(--text-soft);
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
    cursor: pointer;
    transition: color 0.3s, background-color 0.3s;
  }

  .tool:hover {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .tool.active {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .divider {
    flex-shrink: 0;
    width: 1.5px;
    height: 22px;
    margin: 0 6px;
    background-color: var(--surface-active);
  }

  /* Fixed spacing in px: in em it would follow the editor's font size and grow when a heading is edited. */
  .block {
    padding: 2px 0;
    cursor: text;
  }

  /* Headings get more room above them. In :where, so the first block's rule below still wins. */
  .block:where(.heading, :has(> :global(.markdown > :is(h1, h2, h3, h4, h5, h6, .md-h1, .md-h2, .md-h3, .md-h4, .md-h5, .md-h6)))) {
    padding-top: 8px;
  }

  /* The first block right under the toolbar. */
  .empty-lines {
    cursor: text;
  }

  .toolbar + .block {
    padding-top: 0;
  }

  /* Looks exactly like the text around it: same font, size and line height, only the Markdown signs show. */
  .editor {
    display: block;
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    padding: 0;
    resize: none;
    overflow: hidden;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    line-height: 1.4;
    tab-size: 4;
  }

  /* Exactly like the code box of the formatted note (Markdown.svelte), so nothing moves when it's edited. */
  .code-box {
    position: relative;
    padding: 4px 12px;
    border-radius: 10px;
    background-color: var(--surface-raised);
  }

  .code-layer,
  .code-input {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: calc(17px * 0.88);
    line-height: 1.4;
    white-space: pre;
    tab-size: 4;
  }

  .code-layer {
    margin: 0;
    overflow: hidden;
    color: var(--text);
  }

  /* On top of the colored code: only its caret and selection show. */
  .code-input {
    position: absolute;
    inset: 4px 12px;
    width: calc(100% - 24px);
    height: calc(100% - 8px);
    overflow-x: auto;
    overflow-y: hidden;
    color: transparent;
    caret-color: var(--text);
    scrollbar-width: none;
  }

  .code-layer :global(.md-sign) {
    opacity: 0.45;
  }

  .text-editor {
    position: relative;
  }

  /* The list being typed, drawn: exactly the editor's text and font, under it. Bullets and boxes cover their
     Markdown signs, they look like the formatted list (Markdown.svelte). */
  .mirror {
    position: absolute;
    inset: 0;
    pointer-events: none;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    line-height: 1.4;
    tab-size: 4;
  }

  .mirror :global(:is(.mm-bullet, .mm-box, .mm-hidden)) {
    position: relative;
    color: transparent;
  }

  .mirror :global(.mm-bullet::after) {
    position: absolute;
    inset: 0;
    color: var(--text);
    text-align: center;
  }

  .mirror :global(.mm-level-0::after) {
    content: '•';
  }

  .mirror :global(.mm-level-1::after) {
    content: '◦';
  }

  .mirror :global(.mm-level-2::after) {
    content: '▪';
  }

  /* A checkbox over "[ ]" / "[x]": a square as wide as "[ ]", where the formatted note has its checkbox. */
  .mirror :global(.mm-box::after) {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 0.798em;
    height: 0.798em;
    border: 1.5px solid var(--text-muted);
    border-radius: 3px;
    box-sizing: border-box;
    transform: translateY(-50%);
  }

  .mirror :global(.mm-checked::after) {
    border-color: var(--accent);
    background-color: var(--accent);
  }

  /* Over the drawn list: only the caret and the selection show. */
  .editor.mirrored {
    position: relative;
    color: transparent;
    caret-color: var(--text);
  }

  .editor::placeholder {
    color: var(--text-muted);
  }

  /* Same sizes and colors as the headings in Markdown.svelte. */
  .editor:is(.heading-1, .heading-2, .heading-3, .heading-4, .heading-5, .heading-6) {
    font-family: "Stoke", serif;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  .editor.heading-1 { font-size: calc(17px * 1.6); color: var(--task); }
  .editor.heading-2 { font-size: calc(17px * 1.4); color: var(--wave); }
  .editor.heading-3 { font-size: calc(17px * 1.25); color: var(--accent); }
  .editor.heading-4 { font-size: calc(17px * 1.12); color: var(--task); }
  .editor.heading-5 { font-size: calc(17px * 1.05); color: var(--wave); }
  .editor.heading-6 { font-size: 17px; color: var(--accent); }

  .empty {
    margin: 0.4em 0 0;
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    color: var(--text-muted);
  }

  /* At least a third of the window, so there's always somewhere to click to keep writing. */
  .below {
    flex: 1;
    min-height: 33vh;
    cursor: text;
  }

  /* Like Notepad's status bar: across the bottom of the note, small and quiet. Not selectable. */
  .status {
    position: sticky;
    bottom: 0;
    margin: 0 -32px;
    padding: 8px 32px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    background-color: var(--surface);
    border-top: 1.5px solid var(--surface-active);
    border-radius: 0 0 30px 30px;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    -webkit-user-select: none;
    user-select: none;
    cursor: default;
  }

  .status-counts {
    display: flex;
    gap: 16px;
  }
</style>
