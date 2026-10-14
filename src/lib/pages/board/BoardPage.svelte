<!-- src/lib/pages/board/BoardPage.svelte -->
<!-- A board: columns side by side, each a stack of pages (items): small Tasks pages or notes, local or linked (see
     BoardItem). The pages in a column share its height (shareHeight.js). Tasks are dragged within a list and
     between lists, onto a list's current task to select it there. Pages are dragged by their head into another
     column's stack, or between columns into a column of their own. The data lives in `board.svelte.js`. -->
<script>
  import { cubicOut } from 'svelte/easing';
  import { getBoardStore } from './board.svelte.js';
  import { shareHeight } from './shareHeight.js';
  import BoardItem from './components/BoardItem.svelte';
  import AddPageMenu from './components/AddPageMenu.svelte';
  import FreeWidgets from './components/FreeWidgets.svelte';
  import Task from '../tasks/components/Task.svelte';
  import TaskDialog from '../tasks/components/TaskDialog.svelte';
  import { priorityOf } from '../tasks/list.svelte.js';
  import PageHeader from '$lib/app/PageHeader.svelte';
  import { layout, SIDE_WIDTH } from '$lib/widgets/layout.svelte.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // The page view is re-created for every page, so the store never changes.
  // svelte-ignore state_referenced_locally
  const board = getBoardStore(page.id, page);

  /** @typedef {import('./board.svelte.js').TaskSource} TaskSource */

  /**
   * A task in an item: its list and who has its labels. Task ids are only unique within a page, so a task is
   * always found with its item.
   * @param {string} itemId @param {string} taskId
   */
  function findTask(itemId, taskId) {
    const item = board.item(itemId);
    const list = board.listOf(item);
    const task = list?.findTask(taskId);
    return item && list && task ? { list, task, owner: board.labelOwnerOf(item) } : null;
  }

  /** The task open in the popup. @type {{itemId: string, taskId: string} | null} */
  let opened = $state(null);
  let openTask = $derived.by(() => (opened ? findTask(opened.itemId, opened.taskId) : null));

  /**
   * What a task shows as a card, spread on <Task>.
   * @param {import('../tasks/list.svelte.js').TaskItem} task @param {string} itemId
   */
  function taskProps(task, itemId) {
    const item = board.item(itemId);
    const widgetStore = item ? taskWidgetsOf(item) : null;
    return {
      advanced: true,
      description: task.description,
      priority: priorityOf(task.priority),
      labels: item ? board.labelOwnerOf(item).labelsOf(task) : [],
      onOpen: () => (opened = { itemId, taskId: task.id }),
      widgetStore,
      widgets: widgetStore ? widgetStore.ofTask(task.id) : []
    };
  }

  /** The widgets for an item's tasks, null while its widgets are turned off. @param {import('./board.svelte.js').Item} item */
  function taskWidgetsOf(item) {
    return board.widgetsEnabled(item) ? board.widgetsOf(item) : null;
  }

  // A widget dropped on a task of its own page (in the list or the current task) becomes that task's.
  $effect(() => {
    layout.taskAt = (store, x, y) => {
      const item = board.items.find((each) => board.widgetsOf(each) === store);
      const list = board.listOf(item ?? null);
      if (!item || !list) return null;
      const target = document.elementFromPoint(x, y)?.closest('[data-widget-task]');
      if (!target?.closest(`[data-item-id="${item.id}"]`)) return null;
      const id = target.getAttribute('data-widget-task');
      return id && (list.currentTask?.id === id || list.tasks.some((task) => task.id === id)) ? id : null;
    };
    return () => (layout.taskAt = null);
  });

  /** Closes the popup. A list sorted by priority follows a changed priority. */
  function closeTask() {
    const list = openTask?.list;
    opened = null;
    if (list?.sortMode === 'priority') list.sortTasks('priority');
  }

  /** Deletes the task open in the popup, wherever it is. */
  function deleteOpenTask() {
    if (openTask) {
      const { list, task } = openTask;
      if (list.history.includes(task)) list.deleteFromHistory(task.id);
      else list.removeTask(task.id);
    }
    opened = null;
  }

  /**
   * The dragged task: where it came from, where it would land (`target`: an item and the index in its list) or
   * the item whose current task box it's held over (`overCurrent`, dropping selects it there).
   * @type {{id: string, itemId: string, source: TaskSource, x: number, y: number, startY: number, offsetX: number, offsetY: number, width: number, height: number, target: {itemId: string, index: number} | null, overCurrent: string | null} | null}
   */
  let drag = $state(null);
  /** @type {HTMLElement | undefined} */
  let boardEl = $state();

  let draggedTask = $derived.by(() => (drag ? (findTask(drag.itemId, drag.id)?.task ?? null) : null));

  /**
   * @param {string} itemId
   * @param {string} id
   * @param {TaskSource} source
   * @param {{clientX: number, clientY: number}} point
   * @param {DOMRect} rect
   */
  function startDrag(itemId, id, source, point, rect) {
    const list = board.listOf(board.item(itemId));
    if (!list) return;
    drag = {
      id,
      itemId,
      source,
      x: point.clientX,
      y: point.clientY,
      startY: point.clientY,
      offsetX: point.clientX - rect.left,
      offsetY: point.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      // A task of the list leaves a slot where it was, so nothing jumps when the drag starts.
      target: source === 'list' ? { itemId, index: list.tasks.findIndex((task) => task.id === id) } : null,
      overCurrent: null
    };
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', cancelDrag);
    navigator.vibrate?.(15);
    requestAnimationFrame(autoScroll);
  }

  /** @param {PointerEvent} event */
  function moveDrag(event) {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    locate();
  }

  /** The item under the pointer. @returns {HTMLElement | null} */
  function itemAtPointer() {
    if (!drag || !boardEl) return null;
    for (const element of /** @type {NodeListOf<HTMLElement>} */ (boardEl.querySelectorAll('[data-item-id]'))) {
      const rect = element.getBoundingClientRect();
      if (drag.x >= rect.left && drag.x <= rect.right && drag.y >= rect.top && drag.y <= rect.bottom) return element;
    }
    return null;
  }

  // Where the dragged task would land. Between two items it keeps the last spot, over a note it lands nowhere.
  function locate() {
    if (!drag) return;
    const itemEl = itemAtPointer();
    if (!itemEl) return;
    const itemId = /** @type {string} */ (itemEl.dataset.itemId);
    if (!board.listOf(board.item(itemId))) {
      setTarget(null);
      if (drag.overCurrent !== null) drag.overCurrent = null;
      return;
    }

    const current = itemEl.querySelector('[data-current-box]')?.getBoundingClientRect();
    if (current && drag.y >= current.top && drag.y <= current.bottom) {
      if (drag.overCurrent !== itemId) drag.overCurrent = itemId;
      setTarget(null);
      return;
    }
    if (drag.overCurrent !== null) drag.overCurrent = null;

    // A completed task dropped back on its own list's history stays there.
    const historyTop = itemEl.querySelector('[data-history]')?.getBoundingClientRect().top ?? Infinity;
    if (drag.source === 'history' && drag.itemId === itemId && drag.y >= historyTop) {
      setTarget(null);
      return;
    }

    // Like on a Tasks page: by the tasks' layout positions (offsets in the list), not where they're drawn, which
    // lags behind while they slide into place. The dragged task's own spot doesn't count.
    const tasksEl = itemEl.querySelector('[data-tasks]');
    if (!tasksEl) return;
    const y = drag.y - tasksEl.getBoundingClientRect().top;
    let index = 0;
    for (const element of /** @type {NodeListOf<HTMLElement>} */ (tasksEl.querySelectorAll('[data-task-id]'))) {
      if (element.dataset.taskId === drag.id) continue;
      if (element.offsetTop + element.offsetHeight / 2 < y) index++;
    }
    setTarget({ itemId, index });
  }

  /**
   * Where the dragged task would land. Only changed when it's somewhere else: the lists follow the target, a new
   * one every frame would start their sliding over and over.
   * @param {{itemId: string, index: number} | null} target
   */
  function setTarget(target) {
    if (!drag) return;
    if (target?.itemId !== drag.target?.itemId || target?.index !== drag.target?.index) drag.target = target;
  }

  // Scrolls the list under the pointer near its top or bottom (only one that has more tasks than fit), and the
  // board near its left or right edge. Like on a Tasks page a list only scrolls the way the task is dragged, so
  // picking up a task near an edge doesn't scroll.
  function autoScroll() {
    if (!drag || !boardEl) return;
    const edge = 60;
    let scrolled = false;

    const scroller = itemAtPointer()?.querySelector('[data-scroller]');
    if (scroller && scroller.scrollHeight > scroller.clientHeight) {
      const rect = scroller.getBoundingClientRect();
      const before = scroller.scrollTop;
      if (drag.y < rect.top + edge && drag.y > rect.top - edge && drag.y < drag.startY) scroller.scrollTop -= (rect.top + edge - drag.y) / 4;
      else if (drag.y > rect.bottom - edge && drag.y < rect.bottom + edge && drag.y > drag.startY) scroller.scrollTop += (drag.y - rect.bottom + edge) / 4;
      scrolled = scroller.scrollTop !== before;
    }

    const rect = boardEl.getBoundingClientRect();
    if (drag.x < rect.left + edge) boardEl.scrollLeft -= (rect.left + edge - drag.x) / 4;
    else if (drag.x > rect.right - edge) boardEl.scrollLeft += (drag.x - rect.right + edge) / 4;

    if (scrolled) locate();
    requestAnimationFrame(autoScroll);
  }

  function stopListening() {
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', cancelDrag);
  }

  function endDrag() {
    stopListening();
    if (drag?.overCurrent) board.selectTask(drag.id, drag.itemId, drag.source, drag.overCurrent);
    else if (drag?.target) board.moveTask(drag.id, drag.itemId, drag.source, drag.target.itemId, drag.target.index);
    drag = null;
  }

  function cancelDrag() {
    stopListening();
    drag = null;
  }

  /**
   * Slides a column or page from where it was to its new spot. Unlike Svelte's `flip` it never stretches it: the
   * pages of a column change height when a dragged page's spot comes or goes (shareHeight), stretched from the old
   * height they'd grow and shrink back.
   * @param {Element} node
   * @param {{from: DOMRect, to: DOMRect}} rects
   * @param {{duration?: number}} [params]
   * @returns {import('svelte/animate').AnimationConfig}
   */
  function slide(node, { from, to }, { duration = 200 } = {}) {
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    return { duration: dx || dy ? duration : 0, easing: cubicOut, css: (_, u) => `transform: translate(${u * dx}px, ${u * dy}px);` };
  }

  /** Share of a column's width at each side where a dragged page goes into a column of its own, not the stack. */
  const EDGE = 0.2;

  /**
   * The dragged page: the pointer, where on the page it was grabbed, its size and where it would land (`target`).
   * Like a card on the dashboard it's lifted out and follows the pointer anywhere, a dashed spot shows where it
   * lands.
   * @type {{id: string, x: number, y: number, grabX: number, grabY: number, width: number, height: number, target: import('./board.svelte.js').ItemTarget | null} | null}
   */
  let itemDrag = $state(null);

  /**
   * Where the pages of the column the dragged page is over were (their middles, px from the board's top) when it
   * got there. The landing spot is found with these: the spot squeezes the pages and moves them, measured again
   * every frame they'd send it back and forth.
   * @type {{column: string, middles: number[]} | null}
   */
  let stackSnapshot = null;

  /**
   * The columns as shown: while a page is dragged, with the dashed spot where it would land, in a column's stack
   * or as a column of its own (`__new`). The dragged page stays in its column (lifted, it takes no space there).
   * @typedef {{key: string, item?: import('./board.svelte.js').Item, placeholder?: boolean}} Entry
   */
  let shownColumns = $derived.by(() => {
    /** @type {{id: string, entries: Entry[]}[]} */
    const columns = board.columns.map((column) => ({ id: column.id, entries: column.items.map((item) => ({ key: item.id, item })) }));
    const target = itemDrag?.target;
    if (!itemDrag || !target) return columns;
    /** @type {Entry} */
    const spot = { key: '__spot', placeholder: true };
    if ('column' in target) {
      const column = columns.find((each) => each.id === target.column);
      if (column) {
        const others = column.entries.filter((entry) => entry.key !== itemDrag?.id);
        const before = others[target.index];
        column.entries.splice(before ? column.entries.indexOf(before) : column.entries.length, 0, spot);
      }
    } else {
      columns.splice(target.at, 0, { id: '__new', entries: [spot] });
    }
    return columns;
  });

  /**
   * @param {string} id
   * @param {{clientX: number, clientY: number}} point
   * @param {DOMRect} rect
   */
  function startItemDrag(id, point, rect) {
    const column = board.columnOf(id);
    if (!column) return;
    const index = column.items.findIndex((item) => item.id === id);
    itemDrag = {
      id,
      x: point.clientX,
      y: point.clientY,
      grabX: point.clientX - rect.left,
      grabY: point.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      // Where it is now, so nothing jumps when the drag starts.
      target: column.items.length > 1 ? { column: column.id, index } : { at: board.columns.indexOf(column) }
    };
    stackSnapshot = null;
    window.addEventListener('pointermove', moveItemDrag);
    window.addEventListener('pointerup', endItemDrag);
    window.addEventListener('pointercancel', cancelItemDrag);
    navigator.vibrate?.(15);
    requestAnimationFrame(itemDragFrame);
  }

  /** @param {PointerEvent} event */
  function moveItemDrag(event) {
    if (!itemDrag) return;
    itemDrag.x = event.clientX;
    itemDrag.y = event.clientY;
  }

  /**
   * Where the dragged page would land, by the layout positions of the columns and their pages (offsets in the
   * board), not where they're drawn while sliding. Sideways it goes by the middle of the dragged page, not the
   * pointer: a page is held by its name, near its left edge. With its middle over the middle of a column: into
   * its stack, before the first page whose middle is below the pointer. Near a column's sides, between columns
   * or past them: a new column.
   * @returns {import('./board.svelte.js').ItemTarget | null}
   */
  function locateItem() {
    if (!itemDrag || !boardEl) return null;
    const origin = boardEl.getBoundingClientRect();
    const x = itemDrag.x - itemDrag.grabX + itemDrag.width / 2 - origin.left + boardEl.scrollLeft;
    const y = itemDrag.y - origin.top;

    // Real columns that show (not the dragged page's own column if that's all it holds, not the new column spot).
    const slots = /** @type {HTMLElement[]} */ ([...boardEl.querySelectorAll('[data-column-slot]')]).filter((slot) => slot.offsetWidth > 0 && slot.dataset.columnSlot !== '__new');
    for (const slot of slots) {
      const left = slot.offsetLeft;
      const width = slot.offsetWidth;
      if (x < left + width * EDGE || x > left + width * (1 - EDGE)) continue;
      const columnId = /** @type {string} */ (slot.dataset.columnSlot);
      if (stackSnapshot?.column !== columnId) {
        const entries = /** @type {HTMLElement[]} */ ([...slot.querySelectorAll(':scope > [data-stack-item]')])
          .filter((entry) => !entry.hasAttribute('data-lifted') && !entry.hasAttribute('data-spot'));
        stackSnapshot = { column: columnId, middles: entries.map((entry) => slot.offsetTop + entry.offsetTop + entry.offsetHeight / 2) };
      }
      return { column: columnId, index: stackSnapshot.middles.filter((middle) => middle < y).length };
    }
    stackSnapshot = null;

    // A column of its own, before the first column whose middle is right of the pointer.
    const after = slots.find((slot) => slot.offsetLeft + slot.offsetWidth / 2 > x);
    const at = after ? board.columns.findIndex((column) => column.id === after.dataset.columnSlot) : board.columns.length;
    return { at: at === -1 ? board.columns.length : at };
  }

  /** @param {import('./board.svelte.js').ItemTarget | null} a @param {import('./board.svelte.js').ItemTarget | null} b */
  function sameTarget(a, b) {
    if (!a || !b) return a === b;
    if ('column' in a) return 'column' in b && a.column === b.column && a.index === b.index;
    return 'at' in b && a.at === b.at;
  }

  // Every frame: scrolls the board near its edges and moves the dashed spot to where the page would land.
  function itemDragFrame() {
    if (!itemDrag || !boardEl) return;
    const edge = 60;
    const rect = boardEl.getBoundingClientRect();
    if (itemDrag.x < rect.left + edge) boardEl.scrollLeft -= (rect.left + edge - itemDrag.x) / 4;
    else if (itemDrag.x > rect.right - edge) boardEl.scrollLeft += (itemDrag.x - rect.right + edge) / 4;

    const target = locateItem();
    // Only changed when it's somewhere else, a new one every frame would start the sliding over and over.
    if (target && !sameTarget(target, itemDrag.target)) itemDrag.target = target;
    requestAnimationFrame(itemDragFrame);
  }

  function stopItemDrag() {
    window.removeEventListener('pointermove', moveItemDrag);
    window.removeEventListener('pointerup', endItemDrag);
    window.removeEventListener('pointercancel', cancelItemDrag);
  }

  function endItemDrag() {
    stopItemDrag();
    if (itemDrag?.target) board.moveItem(itemDrag.id, itemDrag.target);
    itemDrag = null;
  }

  function cancelItemDrag() {
    stopItemDrag();
    itemDrag = null;
  }

  /**
   * Whether something between the pointer and the board scrolls up or down itself (a column's tasks, a note), and
   * still can in that direction.
   * @param {EventTarget | null} target @param {number} delta
   */
  function scrollsItself(target, delta) {
    for (let element = /** @type {Element | null} */ (target); element && element !== boardEl; element = element.parentElement) {
      const { overflowY } = getComputedStyle(element);
      if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
      if (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
    }
    return false;
  }

  // The mouse wheel scrolls the board sideways, but never over a page on the board (it scrolls its own tasks or
  // note, or nothing) or over something else that scrolls up or down itself.
  $effect(() => {
    if (!boardEl) return;
    const element = boardEl;
    /** @param {WheelEvent} event */
    const handleWheel = (event) => {
      if (event.shiftKey || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      // A page's settings dialog is drawn over everything but sits inside the board.
      if (/** @type {Element} */ (event.target).closest('[data-dialog], [data-item-id]')) return;
      if (element.scrollWidth <= element.clientWidth || scrollsItself(event.target, event.deltaY)) return;
      event.preventDefault();
      element.scrollLeft += event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 40 : event.deltaY;
    };
    // Not passive, so the page itself doesn't scroll.
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  });

  /** Space kept between a widget placed in the board's free space and the columns. */
  const WIDGET_GAP = 16;

  /**
   * The columns' boxes in the board's content (px from its left and top, as it scrolls), measured from their
   * layout. A widget placed in the free space that a column covers shows in its page's dock instead.
   * @type {{left: number, top: number, right: number, bottom: number}[]}
   */
  let columnBoxes = $state([]);

  function measureColumns() {
    if (!boardEl) return;
    columnBoxes = /** @type {HTMLElement[]} */ ([...boardEl.querySelectorAll('[data-column-slot]')])
      .filter((slot) => slot.offsetWidth > 0 && slot.dataset.columnSlot !== '__new')
      .map((slot) => ({ left: slot.offsetLeft, top: slot.offsetTop, right: slot.offsetLeft + slot.offsetWidth, bottom: slot.offsetTop + slot.offsetHeight }));
  }

  // Measured again when a column changes size, columns are added, moved or removed, or the window is resized.
  $effect(() => {
    if (!boardEl) return;
    const element = boardEl;
    void shownColumns;
    const observer = new ResizeObserver(measureColumns);
    for (const slot of element.querySelectorAll('[data-column-slot]')) observer.observe(slot);
    window.addEventListener('resize', measureColumns);
    measureColumns();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureColumns);
    };
  });

  /** Last measured heights of the widgets placed in the free space, by `widgetKey`. @type {Record<string, number>} */
  let widgetHeights = $state({});

  /** Widget ids are only unique within a page. @param {string} itemId @param {any} widget */
  const widgetKey = (itemId, widget) => `${itemId}:${widget.id}`;

  /**
   * Whether a widget there would be on a column, or too close to it.
   * @param {{x: number, y: number, height: number}} spot @param {{left: number, top: number, right: number, bottom: number}} box
   */
  function covers({ x, y, height }, box) {
    return x < box.right + WIDGET_GAP && x + SIDE_WIDTH > box.left - WIDGET_GAP && y < box.bottom + WIDGET_GAP && y + height > box.top - WIDGET_GAP;
  }

  /** Whether a widget there would be on any column. @param {{x: number, y: number, height: number}} spot */
  const coversColumn = (spot) => columnBoxes.some((box) => covers(spot, box));

  /**
   * Whether a page's widget shows in the board's free space: it was placed there and no column covers it. Docked,
   * its page is taller by it, so it only comes back once there's room for both: it never flickers between them.
   * @param {string} itemId @param {any} widget
   */
  function isFree(itemId, widget) {
    if (widget.pos?.area !== 'board') return false;
    return !coversColumn({ x: widget.pos.x, y: widget.pos.y, height: widgetHeights[widgetKey(itemId, widget)] ?? 0 });
  }

  /**
   * Moves a widget into its page's dock where it's dropped, by the middles of the other docked widgets.
   * @param {import('$lib/widgets/store.svelte.js').WidgetStore} store @param {any} widget @param {Element} dock @param {number} y
   */
  function dropInDock(store, widget, dock, y) {
    const above = [...dock.querySelectorAll('[data-dock-widget]')]
      .filter((element) => element.getAttribute('data-dock-widget') !== widget.id)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2 < y;
      })
      .map((element) => element.getAttribute('data-dock-widget'));
    const without = store.list.filter((each) => each.id !== widget.id);
    const lastAbove = above.at(-1);
    const index = lastAbove ? without.findIndex((each) => each.id === lastAbove) + 1 : 0;
    // A linked page's widget placed freely on its own page keeps that place there.
    if (widget.pos?.area === 'board') widget.pos = null;
    store.list = without.toSpliced(index, 0, widget);
  }

  // Where a widget dragged on the board goes. Dropped on its page's dock: into it, where it's dropped. In the free
  // space: there, it still belongs to its page. On a column: to the closest free spot beside or below it, or the
  // dock when there's none.
  $effect(() => {
    layout.dropHandler = (store, widget, drag) => {
      if (!boardEl) return;
      const item = board.items.find((each) => board.widgetsOf(each) === store);
      const dock = item && boardEl.querySelector(`[data-item-id="${item.id}"] [data-item-dock]`);
      if (!item || !dock) return;

      const dockRect = dock.getBoundingClientRect();
      if (drag.x >= dockRect.left && drag.x <= dockRect.right && drag.y >= dockRect.top - WIDGET_GAP && drag.y <= dockRect.bottom + WIDGET_GAP) {
        dropInDock(store, widget, dock, drag.y);
        return;
      }

      // Kept inside the board's content: not above or below it, not before it or past its end.
      const height = layout.ghostHeight;
      const { scrollWidth, clientHeight } = boardEl;
      /** @param {number} x @param {number} y */
      const inside = (x, y) => ({
        x: Math.min(Math.max(0, x), Math.max(0, scrollWidth - SIDE_WIDTH)),
        y: Math.min(Math.max(0, y), Math.max(0, clientHeight - height)),
        height
      });
      const origin = boardEl.getBoundingClientRect();
      const ghost = layout.ghostPosition(drag);
      let spot = inside(ghost.left - origin.left + boardEl.scrollLeft, ghost.top - origin.top);

      if (coversColumn(spot)) {
        const dropped = spot;
        const candidates = columnBoxes
          .filter((box) => covers(dropped, box))
          .flatMap((box) => [
            inside(box.left - WIDGET_GAP - SIDE_WIDTH, dropped.y),
            inside(box.right + WIDGET_GAP, dropped.y),
            inside(dropped.x, box.bottom + WIDGET_GAP)
          ])
          .filter((candidate) => !coversColumn(candidate));
        const distance = (/** @type {{x: number, y: number}} */ candidate) => Math.hypot(candidate.x - dropped.x, candidate.y - dropped.y);
        const closest = candidates.sort((a, b) => distance(a) - distance(b))[0];
        if (!closest) {
          dropInDock(store, widget, dock, Infinity);
          return;
        }
        spot = closest;
      }

      widget.pos = { area: 'board', x: spot.x, y: spot.y };
      widgetHeights[widgetKey(item.id, widget)] = height;
    };
    return () => (layout.dropHandler = null);
  });

  /** Scrolls to an added column, the last one. */
  function scrollToEnd() {
    requestAnimationFrame(() => boardEl?.scrollTo({ left: boardEl.scrollWidth, behavior: 'smooth' }));
  }
</script>


<main class="board-page">
  <PageHeader {page}>
    {#snippet actions()}
      <AddPageMenu {board} onAdded={scrollToEnd} />
    {/snippet}
  </PageHeader>

  <div class="board" bind:this={boardEl}>
    {#each shownColumns as column (column.id)}
      <!-- A column holding only the dragged page takes no room while it's dragged. The column holding the dragged
           page doesn't slide: the page is drawn where the pointer is, a sliding column would carry it along. -->
      <div
        class="column-slot"
        class:collapsed={column.entries.every((entry) => entry.key === itemDrag?.id)}
        data-column-slot={column.id}
        animate:slide={{ duration: column.entries.some((entry) => entry.key === itemDrag?.id) ? 0 : 200 }}
        {@attach shareHeight}>
        {#each column.entries as entry (entry.key)}
          {@const item = entry.item}
          {@const lifted = Boolean(item) && itemDrag?.id === item?.id}
          <!-- A page, or (`spot`) the dashed spot where the dragged page will land, as tall as it. The dragged page
               follows the pointer, out of the stack, above everything. -->
          <div
            class="stack-item"
            class:lifted
            class:spot={!item}
            data-stack-item
            data-lifted={lifted ? '' : undefined}
            data-spot={item ? undefined : ''}
            data-natural={item ? undefined : itemDrag?.height}
            style:--spot-height={item ? null : `${itemDrag?.height ?? 0}px`}
            style:left={lifted && itemDrag ? `${itemDrag.x - itemDrag.grabX}px` : null}
            style:top={lifted && itemDrag ? `${itemDrag.y - itemDrag.grabY}px` : null}
            style:width={lifted ? `${itemDrag?.width}px` : null}
            style:height={lifted ? `${itemDrag?.height}px` : null}
            animate:slide={{ duration: lifted ? 0 : 200 }}>
            {#if item}
              {#key item.kind}
                <BoardItem
                  {item}
                  {board}
                  boardPage={page}
                  {drag}
                  {taskProps}
                  onDragStart={(id, source, point, rect) => startDrag(item.id, id, source, point, rect)}
                  isWidgetDocked={(widget) => !isFree(item.id, widget)}
                  isItemDragged={lifted}
                  onItemDragStart={(point, rect) => startItemDrag(item.id, point, rect)} />
              {/key}
            {/if}
          </div>
        {/each}
      </div>
    {/each}

    <!-- Widgets placed in the free space, in their page's colors. -->
    {#each board.items as item (item.id)}
      {@const store = board.widgetsOf(item)}
      {#if store && board.widgetsEnabled(item)}
        <FreeWidgets
          {store}
          isFree={(widget) => isFree(item.id, widget)}
          heights={widgetHeights}
          key={(widget) => widgetKey(item.id, widget)}
          style={board.styleOf(item)} />
      {/if}
    {/each}
  </div>
</main>

{#if openTask}
  <TaskDialog
    task={openTask.task}
    list={openTask.owner}
    onClose={closeTask}
    onDelete={deleteOpenTask}
    widgetStore={opened ? taskWidgetsOf(/** @type {import('./board.svelte.js').Item} */ (board.item(opened.itemId))) : null} />
{/if}

{#if drag && draggedTask}
  <div
    class="task-ghost"
    style:left="{drag.x - drag.offsetX}px"
    style:top="{drag.y - drag.offsetY}px"
    style:width="{drag.width}px">
    <!-- Only shows the task, it can't be used. -->
    <Task
      text={draggedTask.text}
      isCurrent={false}
      onAction={() => {}}
      onDelete={() => {}}
      onEdit={() => {}}
      isHistory={drag.source === 'history' && !drag.target && !drag.overCurrent}
      {...taskProps(draggedTask, drag.itemId)} />
  </div>
{/if}


<style>
  .board-page {
    box-sizing: border-box;
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0 20px;

    /* Shape of a task card and the space between tasks, like on a Tasks page. */
    --task-radius: 22px;
    --task-gap: 14px;
  }

  /* The board page never scrolls up or down, so the space kept for the window's scrollbar (global.css) would only
     cut the board off at the window's edges. */
  :global(html:has(.board-page)),
  :global(body:has(.board-page)) {
    scrollbar-gutter: auto;
  }

  /* Keeps the title clear of the menu button. Below 741px the header has its own layout for that. */
  @media (min-width: 741px) {
    .board-page :global(.page-header) {
      padding-left: 66px;
    }
  }

  /* The columns side by side, scrolling sideways when they don't fit. Each column scrolls its own tasks. Reaches the
     window's edges, so scrolled columns go out of the window there instead of being cut off at the page's side
     padding, which the board keeps as its own. */
  .board {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    overflow-x: auto;
    margin: 0 -20px;
    padding: 18px 20px 20px;
    scroll-padding-inline: 20px;
  }

  /* A stack of pages, at most two thirds of the window and the board's height. The pages share that height
     (shareHeight.js): as tall as they need, squeezed evenly when they don't all fit. On a phone a column is a bit
     narrower than the screen, so the next one peeks in. */
  .column-slot {
    position: relative;
    box-sizing: border-box;
    width: min(400px, calc(100vw - 60px));
    flex-shrink: 0;
    /* Same as MAX_SHARE in shareHeight.js. */
    max-height: min(100%, calc(100dvh * 2 / 3));
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Holds only the page being dragged: no room in the row, the page itself is drawn where the pointer is. */
  .column-slot.collapsed {
    display: contents;
  }

  /* Squeezed by the browser too until shareHeight has set the heights, never below what's set there. */
  .stack-item {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .stack-item.lifted {
    position: fixed;
    z-index: 2000;
    transform: scale(1.02);
    filter: drop-shadow(0 12px 30px var(--shadow));
  }

  .stack-item.lifted :global(.head) {
    cursor: grabbing;
  }

  /* Where the dragged page will land, as tall as the page. In a full column it's squeezed like the pages
     (shareHeight sets its height then), and by the browser until that has happened. */
  .spot {
    height: var(--spot-height);
    border-radius: 30px;
    outline: 2.5px dashed var(--line);
    outline-offset: -2.5px;
  }

  /* On a phone, swiping the board stops at a column. */
  @media (max-width: 500px) {
    .board {
      scroll-snap-type: x proximity;
    }

    .column-slot {
      scroll-snap-align: center;
    }
  }

  /* Like in the page it comes from (BoardItem): a task's widgets only show their icon. */
  .task-ghost :global(.task-widgets .widget .label) {
    display: none;
  }

  .task-ghost {
    position: fixed;
    z-index: 2000;
    pointer-events: none;
    transform: scale(1.02);
    filter: drop-shadow(0 12px 30px var(--shadow));
  }
</style>
