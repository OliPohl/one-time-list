// src/lib/pages/notes/editor/livePreview.js
// Obsidian's live preview for CodeMirror: the note is shown formatted, the Markdown signs (##, **, [](), ...) only
// show on the lines the caret or selection is on, faint. Bullets and task boxes are drawn in place of their signs,
// task boxes can be ticked with a click. With `signs` every sign stays visible (faint) and nothing is drawn over it.

import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

const BULLETS = ['•', '◦', '▪'];

class BulletWidget extends WidgetType {
  /** @param {number} depth */
  constructor(depth) {
    super();
    this.depth = depth;
  }

  /** @param {BulletWidget} other */
  eq(other) {
    return other.depth === this.depth;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bullet';
    span.textContent = BULLETS[this.depth % BULLETS.length];
    return span;
  }
}

class TaskBoxWidget extends WidgetType {
  /** @param {boolean} checked */
  constructor(checked) {
    super();
    this.checked = checked;
  }

  /** @param {TaskBoxWidget} other */
  eq(other) {
    return other.checked === this.checked;
  }

  toDOM() {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'cm-task-box';
    box.checked = this.checked;
    box.tabIndex = -1;
    return box;
  }

  // Clicks reach the editor, see the mousedown handler below.
  ignoreEvent() {
    return false;
  }
}

class RuleWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const rule = document.createElement('span');
    rule.className = 'cm-rule';
    return rule;
  }
}

const hidden = Decoration.replace({});
const inlineCode = Decoration.mark({ class: 'cm-inline-code' });
const link = Decoration.mark({ class: 'cm-link' });
const sign = Decoration.mark({ class: 'cm-sign' });
const quoteLine = Decoration.line({ class: 'cm-quote' });
const ruleLine = Decoration.line({ class: 'cm-rule-line' });
/** @type {Record<number, Decoration>} */
const headingLines = {};
for (let level = 1; level <= 6; level++) headingLines[level] = Decoration.line({ class: `cm-heading cm-h${level}` });

/**
 * @param {import('@codemirror/view').EditorView} view
 * @param {boolean} signs
 */
function buildDecorations(view, signs) {
  const { state } = view;
  const doc = state.doc;

  // Lines the caret or a selection is on show their signs.
  /** @type {Set<number>} */
  const activeLines = new Set();
  for (const range of state.selection.ranges) {
    const first = doc.lineAt(range.from).number;
    const last = doc.lineAt(range.to).number;
    for (let line = first; line <= last; line++) activeLines.add(line);
  }
  const focused = view.hasFocus;
  /** @param {number} pos */
  const isActive = (pos) => signs || (focused && activeLines.has(doc.lineAt(pos).number));
  /** A node's signs show if any of its lines is active. @param {number} from @param {number} to */
  const spanActive = (from, to) => {
    if (signs) return true;
    if (!focused) return false;
    const first = doc.lineAt(from).number;
    const last = doc.lineAt(to).number;
    for (let line = first; line <= last; line++) if (activeLines.has(line)) return true;
    return false;
  };

  /** @type {import('@codemirror/state').Range<Decoration>[]} */
  const decorations = [];
  /** Hides a sign, or shows it faint where signs show. @param {number} from @param {number} to @param {boolean} show */
  const markSign = (from, to, show) => {
    if (from < to) decorations.push((show ? sign : hidden).range(from, to));
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter(node) {
        const name = node.name;

        const heading = /^(?:ATX|Setext)Heading(\d)$/.exec(name);
        if (heading) {
          const level = Number(heading[1]);
          for (let pos = node.from; pos <= node.to; ) {
            const line = doc.lineAt(pos);
            decorations.push(headingLines[level].range(line.from));
            pos = line.to + 1;
          }
          return;
        }

        switch (name) {
          case 'HeaderMark': {
            const show = isActive(node.from);
            // The space after "#" goes with it.
            const end = doc.sliceString(node.to, node.to + 1) === ' ' ? node.to + 1 : node.to;
            // Setext underlines (=== / ---) are a line of their own.
            markSign(node.from, end, show);
            return;
          }
          case 'EmphasisMark':
          case 'StrikethroughMark':
            markSign(node.from, node.to, isActive(node.from));
            return;
          case 'InlineCode':
            decorations.push(inlineCode.range(node.from, node.to));
            return;
          case 'CodeMark':
            // Fences are handled with their code block.
            if (node.node.parent?.name === 'InlineCode') markSign(node.from, node.to, isActive(node.from));
            return;
          case 'FencedCode': {
            const show = spanActive(node.from, node.to);
            for (let pos = node.from; pos <= node.to; ) {
              const line = doc.lineAt(pos);
              const fence = line.from === node.from || line.to === node.to;
              const classes = ['cm-code-line'];
              if (line.from === node.from) classes.push('cm-code-first');
              if (line.to === node.to) classes.push('cm-code-last');
              if (fence) classes.push('cm-code-fence');
              decorations.push(Decoration.line({ class: classes.join(' '), attributes: { spellcheck: 'false' } }).range(line.from));
              // The fence lines are only the box's top and bottom edge until the caret comes into the block.
              if (fence) markSign(line.from, line.to, show);
              pos = line.to + 1;
            }
            return;
          }
          case 'Link': {
            const show = isActive(node.from);
            const marks = node.node.getChildren('LinkMark');
            const url = node.node.getChild('URL');
            // Only links written with their text ([text](url)) look like a link, bare <urls> keep their text.
            if (marks.length >= 2) {
              decorations.push(link.range(marks[0].to, marks[1].from));
              markSign(marks[0].from, marks[0].to, show);
              markSign(marks[1].from, node.to, show);
            } else if (url) {
              decorations.push(link.range(url.from, url.to));
            }
            return false;
          }
          case 'Blockquote':
            for (let pos = node.from; pos <= node.to; ) {
              const line = doc.lineAt(pos);
              decorations.push(quoteLine.range(line.from));
              pos = line.to + 1;
            }
            return;
          case 'QuoteMark': {
            const end = doc.sliceString(node.to, node.to + 1) === ' ' ? node.to + 1 : node.to;
            markSign(node.from, end, isActive(node.from));
            return;
          }
          case 'ListMark': {
            if (isActive(node.from)) return;
            const item = node.node.parent;
            const list = item?.parent;
            if (list?.name !== 'BulletList') return;
            // Task items show their box instead of a bullet.
            if (item?.getChild('Task')) {
              decorations.push(hidden.range(node.from, Math.min(node.to + 1, doc.lineAt(node.from).to)));
              return;
            }
            let depth = 0;
            for (let parent = list.parent; parent; parent = parent.parent) {
              if (parent.name === 'BulletList' || parent.name === 'OrderedList') depth++;
            }
            decorations.push(Decoration.replace({ widget: new BulletWidget(depth) }).range(node.from, node.to));
            return;
          }
          case 'TaskMarker': {
            if (isActive(node.from)) return;
            const checked = /x/i.test(doc.sliceString(node.from, node.to));
            decorations.push(Decoration.replace({ widget: new TaskBoxWidget(checked) }).range(node.from, node.to));
            return;
          }
          case 'HorizontalRule':
            decorations.push(ruleLine.range(doc.lineAt(node.from).from));
            if (!isActive(node.from)) decorations.push(Decoration.replace({ widget: new RuleWidget() }).range(node.from, node.to));
            return;
        }
      }
    });
  }

  return Decoration.set(decorations, true);
}

/**
 * Ticks or unticks the task box at `pos` (the start of its "[ ]").
 * @param {EditorView} view
 * @param {number} pos
 */
function toggleTaskAt(view, pos) {
  const marker = view.state.doc.sliceString(pos, pos + 3);
  if (!/^\[[ xX]\]$/.test(marker)) return false;
  view.dispatch({ changes: { from: pos + 1, to: pos + 2, insert: marker[1] === ' ' ? 'x' : ' ' }, userEvent: 'input' });
  return true;
}

/** The URL of the link at `pos`, if there is one. @param {EditorView} view @param {number} pos */
function linkAt(view, pos) {
  /** @type {import('@lezer/common').SyntaxNode | null} */
  let node = syntaxTree(view.state).resolveInner(pos, 1);
  for (; node; node = node.parent) {
    if (node.name === 'Link' || node.name === 'Autolink') {
      const url = node.getChild('URL');
      return url ? view.state.doc.sliceString(url.from, url.to) : null;
    }
  }
  return null;
}

/**
 * The live preview. `signs` keeps every Markdown sign visible.
 * @param {{signs: boolean}} options
 */
export function livePreview({ signs }) {
  const plugin = ViewPlugin.fromClass(
    class {
      /** @param {EditorView} view */
      constructor(view) {
        this.decorations = buildDecorations(view, signs);
      }

      /** @param {import('@codemirror/view').ViewUpdate} update */
      update(update) {
        if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged || syntaxTree(update.state) !== syntaxTree(update.startState)) {
          this.decorations = buildDecorations(update.view, signs);
        }
      }
    },
    { decorations: (value) => value.decorations }
  );

  const clicks = EditorView.domEventHandlers({
    mousedown(event, view) {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.matches('.cm-task-box')) {
        event.preventDefault();
        return toggleTaskAt(view, view.posAtDOM(target));
      }

      // Links open with Ctrl (Cmd) + click, a plain click puts the caret in them to edit.
      if ((event.ctrlKey || event.metaKey) && target.closest('.cm-link')) {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        const url = pos === null ? null : linkAt(view, pos);
        if (url) {
          event.preventDefault();
          window.open(url, '_blank', 'noopener,noreferrer');
          return true;
        }
      }
      return false;
    }
  });

  return [plugin, clicks];
}
