// src/lib/pages/board/board.svelte.js
// State of one board page: its columns side by side, each a stack of pages (items), and the labels of the whole
// board. An item is a local Tasks list (current task, list, history, its widgets), a local note or whiteboard, or a
// link to a Tasks, Notes or Whiteboard page that shows that page's own data. Lives outside the page component like the Tasks page's
// store, so widgets keep running while another page is shown and the dashboard can read it.

import { untrack } from 'svelte';
import { loadJSON, saveJSON } from '../../utils/storage.js';
import { uniqueId } from '../../utils/id.js';
import { colorsOf, colorsStyle } from '../../colors.js';
import { TaskList, getListStore, addLabelTo, untagLabel, labelsOfTask } from '../tasks/list.svelte.js';
import { WidgetStore } from '../../widgets/store.svelte.js';
import { getNote } from '../notes/store.svelte.js';
import { pages } from '../../app/pages.svelte.js';
import tasksType from '../tasks/index.js';
import notesType from '../notes/index.js';
import whiteboardType from '../whiteboard/index.js';
import { loadDrawing, saveDrawing, deleteDrawing } from '../whiteboard/store.js';

/** @typedef {import('../tasks/list.svelte.js').TaskItem} TaskItem */
/** @typedef {import('../tasks/list.svelte.js').Label} Label */
/** @typedef {import('../tasks/list.svelte.js').LabelOwner} LabelOwner */
/** @typedef {import('../types.js').Page} Page */
/** Page types a board can hold, local or linked. @typedef {'tasks' | 'notes' | 'whiteboard'} ItemKind */
/**
 * Settings of a local item. With `own` it has its own colors and widgets option, without it the board's.
 * @typedef {{own?: boolean, colors?: string, widgets?: boolean}} ItemOptions
 */
/**
 * A page on the board. Ids are unique on the whole board. A Tasks list has its own widgets, like a Tasks page.
 * @typedef {{id: string, kind: 'tasks', name: string, options: ItemOptions, list: TaskList, widgets: WidgetStore}
 *   | {id: string, kind: 'notes', name: string, options: ItemOptions, text: string}
 *   | {id: string, kind: 'whiteboard', name: string, options: ItemOptions}
 *   | {id: string, kind: 'link', pageId: string}} Item
 */
/** Pages stacked on top of each other, never empty. @typedef {{id: string, items: Item[]}} Column */
/**
 * Where a dragged item goes: into a column's stack at `index` (counted without the item), or into a new column
 * at `at` (an index into the columns as they are).
 * @typedef {{column: string, index: number} | {at: number}} ItemTarget
 */
/** Where a task is in its list. @typedef {'list' | 'current' | 'history'} TaskSource */

/** The page types an item can be, by kind. */
const TYPES = { tasks: tasksType, notes: notesType, whiteboard: whiteboardType };

/** @param {string} pageId */
const boardKey = (pageId) => `taskbook_board_${pageId}`;
/** Where the drawing of a whiteboard on a board is saved (see whiteboard/store.js). @param {string} pageId @param {string} itemId */
const itemDrawingId = (pageId, itemId) => `board_${pageId}_${itemId}`;
/** The widgets of a Tasks list on a board. @param {string} pageId @param {string} itemId */
const itemWidgetsKey = (pageId, itemId) => `taskbook_board_widgets_${pageId}_${itemId}`;

/** Whether a board's widgets are on: off unless turned on. @param {Record<string, any>} options */
export const boardWidgetsEnabled = (options) => options.widgets === true;
/** Widgets boards had before, still removed with the board. @param {string} pageId */
const widgetsKey = (pageId) => `taskbook_widgets_${pageId}`;

/** @implements {LabelOwner} */
export class BoardStore {
  /** @type {Column[]} */
  columns = $state([]);
  /** Every item on the board, column by column, top to bottom. */
  items = $derived(this.columns.flatMap((column) => column.items));
  /** The labels of the local lists, shared by them, so a task keeps its labels in every column. @type {Label[]} */
  labels = $state([]);

  #pageId;
  /** The board page, for its settings (widgets on or off), when known. @type {Page | undefined} */
  #page = $state();
  /** @type {(() => void) | undefined} */
  #stopEffects;

  /** @param {string} pageId @param {Page} [page] */
  constructor(pageId, page) {
    this.#pageId = pageId;
    this.#page = page;
  }

  /** @param {Page} page */
  setPage(page) {
    this.#page = page;
  }

  /** The board's settings. */
  get boardOptions() {
    return this.#page?.options ?? {};
  }

  /** Task ids are unique among the local lists, tasks move between them. @param {string} id */
  #isTaken = (id) => this.items.some((item) => item.kind === 'tasks' && item.list.hasId(id));

  /**
   * A task list with its widgets, which follow its tasks (a timer starting with a selected task, ...).
   * @param {string} itemId @param {any} [saved]
   */
  #newList(itemId, saved) {
    const widgets = new WidgetStore(itemWidgetsKey(this.#pageId, itemId));
    const list = new TaskList({
      isTaken: this.#isTaken,
      onSelected: (task) => widgets.taskSelected(task.id),
      onCompleted: (task) => widgets.taskCompleted(task.id),
      onRemoved: (id) => widgets.removeTaskWidgets(id)
    });
    if (saved) list.restore(saved);
    // Turned off until it's known whether they're on, so nothing that ended while the app was closed rings.
    widgets.load({ suspended: true });
    return { list, widgets };
  }

  /** An id no column and no item has. */
  #newId() {
    return uniqueId((other) => this.columns.some((column) => column.id === other || column.items.some((item) => item.id === other)));
  }

  /** A saved item, older ones are all task lists. @param {any} saved @returns {Item | null} */
  #restoreItem(saved) {
    if (saved.kind === 'link') return typeof saved.pageId === 'string' ? { id: saved.id, kind: 'link', pageId: saved.pageId } : null;
    const options = saved.options && typeof saved.options === 'object' ? saved.options : {};
    // Saved before an item could have its own widgets option: its own colors were its own settings.
    if (options.own === undefined && options.colors) options.own = true;
    if (saved.kind === 'notes') return { id: saved.id, kind: 'notes', name: saved.name, options, text: typeof saved.text === 'string' ? saved.text : '' };
    if (saved.kind === 'whiteboard') return { id: saved.id, kind: 'whiteboard', name: saved.name, options };
    return { id: saved.id, kind: 'tasks', name: saved.name, options, ...this.#newList(saved.id, saved) };
  }

  /** @param {Item} item */
  #saveItem(item) {
    if (item.kind === 'link') return { id: item.id, kind: item.kind, pageId: item.pageId };
    if (item.kind === 'notes') return { id: item.id, kind: item.kind, name: item.name, options: item.options, text: item.text };
    if (item.kind === 'whiteboard') return { id: item.id, kind: item.kind, name: item.name, options: item.options };
    return { id: item.id, kind: item.kind, name: item.name, options: item.options, ...item.list.toSaved() };
  }

  /** A new local Tasks list, note or whiteboard. @param {ItemKind} kind @param {string} [name] @returns {Item} */
  #newItem(kind, name = TYPES[kind].defaultName) {
    const id = this.#newId();
    if (kind === 'tasks') return { id, kind, name, options: {}, ...this.#newList(id) };
    if (kind === 'whiteboard') return { id, kind, name, options: {} };
    return { id, kind, name, options: {}, text: '' };
  }

  /** Puts an item into a new column at the right end. @param {Item} item */
  #pushColumn(item) {
    // The item's id is free, it's not on the board yet.
    const id = uniqueId((other) => other === item.id || this.columns.some((column) => column.id === other || column.items.some((each) => each.id === other)));
    this.columns.push({ id, items: [item] });
  }

  load() {
    const saved = loadJSON(boardKey(this.#pageId), /** @type {any} */ ({}));
    const columns = Array.isArray(saved.columns) ? saved.columns : [];
    this.columns = [];
    for (const column of columns) {
      // Saved before columns could hold several items: each was one item.
      const items = (Array.isArray(column.items) ? column.items : [column])
        .map((/** @type {any} */ item) => this.#restoreItem(item))
        .filter((/** @type {Item | null} */ item) => item !== null);
      if (items.length === 0) continue;
      if (Array.isArray(column.items)) this.columns.push({ id: column.id, items });
      else for (const item of items) this.#pushColumn(item);
    }
    // A new board has no columns, it asks for its first one (see BoardPage).

    this.labels = Array.isArray(saved.labels) ? saved.labels : [];

    this.#stopEffects?.();
    this.#stopEffects = $effect.root(() => {
      $effect(() => {
        saveJSON(boardKey(this.#pageId), {
          columns: this.columns.map((column) => ({ id: column.id, items: column.items.map((item) => this.#saveItem(item)) })),
          labels: this.labels
        });
      });

      // Each list's widgets run while they're turned on (the board's option or its own).
      $effect(() => {
        for (const item of this.items) {
          if (item.kind !== 'tasks') continue;
          const enabled = this.widgetsEnabled(item);
          untrack(() => item.widgets.setEnabled(enabled));
        }
      });

      // A list's widgets are reset once it's empty, like a Tasks page's. Only when it becomes empty: this runs
      // again for every change of any list.
      /** @type {Map<string, boolean>} */
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping, not state
      const hadTasks = new Map();
      $effect(() => {
        for (const item of this.items) {
          if (item.kind !== 'tasks') continue;
          const has = item.list.hasTasks;
          if (hadTasks.get(item.id) && !has) untrack(() => item.widgets.resetAll());
          hadTasks.set(item.id, has);
        }
      });

      // Links to deleted pages go away with the page, a column without items with them.
      $effect(() => {
        const gone = this.items.filter((item) => item.kind === 'link' && !pages.get(item.pageId));
        if (gone.length > 0) untrack(() => gone.forEach((item) => this.removeItem(item.id)));
      });
    });
  }

  /** Stops the store and deletes everything it saved. Linked pages stay. */
  destroy() {
    this.#stopEffects?.();
    for (const item of this.items) {
      if (item.kind === 'tasks') item.widgets.destroy();
      if (item.kind === 'whiteboard') deleteDrawing(itemDrawingId(this.#pageId, item.id));
    }
    localStorage.removeItem(boardKey(this.#pageId));
    localStorage.removeItem(widgetsKey(this.#pageId));
  }

  /** @param {string} id */
  column(id) {
    return this.columns.find((column) => column.id === id) ?? null;
  }

  /** @param {string} id */
  item(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  /** The column an item is in. @param {string} id */
  columnOf(id) {
    return this.columns.find((column) => column.items.some((item) => item.id === id)) ?? null;
  }

  /** The page an item links to. @param {Item} item @returns {Page | undefined} */
  pageOf(item) {
    return item.kind === 'link' ? pages.get(item.pageId) : undefined;
  }

  /** Tasks, notes or a whiteboard, also for a linked page. @param {Item} item @returns {ItemKind | undefined} */
  kindOf(item) {
    if (item.kind !== 'link') return item.kind;
    const type = this.pageOf(item)?.type;
    return type === 'tasks' || type === 'notes' || type === 'whiteboard' ? type : undefined;
  }

  /** Where the drawing of a whiteboard is saved, a linked Whiteboard page's own. Null for others. @param {Item} item */
  drawingOf(item) {
    if (item.kind === 'whiteboard') return itemDrawingId(this.#pageId, item.id);
    if (item.kind === 'link' && this.kindOf(item) === 'whiteboard') return item.pageId;
    return null;
  }

  /** @param {Item} item */
  nameOf(item) {
    return item.kind === 'link' ? (this.pageOf(item)?.name ?? '') : item.name;
  }

  /**
   * The colors of an item as CSS custom properties: a linked page's own, a local item's with its own settings.
   * Without, it has the board's.
   * @param {Item} item
   */
  styleOf(item) {
    if (item.kind !== 'link') return item.options.own && item.options.colors ? colorsStyle(colorsOf(item.options)) : undefined;
    const page = this.pageOf(item);
    const kind = this.kindOf(item);
    return page && kind ? TYPES[kind].style?.(page) : undefined;
  }

  /** The task list of an item, a linked Tasks page's own. @param {Item | null} item @returns {TaskList | null} */
  listOf(item) {
    if (!item) return null;
    if (item.kind === 'tasks') return item.list;
    if (item.kind === 'link' && this.kindOf(item) === 'tasks') return getListStore(item.pageId);
    return null;
  }

  /**
   * The widgets of an item: a local list's own, a linked Tasks page's own (with the ones placed freely on that
   * page). Null for notes.
   * @param {Item} item
   * @returns {WidgetStore | null}
   */
  widgetsOf(item) {
    if (item.kind === 'tasks') return item.widgets;
    if (item.kind === 'link' && this.kindOf(item) === 'tasks') return getListStore(item.pageId).widgets;
    return null;
  }

  /**
   * Whether an item's widgets are on: a local list's by its own settings or the board's, a linked Tasks page's by
   * that page's.
   * @param {Item} item
   */
  widgetsEnabled(item) {
    if (item.kind === 'tasks') return item.options.own ? item.options.widgets === true : boardWidgetsEnabled(this.boardOptions);
    const page = this.pageOf(item);
    return page?.type === 'tasks' && page.options.widgets !== false;
  }

  /** The widgets of the local lists that ring, the sidebar blinks the board then. */
  ringingWidgets() {
    return this.items.flatMap((item) => (item.kind === 'tasks' ? item.widgets.list.filter((widget) => widget.ringing) : []));
  }

  /** The note of an item, a linked Notes page's own. @param {Item} item @returns {{text: string} | null} */
  noteOf(item) {
    if (item.kind === 'notes') return item;
    if (item.kind === 'link' && this.kindOf(item) === 'notes') return getNote(item.pageId);
    return null;
  }

  /** Who has the labels of an item's tasks: the board, or a linked Tasks page. @param {Item} item @returns {LabelOwner} */
  labelOwnerOf(item) {
    return item.kind === 'link' && this.kindOf(item) === 'tasks' ? getListStore(item.pageId) : this;
  }

  /** Whether a page is linked on the board. @param {string} pageId */
  isLinked(pageId) {
    return this.items.some((item) => item.kind === 'link' && item.pageId === pageId);
  }

  /** Adds a local Tasks list, note or whiteboard in a new column at the right end. @param {ItemKind} kind */
  addItem(kind) {
    this.#pushColumn(this.#newItem(kind));
  }

  /** Adds a link to a page in a new column at the right end. @param {string} pageId */
  linkPage(pageId) {
    this.#pushColumn({ id: this.#newId(), kind: 'link', pageId });
  }

  /** An emptied name keeps the old one. A linked page is renamed itself. @param {string} id @param {string} name */
  renameItem(id, name) {
    const item = this.item(id);
    if (!item || !name.trim()) return;
    if (item.kind === 'link') pages.rename(item.pageId, name);
    else item.name = name.trim();
  }

  /** Moves a column one place to the left (-1) or right (1). @param {string} id @param {-1 | 1} step */
  moveColumn(id, step) {
    const from = this.columns.findIndex((column) => column.id === id);
    if (from !== -1) this.moveColumnTo(id, from + step);
  }

  /** Moves a column to `index` of the row, counted without it. @param {string} id @param {number} index */
  moveColumnTo(id, index) {
    const from = this.columns.findIndex((column) => column.id === id);
    if (from === -1 || from === index || index < 0 || index >= this.columns.length) return;
    const column = this.columns[from];
    this.columns = this.columns.toSpliced(from, 1).toSpliced(index, 0, column);
  }

  /**
   * Moves an item into another column's stack or into a new column of its own (see ItemTarget). A column left
   * without items goes away.
   * @param {string} id @param {ItemTarget} target
   */
  moveItem(id, target) {
    const from = this.columnOf(id);
    const item = from?.items.find((each) => each.id === id);
    if (!from || !item) return;

    if ('column' in target) {
      const to = this.column(target.column);
      if (!to) return;
      from.items = from.items.filter((each) => each !== item);
      to.items = to.items.toSpliced(Math.min(target.index, to.items.length), 0, item);
    } else {
      // Already alone in its column, right there.
      const fromIndex = this.columns.indexOf(from);
      if (from.items.length === 1 && (target.at === fromIndex || target.at === fromIndex + 1)) return;
      from.items = from.items.filter((each) => each !== item);
      const columnId = uniqueId((other) => this.columns.some((column) => column.id === other || column.items.some((each) => each.id === other)) || other === item.id);
      this.columns = this.columns.toSpliced(target.at, 0, { id: columnId, items: [item] });
    }
    this.columns = this.columns.filter((column) => column.items.length > 0);
  }

  /** Moves an item one place up (-1) or down (1) in its column. @param {string} id @param {-1 | 1} step */
  moveItemInColumn(id, step) {
    const column = this.columnOf(id);
    if (!column) return;
    const from = column.items.findIndex((item) => item.id === id);
    const to = from + step;
    if (to < 0 || to >= column.items.length) return;
    column.items = column.items.toSpliced(from, 1).toSpliced(to, 0, column.items[from]);
  }

  /** Deletes a local item with its content, or takes a link off the board (the page stays). @param {string} id */
  removeItem(id) {
    const item = this.item(id);
    if (item?.kind === 'tasks') item.widgets.destroy();
    if (item?.kind === 'whiteboard') deleteDrawing(itemDrawingId(this.#pageId, item.id));
    for (const column of this.columns) column.items = column.items.filter((each) => each.id !== id);
    this.columns = this.columns.filter((column) => column.items.length > 0);
  }

  /**
   * Turns a local item into a page of its own, with its tasks and their labels and its widgets, its note or its
   * drawing, with its settings. The item then links to the new page.
   * @param {string} id
   * @param {Record<string, any>} boardOptions the board's, for an item with the board's colors
   * @returns {Page | null} the new page
   */
  exportItem(id, boardOptions) {
    const column = this.columnOf(id);
    const index = column?.items.findIndex((item) => item.id === id) ?? -1;
    const item = column?.items[index];
    if (!column || !item || item.kind === 'link') return null;

    const type = TYPES[item.kind];
    const colors = item.options.own ? item.options.colors : boardOptions.colors;
    /** @type {Record<string, any>} */
    const options = { ...type.defaultOptions(), ...(colors ? { colors } : {}) };
    if (item.kind === 'tasks') options.widgets = this.widgetsEnabled(item);
    const page = pages.create({ type: type.type, name: item.name, options });
    if (item.kind === 'tasks') {
      const store = getListStore(page.id);
      store.restore($state.snapshot(item.list.toSaved()));
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local lookup, not state
      const used = new Set(item.list.allTasks().flatMap((task) => task.labels ?? []));
      store.labels = $state.snapshot(this.labels.filter((label) => used.has(label.id)));
      // Docked on the new page, like widgets added there.
      store.widgets.list = $state.snapshot(item.widgets.list).map((widget) => ({ ...widget, pos: null }));
      item.widgets.destroy();
    } else if (item.kind === 'whiteboard') {
      const drawingId = itemDrawingId(this.#pageId, item.id);
      saveDrawing(page.id, loadDrawing(drawingId));
      deleteDrawing(drawingId);
    } else {
      getNote(page.id).text = item.text;
    }

    column.items[index] = { id: item.id, kind: 'link', pageId: page.id };
    return page;
  }

  /**
   * Takes a task out of one item for another. Into another page it gets an id free there, and that page's labels
   * of the same name (added if missing).
   * @param {string} id @param {Item} fromItem @param {Item} toItem
   * @returns {TaskItem | null}
   */
  #carry(id, fromItem, toItem) {
    const from = this.listOf(fromItem);
    const to = this.listOf(toItem);
    // The task's widgets go along. Taken first: taking the task out of its list deletes them there.
    const fromWidgets = this.widgetsOf(fromItem);
    const toWidgets = this.widgetsOf(toItem);
    const widgets = fromWidgets && fromWidgets !== toWidgets ? $state.snapshot(fromWidgets.ofTask(id)) : [];
    let task = from && to ? from.take(id) : null;
    if (!to || !task) return null;

    const fromOwner = this.labelOwnerOf(fromItem);
    const toOwner = this.labelOwnerOf(toItem);
    if (fromOwner !== toOwner) {
      const isTaken = toOwner === this ? this.#isTaken : (/** @type {string} */ other) => to.hasId(other);
      if (isTaken(task.id)) task = { ...task, id: uniqueId(isTaken) };
      const labels = fromOwner.labelsOf(task).map((label) => {
        const same = toOwner.labels.find((other) => other.name.toLowerCase() === label.name.toLowerCase());
        return (same ?? toOwner.addLabel(label.name, label.color, label.icon ?? 'label')).id;
      });
      task = { ...task, labels };
    }

    if (toWidgets) {
      for (const widget of widgets) {
        const widgetId = uniqueId((other) => Boolean(toWidgets.get(other)));
        toWidgets.list.push({ ...widget, id: widgetId, taskId: task.id });
      }
    }
    return task;
  }

  /**
   * Moves a task to `index` of an item's list, from anywhere on the board. Within one list it's the same as
   * dragging on a Tasks page. The list then is in its custom order.
   * @param {string} id
   * @param {string} fromId item the task is in
   * @param {TaskSource} source where it is in that item
   * @param {string} toId
   * @param {number} index in the target list, counted without the task
   */
  moveTask(id, fromId, source, toId, index) {
    const fromItem = this.item(fromId);
    const toItem = this.item(toId);
    const from = this.listOf(fromItem);
    const to = this.listOf(toItem);
    if (!fromItem || !toItem || !from || !to) return;

    if (from === to) {
      if (source === 'current') from.insertCurrent(index);
      else if (source === 'history') from.insertFromHistory(id, index);
      else if (from.moveTask(id, index)) from.saveCustomOrder();
      return;
    }

    const task = this.#carry(id, fromItem, toItem);
    if (task) to.insert(task, index);
  }

  /**
   * Makes a task the current task of an item, from anywhere on the board. The list keeps its sorting.
   * @param {string} id @param {string} fromId @param {TaskSource} source @param {string} toId
   */
  selectTask(id, fromId, source, toId) {
    const fromItem = this.item(fromId);
    const toItem = this.item(toId);
    const to = this.listOf(toItem);
    if (!fromItem || !toItem || !to) return;
    if (fromId !== toId) {
      const task = this.#carry(id, fromItem, toItem);
      if (!task) return;
      to.adopt(task);
      id = task.id;
    } else if (source === 'history') {
      to.returnFromHistory(id);
    } else if (source === 'current') {
      return;
    }
    to.selectTask(id);
  }

  /** @param {string} name @param {string} color @param {string} icon */
  addLabel(name, color, icon) {
    return addLabelTo(this.labels, name, color, icon);
  }

  /** Deletes a label, also from every local task tagged with it. @param {string} id */
  removeLabel(id) {
    this.labels = this.labels.filter((label) => label.id !== id);
    untagLabel(this.items.flatMap((item) => (item.kind === 'tasks' ? item.list.allTasks() : [])), id);
  }

  /** @param {TaskItem} task */
  labelsOf(task) {
    return labelsOfTask(this.labels, task);
  }
}

/** @type {Map<string, BoardStore>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache, the stores themselves are reactive
const stores = new Map();

/**
 * The loaded store of a page, created on first use. With `page` its widgets follow the board's settings.
 * @param {string} pageId @param {Page} [page]
 */
export function getBoardStore(pageId, page) {
  let store = stores.get(pageId);
  if (!store) {
    store = new BoardStore(pageId, page);
    store.load();
    stores.set(pageId, store);
  } else if (page) {
    store.setPage(page);
  }
  return store;
}

/** The store of a page if it's loaded, without loading it. @param {string} pageId */
export function findBoardStore(pageId) {
  return stores.get(pageId);
}

/** @param {string} pageId */
export function deleteBoardStore(pageId) {
  (stores.get(pageId) ?? new BoardStore(pageId)).destroy();
  stores.delete(pageId);
}
