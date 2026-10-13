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

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
