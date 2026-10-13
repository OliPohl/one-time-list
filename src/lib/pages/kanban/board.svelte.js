// src/lib/pages/kanban/board.svelte.js
// State of one Kanban page: its columns, each a task list like a Tasks page (current task, list, history), the
// labels of the whole board and its widgets. Lives outside the page component like the Tasks page's store, so
// widgets keep running and the dashboard can read it.

import { untrack } from 'svelte';
import { WidgetStore } from '../../widgets/store.svelte.js';
import { loadJSON, saveJSON } from '../../utils/storage.js';
import { uniqueId } from '../../utils/id.js';
import { TaskList, widgetsEnabled, addLabelTo, untagLabel, labelsOfTask } from '../tasks/list.svelte.js';

/** @typedef {import('../tasks/list.svelte.js').TaskItem} TaskItem */
/** @typedef {import('../tasks/list.svelte.js').Label} Label */
/** @typedef {{id: string, name: string, list: TaskList}} Column */
/** Where a task is in its column. @typedef {'list' | 'current' | 'history'} TaskSource */
/** @typedef {import('../tasks/list.svelte.js').LabelOwner} LabelOwner */

/** Name of the first column of a new board, and of added columns. */
const FIRST_COLUMN = 'To Do';
const NEW_COLUMN = 'New Column';

/** @param {string} pageId */
const boardKey = (pageId) => `otl_board_${pageId}`;
/** @param {string} pageId */
const widgetsKey = (pageId) => `otl_widgets_${pageId}`;

/** @implements {LabelOwner} */
export class BoardStore {
  /** @type {Column[]} */
  columns = $state([]);
  /** The board's labels, shared by all columns, so a task keeps its labels in every column. @type {Label[]} */
  labels = $state([]);

  hasTasks = $derived(this.columns.some((column) => column.list.hasTasks));

  #pageId;
  /** @type {(() => void) | undefined} */
  #stopEffects;

  /** @param {string} pageId */
  constructor(pageId) {
    this.#pageId = pageId;
    this.widgets = new WidgetStore(widgetsKey(pageId));
  }

  /** Task ids are unique on the whole board, tasks move between columns. @param {string} id */
  #isTaken = (id) => this.columns.some((column) => column.list.hasId(id));

  /** @param {any} [saved] */
  #newList(saved) {
    const list = new TaskList({
      onSelected: () => this.widgets.taskSelected(),
      onCompleted: () => this.widgets.taskCompleted(),
      isTaken: this.#isTaken
    });
    if (saved) list.restore(saved);
    return list;
  }

  /** @param {string} name @returns {Column} */
  #newColumn(name) {
    const id = uniqueId((other) => this.columns.some((column) => column.id === other));
    return { id, name, list: this.#newList() };
  }

  /** @param {{widgetsEnabled?: boolean}} [options] */
  load({ widgetsEnabled = true } = {}) {
    const saved = loadJSON(boardKey(this.#pageId), /** @type {any} */ ({}));
    const columns = Array.isArray(saved.columns) ? saved.columns : [];
    this.columns = columns.map((/** @type {any} */ column) => ({ id: column.id, name: column.name, list: this.#newList(column) }));
    // A new board starts with one empty column.
    if (this.columns.length === 0) this.columns = [this.#newColumn(FIRST_COLUMN)];
    this.labels = Array.isArray(saved.labels) ? saved.labels : [];

    this.widgets.load({ suspended: !widgetsEnabled });

    this.#stopEffects?.();
    this.#stopEffects = $effect.root(() => {
      $effect(() => {
        saveJSON(boardKey(this.#pageId), {
          columns: this.columns.map((column) => ({ id: column.id, name: column.name, ...column.list.toSaved() })),
          labels: this.labels
        });
      });

      // Reset all widgets once the board is empty, like a Tasks page.
      $effect(() => {
        if (!this.hasTasks) untrack(() => this.widgets.resetAll());
      });
    });
  }

  /** Stops the store and deletes everything it saved. */
  destroy() {
    this.#stopEffects?.();
    this.widgets.destroy();
    localStorage.removeItem(boardKey(this.#pageId));
  }

  /** @param {string} id */
  column(id) {
    return this.columns.find((column) => column.id === id) ?? null;
  }

  /** Adds a column at the right end. @returns {string} its id */
  addColumn() {
    const column = this.#newColumn(NEW_COLUMN);
    this.columns.push(column);
    return column.id;
  }

  /** An emptied name keeps the old one. @param {string} id @param {string} name */
  renameColumn(id, name) {
    const column = this.column(id);
    if (column && name.trim()) column.name = name.trim();
  }

  /** Moves a column one place to the left (-1) or right (1). @param {string} id @param {-1 | 1} step */
  moveColumn(id, step) {
    const from = this.columns.findIndex((column) => column.id === id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= this.columns.length) return;
    const column = this.columns[from];
    this.columns = this.columns.toSpliced(from, 1).toSpliced(to, 0, column);
  }

  /** Deletes a column with its tasks. The last column stays. @param {string} id */
  removeColumn(id) {
    if (this.columns.length <= 1) return;
    this.columns = this.columns.filter((column) => column.id !== id);
  }

  /** The column a task is in, and the task. @param {string} id */
  findTask(id) {
    for (const column of this.columns) {
      const task = column.list.findTask(id);
      if (task) return { column, task };
    }
    return null;
  }

  /**
   * Moves a task to `index` of a column's list, from anywhere on the board. Within one column it's the same as
   * dragging on a Tasks page.
   * @param {string} id
   * @param {string} fromId column the task is in
   * @param {TaskSource} source where it is in that column
   * @param {string} toId
   * @param {number} index in the target list, counted without the task
   */
  moveTask(id, fromId, source, toId, index) {
    const from = this.column(fromId)?.list;
    const to = this.column(toId)?.list;
    if (!from || !to) return;

    if (from === to) {
      if (source === 'current') from.insertCurrent(index);
      else if (source === 'history') from.insertFromHistory(id, index);
      else if (from.moveTask(id, index)) from.saveCustomOrder();
      return;
    }

    const task = from.take(id);
    if (task) to.insert(task, index);
  }

  /**
   * Makes a task the current task of a column, from anywhere on the board.
   * @param {string} id @param {string} fromId @param {TaskSource} source @param {string} toId
   */
  selectTask(id, fromId, source, toId) {
    const to = this.column(toId)?.list;
    if (!to) return;
    if (fromId !== toId) {
      this.moveTask(id, fromId, source, toId, 0);
    } else if (source === 'history') {
      to.insertFromHistory(id, 0);
    } else if (source === 'current') {
      return;
    }
    to.selectTask(id);
  }

  /** @param {string} name @param {string} color @param {string} icon */
  addLabel(name, color, icon) {
    return addLabelTo(this.labels, name, color, icon);
  }

  /** Deletes a label, also from every task tagged with it. @param {string} id */
  removeLabel(id) {
    this.labels = this.labels.filter((label) => label.id !== id);
    untagLabel(this.columns.flatMap((column) => column.list.allTasks()), id);
  }

  /** @param {TaskItem} task */
  labelsOf(task) {
    return labelsOfTask(this.labels, task);
  }
}

/** @type {Map<string, BoardStore>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache, the stores themselves are reactive
const stores = new Map();

/** Stops following a page's widget option, per page id. @type {Map<string, () => void>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping, not state
const optionWatchers = new Map();

/**
 * The loaded store of a page, created on first use. With `page`, its widgets follow the page's "Widgets" option,
 * like a Tasks page.
 * @param {string} pageId
 * @param {import('../types.js').Page} [page]
 */
export function getBoardStore(pageId, page) {
  let store = stores.get(pageId);
  if (!store) {
    store = new BoardStore(pageId);
    store.load({ widgetsEnabled: page ? widgetsEnabled(page.options) : true });
    stores.set(pageId, store);
  }
  if (page && !optionWatchers.has(pageId)) {
    const widgets = store.widgets;
    optionWatchers.set(pageId, $effect.root(() => {
      $effect(() => {
        const enabled = widgetsEnabled(page.options);
        untrack(() => widgets.setEnabled(enabled));
      });
    }));
  }
  return store;
}

/** The store of a page if it's loaded, without loading it. @param {string} pageId */
export function findBoardStore(pageId) {
  return stores.get(pageId);
}

/** @param {string} pageId */
export function deleteBoardStore(pageId) {
  optionWatchers.get(pageId)?.();
  optionWatchers.delete(pageId);
  (stores.get(pageId) ?? new BoardStore(pageId)).destroy();
  stores.delete(pageId);
}
