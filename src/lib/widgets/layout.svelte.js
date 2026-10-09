// src/lib/widgets/layout.svelte.js
// Screen layout + drag state shared between the widget dock and the side layer.
// There is only one screen, so this is shared by all pages.

/** Width of the centered task column (page max-width + padding). */
export const COLUMN_WIDTH = 620;
/** Width of a widget placed beside the task column. */
export const SIDE_WIDTH = 230;
/** Gap between side widgets and the screen edge / task column. */
export const SIDE_MARGIN = 24;
/** Space kept free at the top of the screen for the menu button. */
export const TOP_RESERVED = 80;
/** Space kept free at the bottom of the screen for the task input. */
export const BOTTOM_RESERVED = 180;

class WidgetLayout {
  width = $state(0);
  height = $state(0);

  /** @type {{id: string, x: number, y: number, ratioX: number, offsetY: number, startWidth: number, startHeight: number} | null} */
  drag = $state(null);
  /** @type {import('./store.svelte.js').WidgetStore | null} */
  #store = null;

  /** Left edge of the task column. */
  columnLeft = $derived(Math.max(0, (this.width - COLUMN_WIDTH) / 2));
  /** True when there is room for widgets left and right of the task column. */
  sideFits = $derived(this.columnLeft >= SIDE_WIDTH + SIDE_MARGIN * 2);

  /** @param {any} widget */
  isDocked(widget) {
    return !widget.pos || !this.sideFits;
  }

  /**
   * Position of a side widget in px, clamped to the available side space.
   * @param {{side: 'left' | 'right', dx: number, y: number}} pos
   * @param {number} height
   */
  sidePosition(pos, height = 0) {
    const maxDx = this.columnLeft - SIDE_WIDTH - SIDE_MARGIN * 2;
    const dx = Math.min(Math.max(0, pos.dx), Math.max(0, maxDx));
    const maxY = Math.max(TOP_RESERVED, this.height - BOTTOM_RESERVED - height);
    const top = Math.min(Math.max(TOP_RESERVED, pos.y), maxY);

    const left = pos.side === 'left'
      ? this.columnLeft - SIDE_MARGIN - dx - SIDE_WIDTH
      : this.width - this.columnLeft + SIDE_MARGIN + dx;

    return { left, top };
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

    const { x, y } = drag;
    const onLeft = x < this.columnLeft;
    const onRight = x > this.width - this.columnLeft;

    if (this.sideFits && (onLeft || onRight)) {
      const { left, top } = this.ghostPosition(drag);
      const dx = onLeft
        ? this.columnLeft - SIDE_MARGIN - SIDE_WIDTH - left
        : left - (this.width - this.columnLeft + SIDE_MARGIN);

      widget.pos = { side: onLeft ? 'left' : 'right', dx: Math.max(0, dx), y: top };
      return;
    }

    this.#dropInDock(store, widget, y);
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
