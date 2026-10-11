// src/lib/pages/notes/markdown.js
// Markdown to safe HTML for the Notes pages, and ticking off its task list items ("- [ ] ...") in the source.
// Code blocks are colored by highlight.js (its common languages), see code-theme.css for the colors.

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

/** Unlabeled code is only colored when highlight.js is this sure of the language, plain text stays plain. */
const MIN_RELEVANCE = 3;

/**
 * Colored HTML for code (escaped, safe to insert). `language` is the label after the ``` (```js), without one
 * the language is guessed.
 * @param {string} code
 * @param {string} [language]
 */
export function highlightCode(code, language = '') {
  const name = language.trim().split(/\s+/)[0];
  if (name && hljs.getLanguage(name)) return hljs.highlight(code, { language: name, ignoreIllegals: true }).value;
  const guess = hljs.highlightAuto(code);
  return guess.relevance >= MIN_RELEVANCE ? guess.value : escapeHtml(code);
}

marked.use({
  // Code blocks only come from ``` fences. Lines starting with 4 spaces (a Tab in the editor) stay text.
  tokenizer: {
    code() {
      return undefined;
    }
  },
  renderer: {
    code({ text, lang }) {
      return `<pre><code class="hljs">${highlightCode(text, lang)}</code></pre>\n`;
    }
  }
});

/** A closed ``` code block: its fence lines and the code between them. @typedef {{open: string, code: string, close: string, language: string}} CodeBlock */

/**
 * The parts of a block's source if it is a closed code block (```js ... ```), otherwise null.
 * @param {string} raw
 * @returns {CodeBlock | null}
 */
export function parseCodeBlock(raw) {
  const match = /^( {0,3}(`{3,}|~{3,})([^\n]*))\n([\s\S]*?)\n?( {0,3}\2[`~]*[ \t]*)$/.exec(raw);
  if (!match || raw.indexOf('\n') === -1) return null;
  return { open: match[1], code: match[4], close: match[5], language: match[3].trim() };
}

let hooked = false;

/** DOMPurify needs a browser, so its hook is added on first use instead of on import (pages are prerendered). */
function addHook() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Links leave the app in a new tab.
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    // Task list checkboxes can be ticked, see `toggleTask`.
    if (node.tagName === 'INPUT') node.removeAttribute('disabled');
  });
}

const TASK_ITEM = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/;
const FENCE = /^\s*(```|~~~)/;
/** A heading sign with nothing after it: "#", "## ". */
const EMPTY_HEADING = /^(\s{0,3})(#{1,6})[ \t]*$/;
/** A list item, its indentation nests it, so it's kept as it is. */
const LIST_ITEM = /^\s*([-*+]|\d+[.)])\s/;

/**
 * Prepares the text for Markdown, outside code blocks:
 * - Like in Obsidian, "#" only makes a heading once text follows it. Until then it's shown as it is, Markdown
 *   would make it an empty (invisible) heading.
 * - Spaces (and tabs, 4 spaces each) at the start of a line show, like in a text editor. HTML would drop them.
 * @param {string} text
 */
function prepareText(text) {
  let inCode = false;
  return text
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) inCode = !inCode;
      if (inCode) return line;
      const indent = /^[ \t]*/.exec(line)?.[0] ?? '';
      const kept = indent && !LIST_ITEM.test(line) ? '\u00a0'.repeat(indent.replace(/\t/g, '    ').length) + line.slice(indent.length) : line;
      return kept.replace(EMPTY_HEADING, '$1\\$2');
    })
    .join('\n');
}

/** @param {string} text */
export function renderMarkdown(text) {
  addHook();
  const html = /** @type {string} */ (marked.parse(prepareText(text), { gfm: true, breaks: true, async: false }));
  return DOMPurify.sanitize(html);
}

/**
 * Ticks or unticks the `index`th task list item, counted like the rendered checkboxes (code blocks skipped).
 * @param {string} text
 * @param {number} index
 * @returns {string}
 */
export function toggleTask(text, index) {
  const lines = text.split('\n');
  let inCode = false;
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) inCode = !inCode;
    if (inCode) continue;
    const match = TASK_ITEM.exec(lines[i]);
    if (!match) continue;
    if (count++ !== index) continue;

    const done = match[2] !== ' ';
    lines[i] = `${match[1]}[${done ? ' ' : 'x'}]${lines[i].slice(match[0].length)}`;
    return lines.join('\n');
  }
  return text;
}

/**
 * A block of the note (heading, paragraph, list, code, ...): where it starts in the text and its source. `gap` is
 * how many line breaks come before it (after the block above, or from the start of the note): 2 is the usual
 * blank line, every one more is another empty line.
 * @typedef {{start: number, raw: string, gap?: number}} Block
 */

/** Line breaks in a piece of text. @param {string} text */
export const countBreaks = (text) => text.split('\n').length - 1;

/**
 * Splits a note into its blocks, the blank lines between them are left out. `raw` has no trailing newlines.
 * @param {string} text
 * @returns {Block[]}
 */
export function splitBlocks(text) {
  const tokens = marked.lexer(text);
  // The pieces always add up to the text. If they ever didn't, the whole note is one block, so nothing gets lost.
  if (tokens.map((token) => token.raw).join('') !== text) return text.trim() ? [{ start: 0, raw: text.replace(/\n+$/, ''), gap: 0 }] : [];

  /** @type {Block[]} */
  const blocks = [];
  let position = 0;
  let end = 0;
  for (const token of tokens) {
    if (token.type !== 'space') {
      const raw = token.raw.replace(/\n+$/, '');
      blocks.push({ start: position, raw, gap: countBreaks(text.slice(end, position)) });
      end = position + raw.length;
    }
    position += token.raw.length;
  }
  return blocks;
}

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** @param {string} text already escaped */
const sign = (text) => `<span class="md-sign">${text}</span>`;

/**
 * Formats the inline Markdown of a line, keeping every sign visible: `**bold**` is bold with faint asterisks.
 * @param {string} line
 */
function highlightInline(line) {
  // Signs and code are kept aside as placeholders while the rules run, so their asterisks and underscores aren't
  // matched again by a later rule.
  /** @type {string[]} */
  const kept = [];
  /** @param {string} html */
  const keep = (html) => `\uE000${kept.push(html) - 1}\uE000`;
  /** @param {string} text */
  const keepSign = (text) => keep(sign(text));

  let html = escapeHtml(line)
    // Nothing inside code is formatted.
    .replace(/(`+)(.+?)\1/g, (_, ticks, code) => keep(`${sign(ticks)}<code>${code}</code>${sign(ticks)}`))
    .replace(/(!?\[)([^\]]*)\]\(([^)\s]*)\)/g, (_, open, text, url) =>
      `${keepSign(open)}<span class="md-link">${text}</span>${keepSign(`](${url})`)}`)
    .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, (_, mark, text) => `${keepSign(mark)}<strong>${text}</strong>${keepSign(mark)}`)
    .replace(/(?<![*\w])([*_])(?=\S)(.+?)(?<=\S)\1(?![*\w])/g, (_, mark, text) => `${keepSign(mark)}<em>${text}</em>${keepSign(mark)}`)
    .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, (_, text) => `${keepSign('~~')}<del>${text}</del>${keepSign('~~')}`);

  // Kept fragments can hold placeholders themselves, so this repeats until all are back.
  while (html.includes('\uE000')) html = html.replace(/\uE000(\d+)\uE000/g, (_, index) => kept[Number(index)]);
  return html;
}

/**
 * A block's Markdown with its signs shown: every character of the source stays, formatted like the rendered note
 * (headings in their size and color, bold, lists, quotes, code). Escaped, safe to insert as HTML.
 * @param {string} raw
 */
export function highlightMarkdown(raw) {
  const lines = raw.split('\n');
  let html = '';
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    // A code block: its fences as signs, the code between them colored, in one piece (colors can span lines).
    const fence = FENCE.exec(line);
    if (fence) {
      const closing = lines.findIndex((other, at) => at > index && other.trim().startsWith(fence[1]));
      const last = closing === -1 ? lines.length : closing;
      const code = lines.slice(index + 1, last).join('\n');
      html += `<div class="md-line md-code">${sign(escapeHtml(line))}</div>`;
      if (last > index + 1) html += `<div class="md-code-body">${highlightCode(code, line.trim().slice(fence[1].length))}\n</div>`;
      if (closing !== -1) html += `<div class="md-line md-code">${sign(escapeHtml(lines[closing]))}</div>`;
      index = last;
      continue;
    }

    // Only with text after it, see `keepEmptyHeadings`.
    const heading = /^(#{1,6})(\s+)(\S.*)$/.exec(line);
    if (heading) {
      html += `<div class="md-line md-h${heading[1].length}">${sign(heading[1] + heading[2])}${highlightInline(heading[3])}</div>`;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      html += `<div class="md-line">${sign(escapeHtml(line))}</div>`;
      continue;
    }

    const quote = /^(\s*>\s?)(.*)$/.exec(line);
    if (quote) {
      html += `<div class="md-line md-quote">${sign(escapeHtml(quote[1]))}${highlightInline(quote[2])}</div>`;
      continue;
    }

    const item = /^(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/.exec(line);
    if (item) {
      html += `<div class="md-line md-item">${sign(escapeHtml(item[1]))}${highlightInline(item[2])}</div>`;
      continue;
    }

    html += `<div class="md-line">${highlightInline(line) || ' '}</div>`;
  }
  return html;
}

/**
 * A code block's source with its fences shown faint and its code colored, for the editor while the fences are
 * visible. Escaped, safe to insert as HTML.
 * @param {CodeBlock} block
 */
export function highlightCodeSource({ open, code, close, language }) {
  return `${sign(escapeHtml(open))}\n${highlightCode(code, language)}\n${sign(escapeHtml(close))}`;
}

/**
 * The code editor's text: the opening fence (```js) faint on the first line, the code below colored in the
 * language the fence names, so changing it there colors the code anew. Escaped, safe to insert as HTML.
 * @param {string} draft
 */
export function highlightCodeDraft(draft) {
  const lineEnd = draft.indexOf('\n');
  const open = lineEnd === -1 ? draft : draft.slice(0, lineEnd);
  const fence = FENCE.exec(open);
  if (!fence) return escapeHtml(draft);
  const language = open.trim().slice(fence[1].length);
  return lineEnd === -1 ? sign(escapeHtml(open)) : `${sign(escapeHtml(open))}\n${highlightCode(draft.slice(lineEnd + 1), language)}`;
}

/** A list item's start: indentation, bullet or number, spaces, task box. */
const LIST_LINE = /^([ \t]*)(?:([-*+])|(\d+[.)]))([ \t]+)(\[[ xX]\][ \t]+)?/;

/** Whether text has list items, the editor then draws their bullets (see `mirrorList`). @param {string} text */
export const hasListItems = (text) => text.split('\n').some((line) => LIST_LINE.test(line));

/**
 * The editor's text with its list items drawn like the formatted note: every character stays in place (the
 * editor's caret and selection lie on top), bullets and task boxes are drawn over their Markdown signs. Escaped,
 * safe to insert as HTML.
 * @param {string} text
 */
export function mirrorList(text) {
  /** Indentation of each open list level. @type {number[]} */
  const levels = [];
  return text
    .split('\n')
    .map((line) => {
      const match = LIST_LINE.exec(line);
      if (!match) {
        if (line.trim() && !/^\s/.test(line)) levels.length = 0;
        return escapeHtml(line);
      }
      const [all, indent, bullet, number, spaces, task] = match;
      const width = indent.replace(/\t/g, '    ').length;
      while (levels.length && levels[levels.length - 1] > width) levels.pop();
      if (!levels.length || levels[levels.length - 1] < width) levels.push(width);
      const level = Math.min(levels.length - 1, 2);

      let html = escapeHtml(indent);
      if (task) {
        const checked = /x/i.test(task);
        html += `<span class="mm-hidden">${escapeHtml(bullet ?? number)}</span>${spaces}`;
        html += `<span class="mm-box${checked ? ' mm-checked' : ''}">${escapeHtml(task.trimEnd())}</span>${escapeHtml(task.slice(task.trimEnd().length))}`;
      } else if (bullet) {
        html += `<span class="mm-bullet mm-level-${level}">${escapeHtml(bullet)}</span>${spaces}`;
      } else {
        html += `${escapeHtml(number)}${spaces}`;
      }
      return html + escapeHtml(line.slice(all.length));
    })
    .join('\n');
}
