// src/lib/widgets/widgets.svelte.js
// Shared widget state: the widget list, a ticking clock, timer logic and drag & drop.

import { playAlarm } from '../sounds.js';

const STORAGE_KEY = 'otl_widgets';
/** The alarm sound repeats while a widget rings, up to this many times. */
const ALARM_REPEATS = 6;
const ALARM_INTERVAL = 5000;

const MINUTE = 60 * 1000;

/** Width of the centered task column (page max-width + padding). */
export const COLUMN_WIDTH = 620;
/** Width of a widget placed beside the task column. */
export const SIDE_WIDTH = 230;
/** Gap between side widgets and the screen edge / task column. */
export const SIDE_MARGIN = 24;
/** Space kept free at the bottom of the screen for the task input. */
export const BOTTOM_RESERVED = 180;

export const WIDGET_TYPES = {
  clock: { label: 'Clock', icon: 'schedule' },
  timer: { label: 'Timer', icon: 'timer' },
  pomodoro: { label: 'Pomodoro', icon: 'nutrition' }
};

export const POMODORO_PRESETS = [
  { name: 'Classic', work: 25, short: 5, long: 15, every: 4 },
  { name: 'Long Focus', work: 45, short: 15, long: 30, every: 3 },
  { name: 'Deep Work', work: 50, short: 10, long: 30, every: 3 },
  { name: 'Sprint', work: 15, short: 3, long: 10, every: 4 }
];

/** @param {string} type @param {string} id */
function createWidget(type, id) {
  if (type === 'clock') {
    return { id, type, pos: null, alarmMode: 'off', alarmTime: '07:00', nextAt: null, ringing: false };
  }

  if (type === 'timer') {
    const duration = 15 * MINUTE;
    return { id, type, pos: null, duration, remaining: duration, endsAt: null, ringing: false, autoStart: false, startOnSelect: false };
  }

  const { work, short, long, every } = POMODORO_PRESETS[0];
  return {
    id, type, pos: null,
    work: work * MINUTE, short: short * MINUTE, long: long * MINUTE, every,
    phase: 'work', completed: 0,
    remaining: work * MINUTE, endsAt: null, ringing: false, startOnSelect: false
  };
}

/**
 * Next alarm timestamp for a clock after `from`.
 * @param {string} mode
 * @param {string} time "HH:MM"
 * @param {number} from
 */
export function nextAlarm(mode, time, from) {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch value, not state
  const date = new Date(from);

  if (mode === 'time') {
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    if (date.getTime() <= from) date.setDate(date.getDate() + 1);
    return date.getTime();
  }

  const step = { hour: 60, half: 30, quarter: 15 }[mode];
  if (!step) return null;
  date.setMinutes(Math.floor(date.getMinutes() / step) * step + step, 0, 0);
  return date.getTime();
}

/** @param {any} widget */
export function phaseDuration(widget) {
  return widget[widget.phase];
}

/** @param {any} widget @param {number} now */
export function remainingOf(widget, now) {
  return widget.endsAt ? Math.max(0, widget.endsAt - now) : widget.remaining;
}

/** Formats a countdown in ms as m:ss or h:mm:ss. @param {number} ms */
export function formatCountdown(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Formats a duration in ms rounded to minutes, e.g. "1h 05m" or "12 min". @param {number} ms */
export function formatRemaining(ms) {
  const minutes = Math.max(1, Math.ceil(ms / MINUTE));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Updates widgets saved by older versions. @param {any} widget */
function migrate(widget) {
  // Pomodoros used to start when a task was completed, now they start when one is selected.
  if (widget.type === 'pomodoro' && 'autoStart' in widget) {
    const { autoStart, ...rest } = widget;
    return { ...rest, startOnSelect: autoStart };
  }
  if (widget.type === 'timer' && !('startOnSelect' in widget)) {
    return { ...widget, startOnSelect: false };
  }
  return widget;
}

class WidgetStore {
  /** @type {any[]} */
  list = $state([]);
  now = $state(Date.now());
  /** @type {ReturnType<typeof setInterval> | undefined} */
  #interval;
  #alarmCount = 0;
  #lastAlarmAt = 0;

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.list = JSON.parse(saved).map(migrate);
    } catch {
      this.list = [];
    }

    this.tick();
    clearInterval(this.#interval);
    this.#interval = setInterval(() => this.tick(), 250);
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list));
  }

  /** @param {string} id */
  get(id) {
    return this.list.find((widget) => widget.id === id);
  }

  /** @param {string} type */
  add(type) {
    let id;
    do {
      id = Math.random().toString(36).substring(2, 8);
    } while (this.get(id));

    this.list.push(createWidget(type, id));
  }

  /** @param {string} id */
  remove(id) {
    this.list = this.list.filter((widget) => widget.id !== id);
  }

  tick() {
    const now = Date.now();
    this.now = now;
    let startedRinging = false;

    for (const widget of this.list) {
      if (widget.type === 'clock') {
        if (widget.nextAt && now >= widget.nextAt && !widget.ringing) {
          widget.ringing = true;
          startedRinging = true;
        }
      } else if (widget.endsAt && now >= widget.endsAt) {
        widget.endsAt = null;
        widget.remaining = 0;
        widget.ringing = true;
        startedRinging = true;
      }
    }

    this.#playAlarmSound(now, startedRinging);
  }

  /**
   * Beeps when a widget starts ringing and repeats a few times until it's confirmed.
   * @param {number} now
   * @param {boolean} startedRinging
   */
  #playAlarmSound(now, startedRinging) {
    if (startedRinging) this.#alarmCount = 0;

    if (!this.list.some((widget) => widget.ringing)) {
      this.#alarmCount = 0;
      return;
    }

    if (this.#alarmCount >= ALARM_REPEATS) return;
    if (!startedRinging && now - this.#lastAlarmAt < ALARM_INTERVAL) return;

    playAlarm();
    this.#alarmCount += 1;
    this.#lastAlarmAt = now;
  }

  // Clock

  /** @param {any} widget @param {string} mode @param {string} [time] */
  setAlarm(widget, mode, time = widget.alarmTime) {
    widget.alarmMode = mode;
    widget.alarmTime = time;
    widget.ringing = false;
    widget.nextAt = nextAlarm(mode, time, Date.now());
  }

  /** @param {any} widget */
  confirmAlarm(widget) {
    widget.ringing = false;
    widget.nextAt = nextAlarm(widget.alarmMode, widget.alarmTime, Date.now());
  }

  // Timer & Pomodoro

  /** @param {any} widget */
  start(widget) {
    if (widget.endsAt || widget.ringing) return;
    if (widget.remaining <= 0) widget.remaining = widget.type === 'timer' ? widget.duration : phaseDuration(widget);
    // Sync the shared clock, a stale `now` would show the countdown one second too high.
    this.now = Date.now();
    widget.endsAt = this.now + widget.remaining;
  }

  /** @param {any} widget */
  pause(widget) {
    if (!widget.endsAt) return;
    widget.remaining = Math.max(0, widget.endsAt - Date.now());
    widget.endsAt = null;
  }

  /** @param {any} widget */
  reset(widget) {
    widget.endsAt = null;
    widget.ringing = false;

    if (widget.type === 'pomodoro') {
      widget.phase = 'work';
      widget.completed = 0;
      widget.remaining = widget.work;
    } else {
      widget.remaining = widget.duration;
    }
  }

  /** @param {any} widget @param {number} ms */
  setDuration(widget, ms) {
    widget.duration = Math.max(1000, ms);
    this.reset(widget);
  }

  /** Moves a pomodoro to its next phase. @param {any} widget @param {boolean} autoStart */
  advance(widget, autoStart) {
    if (widget.phase === 'work') {
      widget.completed += 1;
      widget.phase = widget.completed % widget.every === 0 ? 'long' : 'short';
    } else {
      widget.phase = 'work';
      if (widget.completed >= widget.every) widget.completed = 0;
    }

    widget.ringing = false;
    widget.endsAt = null;
    widget.remaining = phaseDuration(widget);
    if (autoStart) this.start(widget);
  }

  /** @param {any} widget @param {{work: number, short: number, long: number, every: number}} settings minutes */
  setPomodoro(widget, { work, short, long, every }) {
    widget.work = Math.max(1, work) * MINUTE;
    widget.short = Math.max(1, short) * MINUTE;
    widget.long = Math.max(1, long) * MINUTE;
    widget.every = Math.max(1, Math.round(every));
    this.reset(widget);
  }

  /**
   * @param {any} widget
   * @param {'autoStart' | 'startOnSelect'} option
   * @param {boolean} value
   */
  setOption(widget, option, value) {
    widget[option] = value;
  }

  /** Stops all timers and alarms and puts every widget back to its start state. */
  resetAll() {
    for (const widget of this.list) {
      if (widget.type === 'clock') {
        this.setAlarm(widget, 'off');
      } else {
        this.reset(widget);
      }
    }
  }

  /** Called when the current task is completed. */
  taskCompleted() {
    for (const widget of this.list) {
      if (widget.type === 'timer' && widget.autoStart && !widget.ringing) this.#restart(widget);
    }
  }

  /** Called when a task becomes the current task. */
  taskSelected() {
    for (const widget of this.list) {
      if (!widget.startOnSelect || widget.ringing) continue;

      if (widget.type === 'timer') {
        this.#restart(widget);
      } else if (widget.type === 'pomodoro') {
        this.start(widget);
      }
    }
  }

  /** @param {any} widget */
  #restart(widget) {
    this.reset(widget);
    this.start(widget);
  }
}

export const widgets = new WidgetStore();

/**
 * Screen layout + drag state shared between the widget dock and the side layer.
 */
class WidgetLayout {
  width = $state(0);
  height = $state(0);

  /** @type {{id: string, x: number, y: number, ratioX: number, offsetY: number, startWidth: number, startHeight: number} | null} */
  drag = $state(null);

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
    const maxY = Math.max(SIDE_MARGIN, this.height - BOTTOM_RESERVED - height);
    const top = Math.min(Math.max(SIDE_MARGIN, pos.y), maxY);

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
   * @param {string} id
   * @param {{clientX: number, clientY: number}} point
   * @param {DOMRect} rect
   */
  startDrag(id, point, rect) {
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
    this.#stop();

    const widget = drag && widgets.get(drag.id);
    if (!widget) return;

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

    this.#dropInDock(widget, y);
  };

  #cancel = () => this.#stop();

  #stop() {
    this.drag = null;
    window.removeEventListener('pointermove', this.#move);
    window.removeEventListener('pointerup', this.#drop);
    window.removeEventListener('pointercancel', this.#cancel);
  }

  /** Re-inserts the widget into the dock at the position closest to `y`. @param {any} widget @param {number} y */
  #dropInDock(widget, y) {
    const dockedIds = [...document.querySelectorAll('[data-dock-widget]')]
      .filter((element) => element.getAttribute('data-dock-widget') !== widget.id)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2 < y;
      })
      .map((element) => element.getAttribute('data-dock-widget'));

    const without = widgets.list.filter((item) => item.id !== widget.id);
    const lastAbove = dockedIds.at(-1);
    const index = lastAbove ? without.findIndex((item) => item.id === lastAbove) + 1 : 0;

    widget.pos = null;
    without.splice(index, 0, widget);
    widgets.list = without;
  }
}

export const layout = new WidgetLayout();
