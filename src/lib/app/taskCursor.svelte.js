// src/lib/app/taskCursor.svelte.js
// The task keyboard shortcuts act on, like Trello's: the task under the mouse, or the one picked with the keys
// (shown with an outline, on a board or the dashboard its page too, in the page's wave color). There the keys also
// stop on pages without tasks (`data-list-kind`): opening one writes in the note, draws, or opens the page. Tasks and their lists are found in the page by attributes, in the order they're shown:
// a list is `[data-task-list="<key>"]` (a Tasks page, a board's column), its tasks `[data-cursor-task="<id>"]`
// (the current task first). Lists stacked in a board's column (`[data-cursor-column]`) are one column for the keys:
// up and down go on into the list above or below, left and right to the next column. The page that shows them does
// the changes (`TaskOps`).

import { shortcuts } from './shortcuts.svelte.js';

/**
 * What a page does to its tasks. `list` is a list's key, `id` a task's. Missing ones aren't possible there.
 * `completeCurrent` makes the next task the current one when there is none.
 * @typedef {{
 *   open: (list: string, id: string) => void,
 *   select: (list: string, id: string) => void,
 *   complete: (list: string, id: string) => void,
 *   completeCurrent: (list: string) => void,
 *   move: (list: string, id: string, by: number) => void,
 *   addTask: (list: string) => void,
 *   moveToList?: (list: string, id: string, toList: string) => {list: string, id: string} | null,
 *   openList?: (list: string) => void
 * }} TaskOps
 */

/** @param {string} key */
const listElement = (key) => document.querySelector(`[data-task-list="${CSS.escape(key)}"]`);

/** What a list is: `tasks`, or on a board `notes` or `whiteboard`. @param {string} key */
const kindOf = (key) => /** @type {HTMLElement | null} */ (listElement(key))?.dataset.listKind ?? 'tasks';

/** Every list shown, left to right. */
const listKeys = () => [...document.querySelectorAll('[data-task-list]')].map((element) => /** @type {HTMLElement} */ (element).dataset.taskList ?? '');

/** The tasks of a list, top to bottom. @param {string} key @returns {string[]} */
function taskIds(key) {
  const list = listElement(key);
  if (!list) return [];
  return [...list.querySelectorAll('[data-cursor-task]')]
    .filter((element) => element.closest('[data-task-list]') === list)
    .map((element) => /** @type {HTMLElement} */ (element).dataset.cursorTask ?? '');
}

/** @param {string} list @param {string} id */
const taskElement = (list, id) => listElement(list)?.querySelector(`[data-cursor-task="${CSS.escape(id)}"]`);

/** The lists by column, left to right, each top to bottom. A list outside a column is a column of its own. */
function columns() {
  /** @type {string[][]} */
  const result = [];
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- built fresh each time, not state
  const byColumn = new Map();
  for (const key of listKeys()) {
    const column = listElement(key)?.closest('[data-cursor-column]');
    const keys = column && byColumn.get(column);
    if (keys) keys.push(key);
    else {
      result.push([key]);
      if (column) byColumn.set(column, result.at(-1));
    }
  }
  return result;
}

/** The middle of an element from the top of the window. @param {Element | null | undefined} element */
const middleOf = (element) => {
  const box = element?.getBoundingClientRect();
  return box ? box.top + box.height / 2 : 0;
};

/**
 * In a column, the task (or list without tasks) nearest to the height `y`, of the lists `accepts` lets in.
 * @param {string[]} column @param {number} y @param {(list: string) => boolean} [accepts]
 * @returns {{list: string, id: string | null} | null}
 */
function nearestIn(column, y, accepts = () => true) {
  let best = null;
  let bestDistance = Infinity;
  for (const list of column.filter(accepts)) {
    const ids = taskIds(list);
    const spots = ids.length > 0 ? ids.map((id) => ({ list, id, element: taskElement(list, id) })) : [{ list, id: null, element: listElement(list) }];
    for (const spot of spots) {
      const distance = Math.abs(middleOf(spot.element) - y);
      if (distance < bestDistance) [best, bestDistance] = [{ list: spot.list, id: spot.id }, distance];
    }
  }
  return best;
}

class TaskCursor {
  /** Picked with the keys. @type {{list: string, id: string | null} | null} */
  picked = $state(null);
  /** Under the mouse. @type {{list: string, id: string} | null} */
  hovered = $state(null);
  /** The height of the task left and right started from, kept over a page without tasks (a note, a whiteboard). @type {number | null} */
  #sidewaysY = null;

  /** Starts showing the picked task and following the mouse. Called once the app runs in the browser. */
  start() {
    $effect.root(() => {
      // The picked task's outline, also on the task after it's shown again somewhere else (moved, selected).
      $effect(() => {
        const style = document.createElement('style');
        const picked = this.picked;
        if (picked) {
          const list = `[data-task-list="${CSS.escape(picked.list)}"]`;
          // On a board or the dashboard, the page the keys are in (a Tasks page is a list of its own, it has no kind).
          style.textContent = `${list}[data-list-kind] { outline: 2.5px solid var(--wave); outline-offset: 3px; }`;
          if (picked.id) {
            const task = `${list} [data-cursor-task="${CSS.escape(picked.id)}"] > *`;
            // Inside the task's edge: a list that scrolls cuts off anything outside it.
            style.textContent += `${task} { outline: 2.5px solid var(--accent); outline-offset: -2.5px; border-radius: var(--task-radius, 22px); }`;
          }
        }
        document.head.append(style);
        return () => style.remove();
      });
    });

    // Escape leaves a note written in on a board, the keys move between the pages again from there.
    window.addEventListener('keydown', (event) => {
      // Also when the editor used it (to shrink its selection): Escape always leaves.
      if (event.key !== 'Escape') return;
      const editor = /** @type {HTMLElement | null} */ (document.activeElement?.closest('[contenteditable="true"]') ?? null);
      const list = /** @type {HTMLElement | null} */ (editor?.closest('[data-list-kind="notes"]') ?? null);
      if (!editor || !list) return;
      editor.blur();
      this.picked = { list: list.dataset.taskList ?? '', id: null };
    });

    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || (event.movementX === 0 && event.movementY === 0)) return;
      const task = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest?.('[data-cursor-task]'));
      const list = /** @type {HTMLElement | null} */ (task?.closest('[data-task-list]'));
      this.hovered = task && list ? { list: list.dataset.taskList ?? '', id: task.dataset.cursorTask ?? '' } : null;
      // Moving the mouse over a task points at it instead of the picked one.
      if (this.hovered) this.picked = null;
    });
  }

  /** The task (or list without a task) the keys act on, if it's still shown. */
  target() {
    const picked = this.picked;
    if (picked && listElement(picked.list) && (!picked.id || taskElement(picked.list, picked.id))) return picked;
    const hovered = this.hovered;
    if (hovered && taskElement(hovered.list, hovered.id)) return hovered;
    return null;
  }

  /** @param {string} list @param {string | null} id */
  #pick(list, id) {
    this.picked = { list, id };
    // A button clicked before keeps the focus, Enter and Space would press it instead of acting on the task.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body && focused.matches('button, a, [role="button"]')) focused.blur();
    requestAnimationFrame(() => {
      const element = id ? taskElement(list, id) : listElement(list);
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
  }

  /**
   * Picks the task `by` steps down (up when negative) in its list. Past its ends, on into the list above or below in
   * the same column, at its first (going down) or last task.
   * @param {number} by
   */
  step(by) {
    this.#sidewaysY = null;
    const lists = listKeys();
    if (lists.length === 0) return false;
    const target = this.target();
    if (!target) {
      const ids = taskIds(lists[0]);
      return this.#pick(lists[0], (by > 0 ? ids[0] : ids.at(-1)) ?? null);
    }
    const list = target.list;
    const ids = taskIds(list);
    // A list picked without a task starts at its end, one without tasks is left at once.
    const next = target.id ? ids.indexOf(target.id) + by : by > 0 ? 0 : ids.length - 1;
    if (next >= 0 && next < ids.length) return this.#pick(list, ids[next]);

    const column = columns().find((keys) => keys.includes(list)) ?? [list];
    const to = column[column.indexOf(list) + Math.sign(by)];
    if (to === undefined) return;
    const toIds = taskIds(to);
    this.#pick(to, (by > 0 ? toIds[0] : toIds.at(-1)) ?? null);
  }

  /** Picks the task at the same height in the column `by` steps right (left when negative). @param {number} by */
  stepList(by) {
    const all = columns();
    if (all.length < 2) return false;
    const target = this.target();
    const from = target ? all.findIndex((keys) => keys.includes(target.list)) : -1;
    const to = all[from === -1 ? 0 : from + by];
    if (!to) return;
    if (!target) return this.#pick(to[0], taskIds(to[0])[0] ?? null);
    const y = target.id ? middleOf(taskElement(target.list, target.id)) : (this.#sidewaysY ?? middleOf(listElement(target.list)));
    const spot = nearestIn(to, y);
    if (spot) this.#pick(spot.list, spot.id);
    this.#sidewaysY = y;
  }

  /**
   * The task shortcuts, run with `ops`, while a page shows tasks. Returns the function that stops them.
   * @param {TaskOps} ops
   */
  register(ops) {
    /** Runs a change on the target task. @param {(list: string, id: string) => void} change */
    const onTask = (change) => () => {
      const target = this.target();
      if (!target?.id) return false;
      change(target.list, target.id);
    };

    const stop = shortcuts.register({
      nextTask: () => this.step(1),
      previousTask: () => this.step(-1),
      nextList: () => this.stepList(1),
      previousList: () => this.stepList(-1),
      newTask: () => {
        const list = this.target()?.list ?? listKeys()[0];
        if (list === undefined || kindOf(list) !== 'tasks') return false;
        ops.addTask(list);
      },
      // A task opens its popup, a page without one picked opens (on a board: a note to write, a whiteboard to draw).
      openTask: () => {
        const target = this.target();
        if (target?.id) return ops.open(target.list, target.id);
        if (!target || !ops.openList) return false;
        ops.openList(target.list);
      },
      selectTask: onTask(ops.select),
      completeCurrentTask: () => {
        const list = this.target()?.list ?? listKeys()[0];
        if (list === undefined || kindOf(list) !== 'tasks') return false;
        ops.completeCurrent(list);
      },
      completeTask: onTask((list, id) => {
        // The cursor goes on to the task after it.
        const ids = taskIds(list);
        const index = ids.indexOf(id);
        const next = ids[index + 1] ?? ids[index - 1] ?? null;
        ops.complete(list, id);
        if (this.picked) this.#pick(list, next === id ? null : next);
      }),
      moveTaskUp: onTask((list, id) => ops.move(list, id, -1)),
      moveTaskDown: onTask((list, id) => ops.move(list, id, 1)),
      moveTaskLeft: () => this.#moveToList(ops, -1),
      moveTaskRight: () => this.#moveToList(ops, 1)
    });
    return () => {
      stop();
      this.picked = null;
      this.hovered = null;
    };
  }

  /** @param {TaskOps} ops @param {number} by */
  #moveToList(ops, by) {
    const target = this.target();
    if (!ops.moveToList || !target?.id) return false;
    // To the task list nearest in the next column, over columns of only notes and whiteboards.
    const all = columns();
    const y = middleOf(taskElement(target.list, target.id));
    const isTasks = (/** @type {string} */ list) => kindOf(list) === 'tasks';
    let index = all.findIndex((keys) => keys.includes(target.list)) + by;
    while (all[index] && !all[index].some(isTasks)) index += by;
    const to = all[index] && nearestIn(all[index], y, isTasks)?.list;
    if (to === undefined) return;
    const moved = ops.moveToList(target.list, target.id, to);
    // It stays picked where it went, so it can be moved on.
    if (moved) this.#pick(moved.list, moved.id);
  }
}

export const taskCursor = new TaskCursor();
