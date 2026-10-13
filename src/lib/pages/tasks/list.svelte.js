// src/lib/pages/tasks/list.svelte.js
// State of one Tasks page: its tasks, the current task, the history, sorting and its widgets.
// Lives outside the page component so it keeps running (timers, alarms) while another page is shown
// and so other views, like the dashboard, can read it.

import { untrack } from 'svelte';
import { WidgetStore } from '../../widgets/store.svelte.js';
import { playComplete } from '../../utils/sounds.js';
import { loadJSON, saveJSON } from '../../utils/storage.js';
import { uniqueId } from '../../utils/id.js';
import { withGameJamIcons } from '../../icons.js';

/**
 * `description`, `priority` and `labels` (ids of the page's labels) are set in the task popup of advanced tasks.
 * @typedef {{id: string, text: string, createdAt: number, completedAt?: number, description?: string, priority?: Priority, labels?: string[]}} TaskItem
 */
/** @typedef {'critical' | 'important' | 'medium' | 'nice'} Priority */
/**
 * A label of the page, tasks can be tagged with it. `color` is a palette key (`red` for `--red`, ...), `icon` one of
 * LABEL_ICONS (missing on labels from before they had one: `label`).
 * @typedef {{id: string, name: string, color: string, icon?: string}} Label
 */

/** The priorities, most urgent first, in their colors. */
export const PRIORITIES = /** @type {const} */ ([
  { key: 'critical', label: 'Critical', color: 'red' },
  { key: 'important', label: 'Important', color: 'orange' },
  { key: 'medium', label: 'Medium', color: 'blue' },
  { key: 'nice', label: 'Nice to have', color: 'green' }
]);

/** Colors a label can have, from the palette in global.css. */
export const LABEL_COLORS = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];

/** Icons a label can have, Material Symbols names: general ones, then game jam ones. `label` is the default. */
export const LABEL_ICONS = withGameJamIcons([
  'label', 'bookmark', 'star', 'favorite', 'bolt', 'warning', 'bug_report', 'build',
  'code', 'design_services', 'description', 'science', 'lightbulb', 'rocket_launch', 'schedule', 'event',
  'group', 'person', 'mail', 'call', 'payments', 'shopping_cart', 'home', 'work'
]);

/** @param {Label} label */
export const labelIcon = (label) => label.icon ?? 'label';

/** @param {Priority | undefined} key */
export const priorityOf = (key) => PRIORITIES.find((priority) => priority.key === key) ?? null;

/** 0 for the most urgent priority, tasks without one after all others. @param {TaskItem} task */
function priorityRank(task) {
  const index = PRIORITIES.findIndex((priority) => priority.key === task.priority);
  return index === -1 ? PRIORITIES.length : index;
}

/**
 * The first line of a description as plain text, shown under the task: Markdown signs, task boxes and link
 * addresses left out.
 * @param {string | undefined} description
 */
export function descriptionPreview(description) {
  let inCode = false;
  const line = (description ?? '').split('\n').find((text) => {
    if (/^\s*(```|~~~)/.test(text)) {
      inCode = !inCode;
      return false;
    }
    return !inCode && text.trim() !== '' && !/^\s*-{3,}\s*$/.test(text);
  }) ?? '';
  return line
    .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|\*|_|`)/g, '')
    .trim();
}

/** Advanced tasks: the edit button opens the task popup (description, priority, labels). @param {Record<string, any>} options */
export const advancedTasks = (options) => options.advanced === true;
/** `priority`: most urgent first (advanced tasks), the custom order within a priority. @typedef {'custom' | 'alphanumeric' | 'random' | 'priority'} SortMode */

/** @param {string} pageId */
const listKey = (pageId) => `otl_list_${pageId}`;
/** @param {string} pageId */
const widgetsKey = (pageId) => `otl_widgets_${pageId}`;

/** @param {TaskItem} a @param {TaskItem} b */
function compareAlphanumeric(a, b) {
  return a.text.localeCompare(b.text, undefined, { numeric: true, sensitivity: 'base' });
}

/** @template T @param {T[]} list */
function shuffle(list) {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** @param {TaskItem} task */
export function withoutCompletion(task) {
  // eslint-disable-next-line no-unused-vars
  const { completedAt, ...rest } = task;
  return rest;
}

export class ListStore {
  /** @type {TaskItem[]} */
  tasks = $state([]);
  /** @type {TaskItem | null} */
  currentTask = $state(null);
  /** Completed tasks, newest first. @type {TaskItem[]} */
  history = $state([]);
  /** Task ids in the user's own order: the order added, until a task is dragged. @type {string[]} */
  customOrder = $state([]);
  /** @type {SortMode} */
  sortMode = $state('custom');
  /** The page's labels, for advanced tasks. @type {Label[]} */
  labels = $state([]);

  hasTasks = $derived(this.tasks.length > 0 || this.currentTask !== null);

  #pageId;
  /** @type {(() => void) | undefined} */
  #stopEffects;

  /** @param {string} pageId */
  constructor(pageId) {
    this.#pageId = pageId;
    this.widgets = new WidgetStore(widgetsKey(pageId));
  }

  /** @param {{widgetsEnabled?: boolean}} [options] */
  load({ widgetsEnabled = true } = {}) {
    const saved = loadJSON(listKey(this.#pageId), /** @type {any} */ ({}));

    // Older saves have no createdAt, keep their stored order.
    const now = Date.now();
    this.tasks = (saved.tasks ?? []).map((/** @type {TaskItem} */ task, /** @type {number} */ index, /** @type {TaskItem[]} */ list) => ({
      ...task,
      createdAt: task.createdAt ?? now - (list.length - index)
    }));

    this.currentTask = saved.currentTask ?? null;
    if (this.currentTask && this.currentTask.createdAt === undefined) this.currentTask.createdAt = now;

    this.history = saved.history ?? [];
    this.labels = Array.isArray(saved.labels) ? saved.labels : [];

    const mode = saved.sortMode;
    this.sortMode = mode === 'alphanumeric' || mode === 'random' || mode === 'priority' ? mode : 'custom';

    // Without a saved custom order fall back to the order the tasks were added.
    const allTasks = this.currentTask ? [...this.tasks, this.currentTask] : this.tasks;
    this.customOrder = saved.customOrder ?? allTasks.toSorted((a, b) => a.createdAt - b.createdAt).map((task) => task.id);
    for (const task of allTasks) {
      if (!this.customOrder.includes(task.id)) this.customOrder.push(task.id);
    }

    this.widgets.load({ suspended: !widgetsEnabled });

    this.#stopEffects?.();
    this.#stopEffects = $effect.root(() => {
      $effect(() => {
        saveJSON(listKey(this.#pageId), {
          tasks: this.tasks,
          currentTask: this.currentTask,
          history: this.history,
          customOrder: this.customOrder,
          sortMode: this.sortMode,
          labels: this.labels
        });
      });

      // Reset all widgets once the list is empty.
      $effect(() => {
        if (!this.hasTasks) untrack(() => this.widgets.resetAll());
      });
    });
  }

  /** Stops the store and deletes everything it saved. */
  destroy() {
    this.#stopEffects?.();
    this.widgets.destroy();
    localStorage.removeItem(listKey(this.#pageId));
  }

  /** @param {string} id */
  #isTaken = (id) =>
    this.tasks.some((task) => task.id === id) || this.currentTask?.id === id || this.history.some((task) => task.id === id);

  /** @param {TaskItem} task */
  #customIndex(task) {
    const index = this.customOrder.indexOf(task.id);
    return index === -1 ? Infinity : index;
  }

  /** A task in the list, the current one or one in the history. @param {string} id */
  findTask(id) {
    if (this.currentTask?.id === id) return this.currentTask;
    return this.tasks.find((task) => task.id === id) ?? this.history.find((task) => task.id === id) ?? null;
  }

  /** @param {string} name @param {string} color @param {string} icon @returns {Label} */
  addLabel(name, color, icon) {
    const label = { id: uniqueId((id) => this.labels.some((item) => item.id === id)), name, color, icon };
    this.labels.push(label);
    return /** @type {Label} */ (this.labels.at(-1));
  }

  /** Deletes a label, also from every task tagged with it. @param {string} id */
  removeLabel(id) {
    this.labels = this.labels.filter((label) => label.id !== id);
    for (const task of [...this.tasks, ...this.history, ...(this.currentTask ? [this.currentTask] : [])]) {
      if (task.labels?.includes(id)) task.labels = task.labels.filter((labelId) => labelId !== id);
    }
  }

  /** The labels of a task, in the page's order. @param {TaskItem} task */
  labelsOf(task) {
    return task.labels?.length ? this.labels.filter((label) => task.labels?.includes(label.id)) : [];
  }

  /** @param {string} text */
  addTask(text) {
    const task = { id: uniqueId(this.#isTaken), text, createdAt: Date.now() };
    this.tasks = [...this.tasks, task];
    this.customOrder = [...this.customOrder, task.id];
  }

  /** Most urgent first, tasks without a priority last. The custom order within a priority. @param {TaskItem} a @param {TaskItem} b */
  #comparePriority = (a, b) => priorityRank(a) - priorityRank(b) || this.#customIndex(a) - this.#customIndex(b);

  /** Puts a task back into the list at the spot matching the current sort mode. @param {TaskItem} task */
  returnToList(task) {
    let index;
    if (this.sortMode === 'priority') {
      index = this.tasks.findIndex((other) => this.#comparePriority(task, other) < 0);
    } else if (this.sortMode === 'alphanumeric') {
      index = this.tasks.findIndex((other) => compareAlphanumeric(task, other) < 0);
    } else if (this.sortMode === 'random') {
      index = Math.floor(Math.random() * (this.tasks.length + 1));
    } else {
      index = this.tasks.findIndex((other) => this.#customIndex(other) > this.#customIndex(task));
    }

    if (index === -1) index = this.tasks.length;
    this.tasks = this.tasks.toSpliced(index, 0, task);
  }

  /** @param {'alphanumeric' | 'random' | 'priority'} mode */
  sortTasks(mode) {
    this.sortMode = mode;
    if (mode === 'priority') this.tasks = this.tasks.toSorted(this.#comparePriority);
    else if (mode === 'alphanumeric') this.tasks = this.tasks.toSorted(compareAlphanumeric);
    else this.tasks = shuffle(this.tasks);
  }

  restoreCustomOrder() {
    this.sortMode = 'custom';
    this.tasks = this.tasks.toSorted((a, b) => this.#customIndex(a) - this.#customIndex(b));
  }

  /** The current list order becomes the new custom order. */
  saveCustomOrder() {
    const order = this.tasks.map((task) => task.id);

    if (this.currentTask) {
      const oldIndex = this.customOrder.indexOf(this.currentTask.id);
      order.splice(oldIndex === -1 ? 0 : Math.min(oldIndex, order.length), 0, this.currentTask.id);
    }

    this.customOrder = order;
    this.sortMode = 'custom';
  }

  /** @param {string} id @param {number} index */
  moveTask(id, index) {
    const from = this.tasks.findIndex((task) => task.id === id);
    if (from === -1 || from === index) return false;

    const dragged = this.tasks[from];
    this.tasks = this.tasks.toSpliced(from, 1).toSpliced(index, 0, dragged);
    return true;
  }

  /** Moves a completed task back into the list at `index`. @param {string} id @param {number} index */
  insertFromHistory(id, index) {
    const task = this.history.find((item) => item.id === id);
    if (!task) return;

    this.history = this.history.filter((item) => item.id !== id);
    this.tasks = this.tasks.toSpliced(index, 0, withoutCompletion(task));
    this.saveCustomOrder();
  }

  /** Moves the current task back into the list at `index`. @param {number} index */
  insertCurrent(index) {
    const task = this.currentTask;
    if (!task) return;

    this.currentTask = null;
    this.tasks = this.tasks.toSpliced(index, 0, task);
    this.saveCustomOrder();
  }

  /** @param {string} id */
  returnFromHistory(id) {
    const task = this.history.find((item) => item.id === id);
    if (!task) return;

    this.history = this.history.filter((item) => item.id !== id);
    this.returnToList(withoutCompletion(task));
  }

  /** @param {string} id @param {string} text */
  editHistory(id, text) {
    const task = this.history.find((item) => item.id === id);
    if (task) task.text = text;
  }

  /** @param {string} id */
  deleteFromHistory(id) {
    this.history = this.history.filter((item) => item.id !== id);
    this.customOrder = this.customOrder.filter((taskId) => taskId !== id);
  }

  clearHistory() {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local lookup, not state
    const ids = new Set(this.history.map((item) => item.id));
    this.customOrder = this.customOrder.filter((taskId) => !ids.has(taskId));
    this.history = [];
  }

  /** @param {string} id @param {string} text */
  editTask(id, text) {
    const task = this.currentTask?.id === id ? this.currentTask : this.tasks.find((item) => item.id === id);
    if (task) task.text = text;
  }

  /** @param {string} id */
  removeTask(id) {
    this.customOrder = this.customOrder.filter((taskId) => taskId !== id);

    if (id === this.currentTask?.id) {
      this.currentTask = null;
    } else {
      this.tasks = this.tasks.filter((task) => task.id !== id);
    }
  }

  /** @param {string} id */
  selectTask(id) {
    if (this.currentTask) this.returnToList(this.currentTask);

    const task = this.tasks.find((item) => item.id === id);
    if (task) {
      this.currentTask = task;
      this.tasks = this.tasks.filter((item) => item.id !== id);
      this.widgets.taskSelected();
    }
  }

  /** @param {string} id */
  completeTask(id) {
    const task = this.currentTask?.id === id ? this.currentTask : this.tasks.find((item) => item.id === id);
    if (!task) return;

    // Keep the id in the custom order so returning the task puts it back in its old spot.
    this.history = [{ ...task, completedAt: Date.now() }, ...this.history];
    if (task === this.currentTask) {
      this.currentTask = null;
    } else {
      this.tasks = this.tasks.filter((item) => item.id !== id);
    }

    playComplete();
    this.widgets.taskCompleted();
  }

  unselectTask() {
    if (this.currentTask) {
      this.returnToList(this.currentTask);
      this.currentTask = null;
    }
  }
}

/** @type {Map<string, ListStore>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache, the stores themselves are reactive
const stores = new Map();

/** Widgets are on unless the page turned them off. @param {Record<string, any>} options */
export const widgetsEnabled = (options) => options.widgets !== false;

/** Stops following a page's widget option, per page id. @type {Map<string, () => void>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping, not state
const optionWatchers = new Map();

/**
 * The loaded store of a page, created on first use. With `page`, its widgets follow the page's "Widgets"
 * option: turned off they are kept but don't tick, so nothing rings in the background.
 * @param {string} pageId
 * @param {import('../types.js').Page} [page]
 */
export function getListStore(pageId, page) {
  let store = stores.get(pageId);
  if (!store) {
    store = new ListStore(pageId);
    // Already turned off while loading, so a timer that ended while the app was closed doesn't ring.
    store.load({ widgetsEnabled: page ? widgetsEnabled(page.options) : true });
    stores.set(pageId, store);
  }
  if (page && !optionWatchers.has(pageId)) {
    const widgets = store.widgets;
    optionWatchers.set(pageId, $effect.root(() => {
      $effect(() => {
        const enabled = widgetsEnabled(page.options);
        // Only the option is followed, not the widgets that suspending or resuming touches.
        untrack(() => widgets.setEnabled(enabled));
      });
    }));
  }
  return store;
}

/** The store of a page if it's loaded, without loading it. @param {string} pageId */
export function findListStore(pageId) {
  return stores.get(pageId);
}

/** @param {string} pageId */
export function deleteListStore(pageId) {
  optionWatchers.get(pageId)?.();
  optionWatchers.delete(pageId);
  (stores.get(pageId) ?? new ListStore(pageId)).destroy();
  stores.delete(pageId);
}

/**
 * Removes the data of the old single list. It's only read while no page exists, once a list page has loaded
 * it's a leftover (and the privacy policy promises that deleting a page removes its data).
 */
export function removeLegacyList() {
  try {
    for (const key of [...Object.values(LEGACY_KEYS), 'otl_sort_mode']) localStorage.removeItem(key);
  } catch {
    // Storage is blocked, nothing was saved there either.
  }
}

/** Keys used before there were multiple pages. */
const LEGACY_KEYS = {
  tasks: 'otl_tasks',
  currentTask: 'otl_current_task',
  history: 'otl_history',
  customOrder: 'otl_custom_order',
  widgets: 'otl_widgets'
};

/**
 * Moves the data of the old single list into the page `pageId`.
 * @param {string} pageId
 * @returns {boolean} true if there was old data
 */
export function importLegacyList(pageId) {
  try {
    const hasLegacy = Object.values(LEGACY_KEYS).some((key) => localStorage.getItem(key) !== null);
    if (!hasLegacy) return false;

    saveJSON(listKey(pageId), {
      tasks: loadJSON(LEGACY_KEYS.tasks, undefined),
      currentTask: loadJSON(LEGACY_KEYS.currentTask, null),
      history: loadJSON(LEGACY_KEYS.history, undefined),
      customOrder: loadJSON(LEGACY_KEYS.customOrder, undefined),
      sortMode: localStorage.getItem('otl_sort_mode') ?? undefined
    });
    saveJSON(widgetsKey(pageId), loadJSON(LEGACY_KEYS.widgets, []));
    // The old keys are removed by `removeLegacyList` once the page has loaded its copy.
    return true;
  } catch {
    return false;
  }
}
