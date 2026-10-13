// src/lib/widgets/layout.svelte.js
// Screen layout + drag state shared between the widget dock and the free widgets (side layer).
// There is only one screen, so this is shared by all pages.

/** Width of a widget placed freely on the screen. */
export const SIDE_WIDTH = 230;
/** Space kept free at the bottom of the screen for the task input. */
export const BOTTOM_RESERVED = 180;
/** Gap kept between the tasks and a widget below them. */
const TASKS_GAP = 25;
/** Closest a free widget gets to the top of the screen, and the corner kept free for the menu button. */
const TOP_GAP = 16;
const MENU_BUTTON = 80;

/**
 * Where widgets are placed (`widget.pos`):
 * - `null`: in the dock, the default.
 * - `{area: 'free', x, y}`: anywhere on the screen. `x` is its left edge from the middle of the screen (it stays
 *   beside the tasks when the window is resized), `y` its top edge. While it would cover the tasks (the column
 *   from the top down to where the tasks end) it shows in the dock instead, and comes back once there's room.
 * A docked widget keeps its `pos`, it's only the place it goes back to.
 */
class WidgetLayout {
  width = $state(0);
  height = $state(0);

  /** @type {{id: string, x: number, y: number, ratioX: number, offsetY: number, startWidth: number, startHeight: number} | null} */
  drag = $state(null);
  /** Height of the drag ghost once it has its free widget shape. */
  ghostHeight = $state(0);
  /**
   * The task column on the screen: its left and right edge and where the tasks end (all px in the window), set by
   * the Tasks page. Without one nothing can be placed over the middle of the screen.
   */
  column = $state({ left: 0, right: 0, bottom: Infinity });
  /** Last measured heights of free widgets, by id. @type {Record<string, number>} */
  heights = $state({});
  /** @type {import('./store.svelte.js').WidgetStore | null} */
  #store = null;

  /** @param {any} widget */
  isDocked(widget) {
    if (!widget.pos) return true;
    if (widget.pos.area === 'free') return this.#coversTasks(this.freePosition(widget.pos, this.heights[widget.id]));
    return true;
  }

  /**
   * Where a free widget is on the screen, kept inside the window and above the task input.
   * @param {{x: number, y: number}} pos
   * @param {number} [height]
   */
  freePosition(pos, height = 0) {
    const left = Math.min(Math.max(0, this.width / 2 + pos.x), Math.max(0, this.width - SIDE_WIDTH));
    const minTop = left < MENU_BUTTON ? MENU_BUTTON : TOP_GAP;
    const top = Math.min(Math.max(minTop, pos.y), Math.max(minTop, this.height - BOTTOM_RESERVED - height));
    return { left, top };
  }

  /**
   * Whether a widget there would cover the tasks: it's over the column and starts above where the tasks end.
   * Docked, the dock is taller by the widget, so the tasks end lower and it stays docked until there's room for
   * both: it never flickers between the two places.
   * @param {{left: number, top: number}} position
   */
  #coversTasks({ left, top }) {
    const overColumn = left < this.column.right && left + SIDE_WIDTH > this.column.left;
    return overColumn && top < this.column.bottom + TASKS_GAP;
  }

  /**
   * The spot closest to `target` that doesn't cover the tasks: left or right of the column, or below the tasks.
   * Null when none of them fits in the window.
   * @param {{left: number, top: number}} target
   * @param {number} height
   */
  #closestFree(target, height) {
    const candidates = [
      { left: this.column.left - TASKS_GAP - SIDE_WIDTH, top: target.top },
      { left: this.column.right + TASKS_GAP, top: target.top },
      { left: target.left, top: this.column.bottom + TASKS_GAP }
    ]
      .map(({ left, top }) => this.freePosition({ x: left - this.width / 2, y: top }, height))
      .filter((position) => !this.#coversTasks(position));
    const distance = (/** @type {{left: number, top: number}} */ position) =>
      Math.hypot(position.left - target.left, position.top - target.top);
    return candidates.sort((a, b) => distance(a) - distance(b))[0] ?? null;
  }

  /** Top left corner of the drag ghost. @param {NonNullable<WidgetLayout['drag']>} drag */
  ghostPosition(drag) {
    return { left: drag.x - drag.ratioX * SIDE_WIDTH, top: drag.y - drag.offsetY };
  }

  /**
   * @param {import('./store.svelte.js').WidgetStore} store the store the widget belongs to
   * @param {string} id
   * @param {{clientX: number, clientY: number}} point
   * @param {DOMRect} rect
   */
  startDrag(store, id, point, rect) {
    this.#store = store;
    this.drag = {
      id,
      x: point.clientX,
      y: point.clientY,
      ratioX: Math.min(Math.max((point.clientX - rect.left) / rect.width, 0.1), 0.9),
      offsetY: Math.min(point.clientY - rect.top, 40),
      startWidth: rect.width,
      startHeight: rect.height
    };

    window.addEventListener('pointermove', this.#move);
    window.addEventListener('pointerup', this.#drop);
    window.addEventListener('pointercancel', this.#cancel);
    navigator.vibrate?.(15);
  }

  /** @param {PointerEvent} event */
  #move = (event) => {
    if (!this.drag) return;
    this.drag.x = event.clientX;
    this.drag.y = event.clientY;
  };

  #drop = () => {
    const drag = this.drag;
    const store = this.#store;
    this.#stop();

    const widget = drag && store?.get(drag.id);
    if (!store || !widget) return;

    const { y } = drag;
    // Anywhere the widget doesn't cover the tasks it stays where it's dropped. Over the tasks it goes into the dock,
    // above the dock (beside the title, over the current task) to the closest spot that doesn't cover them.
    const ghost = this.ghostPosition(drag);
    const pos = { area: 'free', x: ghost.left - this.width / 2, y: ghost.top };
    let position = this.freePosition(pos, this.ghostHeight);
    if (this.#coversTasks(position)) {
      const dockTop = document.querySelector('[data-widget-dock]')?.getBoundingClientRect().top ?? -Infinity;
      if (y >= dockTop) {
        this.#dropInDock(store, widget, y);
        return;
      }
      const closest = this.#closestFree(ghost, this.ghostHeight);
      // Without room beside or below the tasks it stays where it was.
      if (!closest) return;
      position = closest;
    }
    // Kept as it's shown (inside the window, above the task input).
    widget.pos = { area: 'free', x: position.left - this.width / 2, y: position.top };
    this.heights[widget.id] = this.ghostHeight;
  };

  #cancel = () => this.#stop();

  #stop() {
    this.drag = null;
    this.#store = null;
    window.removeEventListener('pointermove', this.#move);
    window.removeEventListener('pointerup', this.#drop);
    window.removeEventListener('pointercancel', this.#cancel);
  }

  /**
   * Re-inserts the widget into the dock at the position closest to `y`.
   * @param {import('./store.svelte.js').WidgetStore} store
   * @param {any} widget
   * @param {number} y
   */
  #dropInDock(store, widget, y) {
    const dockedIds = [...document.querySelectorAll('[data-dock-widget]')]
      .filter((element) => element.getAttribute('data-dock-widget') !== widget.id)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2 < y;
      })
      .map((element) => element.getAttribute('data-dock-widget'));

    const without = store.list.filter((item) => item.id !== widget.id);
    const lastAbove = dockedIds.at(-1);
    const index = lastAbove ? without.findIndex((item) => item.id === lastAbove) + 1 : 0;

    widget.pos = null;
    without.splice(index, 0, widget);
    store.list = without;
  }
}

export const layout = new WidgetLayout();
