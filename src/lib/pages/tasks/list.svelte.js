// src/lib/pages/tasks/list.svelte.js
// State of one Tasks page: its tasks, the current task, the history, sorting and its widgets.
// Lives outside the page component so it keeps running (timers, alarms) while another page is shown
// and so other views, like the dashboard, can read it.

import { untrack } from 'svelte';
import { WidgetStore } from '../../widgets/store.svelte.js';
import { playComplete } from '../../utils/sounds.js';
import { loadJSON, saveJSON } from '../../utils/storage.js';
import { uniqueId } from '../../utils/id.js';

/** @typedef {{id: string, text: string, createdAt: number, completedAt?: number}} TaskItem */
/** @typedef {'custom' | 'alphanumeric' | 'random'} SortMode */

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

  hasTasks = $derived(this.tasks.length > 0 || this.currentTask !== null);

  #pageId;
  /** @type {(() => void) | undefined} */
  #stopEffects;

  /** @param {string} pageId */
  constructor(pageId) {
    this.#pageId = pageId;
    this.widgets = new WidgetStore(widgetsKey(pageId));
  }

  load() {
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

    const mode = saved.sortMode;
    this.sortMode = mode === 'alphanumeric' || mode === 'random' ? mode : 'custom';

    // Without a saved custom order fall back to the order the tasks were added.
    const allTasks = this.currentTask ? [...this.tasks, this.currentTask] : this.tasks;
    this.customOrder = saved.customOrder ?? allTasks.toSorted((a, b) => a.createdAt - b.createdAt).map((task) => task.id);
    for (const task of allTasks) {
      if (!this.customOrder.includes(task.id)) this.customOrder.push(task.id);
    }

    this.widgets.load();

    this.#stopEffects?.();
    this.#stopEffects = $effect.root(() => {
      $effect(() => {
        saveJSON(listKey(this.#pageId), {
          tasks: this.tasks,
          currentTask: this.currentTask,
          history: this.history,
          customOrder: this.customOrder,
          sortMode: this.sortMode
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

  /** @param {string} text */
  addTask(text) {
    const task = { id: uniqueId(this.#isTaken), text, createdAt: Date.now() };
    this.tasks = [...this.tasks, task];
    this.customOrder = [...this.customOrder, task.id];
  }

  /** Puts a task back into the list at the spot matching the current sort mode. @param {TaskItem} task */
  returnToList(task) {
    let index;
    if (this.sortMode === 'alphanumeric') {
      index = this.tasks.findIndex((other) => compareAlphanumeric(task, other) < 0);
    } else if (this.sortMode === 'random') {
      index = Math.floor(Math.random() * (this.tasks.length + 1));
    } else {
      index = this.tasks.findIndex((other) => this.#customIndex(other) > this.#customIndex(task));
    }

    if (index === -1) index = this.tasks.length;
    this.tasks = this.tasks.toSpliced(index, 0, task);
  }

  /** @param {'alphanumeric' | 'random'} mode */
  sortTasks(mode) {
    this.sortMode = mode;
    this.tasks = mode === 'alphanumeric' ? this.tasks.toSorted(compareAlphanumeric) : shuffle(this.tasks);
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

/** The loaded store of a page, created on first use. @param {string} pageId */
export function getListStore(pageId) {
  let store = stores.get(pageId);
  if (!store) {
    store = new ListStore(pageId);
    store.load();
    stores.set(pageId, store);
  }
  return store;
}

/** @param {string} pageId */
export function deleteListStore(pageId) {
  (stores.get(pageId) ?? new ListStore(pageId)).destroy();
  stores.delete(pageId);
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
    // The old keys are kept as a backup, they are only read while no page exists yet.
    return true;
  } catch {
    return false;
  }
}
