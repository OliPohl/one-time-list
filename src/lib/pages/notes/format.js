// src/lib/pages/notes/format.js
// The formatting buttons of a note: each works out how the editor's text changes for its selection.
// They return an edit instead of changing the text, so the page can apply it the way that keeps undo working.

/** The editor's text and selection. @typedef {{value: string, start: number, end: number}} TextState */
/** Replace `from`-`to` with `insert`, then select `selectStart`-`selectEnd`. @typedef {{from: number, to: number, insert: string, selectStart: number, selectEnd: number}} TextEdit */

/**
 * Puts `mark` around the selection (**bold**, *italic*, ...), or takes it away when it's already there.
 * Without a selection the marks are added with the caret between them.
 * @param {TextState} state
 * @param {string} mark
 * @returns {TextEdit}
 */
export function toggleWrap({ value, start, end }, mark) {
  const selected = value.slice(start, end);
  const size = mark.length;

  // Marks just outside the selection.
  if (value.slice(start - size, start) === mark && value.slice(end, end + size) === mark) {
    return { from: start - size, to: end + size, insert: selected, selectStart: start - size, selectEnd: end - size };
  }
  // Marks inside the selection.
  if (selected.length >= size * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
    const inner = selected.slice(size, -size);
    return { from: start, to: end, insert: inner, selectStart: start, selectEnd: start + inner.length };
  }
  return { from: start, to: end, insert: mark + selected + mark, selectStart: start + size, selectEnd: end + size };
}

/** Typing one of these with text selected puts the pair around it: open and close. */
export const SURROUND = {
  '`': ['`', '`'],
  '(': ['(', ')'],
  ')': ['(', ')'],
  '[': ['[', ']'],
  ']': ['[', ']'],
  '{': ['{', '}'],
  '}': ['{', '}'],
  '"': ['"', '"'],
  "'": ["'", "'"]
};

/**
 * Puts the pair of a typed bracket or quote around the selection, which stays selected.
 * @param {TextState} state
 * @param {keyof typeof SURROUND} key
 * @returns {TextEdit}
 */
export function surround({ value, start, end }, key) {
  const [open, close] = SURROUND[key];
  const insert = open + value.slice(start, end) + close;
  return { from: start, to: end, insert, selectStart: start + open.length, selectEnd: end + open.length };
}

/**
 * A link around the selection. The address is selected to be typed, or the text when nothing was selected.
 * @param {TextState} state
 * @returns {TextEdit}
 */
export function insertLink({ value, start, end }) {
  const selected = value.slice(start, end);
  const text = selected || 'text';
  const insert = `[${text}](https://)`;
  return selected
    ? { from: start, to: end, insert, selectStart: start + text.length + 3, selectEnd: start + insert.length - 1 }
    : { from: start, to: end, insert, selectStart: start + 1, selectEnd: start + 1 + text.length };
}

/**
 * Inserts an image from the web: ![text](https://), the selection becomes its text, the address is selected to be
 * typed or pasted.
 * @param {TextState} state
 * @returns {TextEdit}
 */
export function insertImage({ value, start, end }) {
  const text = value.slice(start, end) || 'image';
  const insert = `![${text}](https://)`;
  return { from: start, to: end, insert, selectStart: start + text.length + 4, selectEnd: start + insert.length - 1 };
}

/** Kinds of line a button can make. @typedef {'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'task' | 'quote'} LineKind */

/** Every line sign a line can start with, after its indentation. */
const LINE_SIGN = /^#{1,6}\s+|^[-*+]\s+\[[ xX]\]\s+|^[-*+]\s+|^\d+[.)]\s+|^>\s?/;

/** @type {Record<LineKind, RegExp>} */
const IS_KIND = {
  h1: /^#\s/,
  h2: /^##\s/,
  h3: /^###\s/,
  bullet: /^[-*+]\s+(?!\[[ xX]\])/,
  number: /^\d+[.)]\s/,
  task: /^[-*+]\s+\[[ xX]\]\s/,
  quote: /^>/
};

/** @param {LineKind} kind @param {number} index */
function signFor(kind, index) {
  return { h1: '# ', h2: '## ', h3: '### ', bullet: '- ', number: `${index}. `, task: '- [ ] ', quote: '> ' }[kind];
}

/** A list item's start: indentation, marker (- * + or a number with . or )), spaces, and a task box. */
const LIST_START = /^(\s*)(?:([-*+])|(\d+)([.)]))(\s+)(\[[ xX]\]\s+)?/;

/**
 * The number a numbered list continues with after the line ending right before `at`, 1 when there's none.
 * @param {string} value
 * @param {number} at start of a line
 */
function nextNumber(value, at) {
  if (at === 0) return 1;
  const above = value.slice(value.lastIndexOf('\n', at - 2) + 1, at - 1);
  const number = /^\s*(\d+)[.)]\s/.exec(above)?.[1];
  return number ? Number(number) + 1 : 1;
}

/**
 * Renumbers the numbered items that follow `at` (a line start) at the same indentation, counting on from `number`.
 * @param {string} value
 * @param {number} at
 * @param {string} indent
 * @param {number} number
 * @returns {{to: number, insert: string}} the changed lines from `at` to `to`
 */
function renumberFrom(value, at, indent, number) {
  let position = at;
  let insert = '';
  while (position < value.length) {
    const lineEnd = value.indexOf('\n', position);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const line = value.slice(position, end);
    const match = LIST_START.exec(line);
    if (!match || !match[3] || match[1] !== indent) break;
    insert += (insert ? '\n' : '') + indent + number++ + line.slice(indent.length + match[3].length);
    position = end + 1;
  }
  return { to: Math.min(position - 1, value.length), insert };
}

/**
 * Enter in a list item, like in a word processor: the next line starts the next item (- , 2. , - [ ] ). In an
 * empty item it ends the list instead. Returns null outside lists, Enter then just makes a new line.
 * @param {TextState} state
 * @returns {TextEdit | null}
 */
export function continueList({ value, start, end }) {
  if (start !== end) return null;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start);
  const line = value.slice(lineStart, lineEnd);
  const match = LIST_START.exec(line);
  if (!match || start < lineStart + match[0].length) return null;

  // An empty item: the list ends, its marker goes away. A blank line after the list starts the next paragraph
  // (without it the text would still belong to the last item).
  if (!line.slice(match[0].length).trim()) {
    return { from: lineStart, to: lineEnd, insert: '\n', selectStart: lineStart + 1, selectEnd: lineStart + 1 };
  }

  const [, indent, bullet, number, delimiter, , task] = match;
  const marker = bullet ?? `${Number(number) + 1}${delimiter}`;
  const next = `\n${indent}${marker} ${task ? '[ ] ' : ''}`;
  const caret = start + next.length;
  if (!number) return { from: start, to: start, insert: next, selectStart: caret, selectEnd: caret };

  // The numbered items below count on.
  const rest = value.slice(start, lineEnd);
  const following = lineEnd < value.length ? renumberFrom(value, lineEnd + 1, indent, Number(number) + 2) : { to: lineEnd, insert: '' };
  const insert = next + rest + (following.insert ? '\n' + following.insert : '');
  return { from: start, to: following.insert ? following.to : lineEnd, insert, selectStart: caret, selectEnd: caret };
}

/**
 * The kind of a line (heading, list, ...), for showing which button is on.
 * @param {string} line
 * @returns {LineKind | null}
 */
export function lineKind(line) {
  const content = line.trimStart();
  for (const kind of /** @type {LineKind[]} */ (Object.keys(IS_KIND))) {
    if (IS_KIND[kind].test(content)) return kind;
  }
  return null;
}

/**
 * Makes every selected line a heading, list item, task or quote, replacing the sign it had. If they all are that
 * already, the sign is taken away instead. Numbered lists count up.
 * @param {TextState} state
 * @param {LineKind} kind
 * @returns {TextEdit}
 */
export function toggleLines({ value, start, end }, kind) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end);
  const to = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(from, to).split('\n');

  const parts = lines.map((line) => {
    const indent = /^\s*/.exec(line)?.[0] ?? '';
    const rest = line.slice(indent.length);
    return { indent, rest, content: rest.replace(LINE_SIGN, '') };
  });
  const remove = parts.every((part) => IS_KIND[kind].test(part.rest));
  // A numbered list counts on from the item right above.
  const first = nextNumber(value, from);
  const insert = parts.map((part, index) => part.indent + (remove ? '' : signFor(kind, first + index)) + part.content).join('\n');

  // A list or quote right next to paragraph text would take it in (or be taken in), a blank line keeps them apart.
  const separate = !remove && kind !== 'h1' && kind !== 'h2' && kind !== 'h3';
  const lineAbove = from > 0 ? value.slice(value.lastIndexOf('\n', from - 2) + 1, from - 1) : '';
  const lineBelow = to < value.length ? value.slice(to + 1, value.indexOf('\n', to + 1) === -1 ? value.length : value.indexOf('\n', to + 1)) : '';
  const apart = (/** @type {string} */ line) => line.trim() !== '' && !IS_KIND[kind].test(line.trimStart());
  const before = separate && apart(lineAbove) ? '\n' : '';
  const after = separate && apart(lineBelow) ? '\n' : '';
  const shift = before.length;

  // A caret stays on the same text, a selection covers the changed lines.
  if (start === end && lines.length === 1) {
    const caret = Math.max(from, start + (insert.length - (to - from))) + shift;
    return { from, to, insert: before + insert + after, selectStart: caret, selectEnd: caret };
  }
  return { from, to, insert: before + insert + after, selectStart: from + shift, selectEnd: from + shift + insert.length };
}

const NEST = '    ';

/**
 * Tab in a list item nests it one level deeper (4 spaces in front), Shift+Tab takes it a level back out. A
 * numbered item counts on from the item above it on its new level, or starts at 1. Returns null outside lists.
 * @param {TextState} state
 * @param {boolean} outdent
 * @returns {TextEdit | null}
 */
export function nestListItem({ value, start, end }, outdent) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end) === -1 ? value.length : value.indexOf('\n', end);
  const line = value.slice(lineStart, lineEnd);
  const match = LIST_START.exec(line);
  if (!match || line.includes('\n')) return null;

  const [, indent, , number, delimiter] = match;
  if (outdent && !indent) return null;
  const newIndent = outdent ? indent.slice(Math.min(indent.length, indent.startsWith('\t') ? 1 : NEST.length)) : NEST + indent;
  let rest = line.slice(indent.length);
  if (number) {
    // The item right above on the new level (if there is one before a line with less indentation).
    let count = 1;
    let position = lineStart;
    while (position > 0) {
      const above = value.slice(value.lastIndexOf('\n', position - 2) + 1, position - 1);
      position = value.lastIndexOf('\n', position - 2) + 1;
      const aboveMatch = LIST_START.exec(above);
      if (!aboveMatch || aboveMatch[1].length < newIndent.length) break;
      if (aboveMatch[1] === newIndent && aboveMatch[3]) {
        count = Number(aboveMatch[3]) + 1;
        break;
      }
    }
    rest = `${count}${delimiter}${rest.slice(number.length + delimiter.length)}`;
  }
  const insert = newIndent + rest;
  const change = insert.length - line.length;
  return { from: lineStart, to: lineEnd, insert, selectStart: Math.max(lineStart, start + change), selectEnd: Math.max(lineStart, end + change) };
}

/**
 * A "---" line after the caret's line, with blank lines around it (right under text it would make a heading).
 * @param {TextState} state
 * @returns {TextEdit}
 */
export function insertRule({ value, end }) {
  const lineEnd = value.indexOf('\n', end);
  const at = lineEnd === -1 ? value.length : lineEnd;
  const lineStart = value.lastIndexOf('\n', at - 1) + 1;
  const insert = (value.slice(lineStart, at).trim() ? '\n\n' : '') + '---\n\n';
  return { from: at, to: at, insert, selectStart: at + insert.length, selectEnd: at + insert.length };
}

const FENCE_LINE = /^\s*(```|~~~)/;

/**
 * Code: `inline` for text on one line, a ``` code block for several lines or an empty line. Takes it away again
 * when the selection already is code.
 * @param {TextState} state
 * @returns {TextEdit}
 */
export function toggleCode(state) {
  const { value, start, end } = state;
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end);
  const to = lineEnd === -1 ? value.length : lineEnd;
  const multiLine = value.slice(start, end).includes('\n');
  const emptyLine = start === end && !value.slice(from, to).trim();
  if (!multiLine && !emptyLine) return toggleWrap(state, '`');

  const lines = value.slice(from, to).split('\n');
  // The selected lines start and end with fences: take them away.
  if (lines.length >= 2 && FENCE_LINE.test(lines[0]) && FENCE_LINE.test(lines[lines.length - 1])) {
    const inner = lines.slice(1, -1).join('\n');
    return { from, to, insert: inner, selectStart: from, selectEnd: from + inner.length };
  }
  // Fences right around the selected lines: take them away.
  const above = value.lastIndexOf('\n', from - 2) + 1;
  const belowEnd = value.indexOf('\n', to + 1);
  const lineAbove = from > 0 ? value.slice(above, from - 1) : '';
  const lineBelow = to < value.length ? value.slice(to + 1, belowEnd === -1 ? value.length : belowEnd) : '';
  if (FENCE_LINE.test(lineAbove) && FENCE_LINE.test(lineBelow)) {
    const inner = value.slice(from, to);
    return { from: above, to: belowEnd === -1 ? value.length : belowEnd, insert: inner, selectStart: above, selectEnd: above + inner.length };
  }

  const inner = value.slice(from, to);
  const insert = `\`\`\`\n${inner}\n\`\`\``;
  return { from, to, insert, selectStart: from + 4, selectEnd: from + 4 + inner.length };
}
