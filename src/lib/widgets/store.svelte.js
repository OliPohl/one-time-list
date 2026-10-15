// src/lib/widgets/store.svelte.js
// Widget state of one page: the widget list, a ticking clock and the timer logic.
// Each page that shows widgets owns its own store, see `context.js`.

import { untrack } from 'svelte';
import { playAlarm } from '../utils/sounds.js';
import { loadJSON, saveJSON } from '../utils/storage.js';
import { uniqueId } from '../utils/id.js';
import { settings } from '../app/settings.svelte.js';
import { calculatorState } from './calculator.js';

/** The alarm sound repeats this often (ms) while a widget rings, until it's confirmed. */
const ALARM_INTERVAL = 5000;

const MINUTE = 60 * 1000;

export const WIDGET_TYPES = {
  clock: { label: 'Clock', icon: 'schedule' },
  timer: { label: 'Timer', icon: 'timer' },
  pomodoro: { label: 'Pomodoro', icon: 'nutrition' },
  calculator: { label: 'Calculator', icon: 'calculate' },
  image: { label: 'Image', icon: 'image' },
  whiteboard: { label: 'Whiteboard', icon: 'draw' }
};

/** Snooze lengths a clock or timer can be set to, in minutes. 0 is off: no snooze button while it rings. */
export const SNOOZE_OPTIONS = [0, 5, 10, 15, 30];

export const POMODORO_PRESETS = [
  { name: 'Classic', work: 25, short: 5, long: 15, every: 4 },
  { name: 'Long Focus', work: 45, short: 15, long: 30, every: 3 },
  { name: 'Deep Work', work: 50, short: 10, long: 30, every: 3 },
  { name: 'Sprint', work: 15, short: 3, long: 10, every: 4 }
];

/** @param {string} type @param {string} id */
function createWidget(type, id) {
  if (type === 'clock') {
    // `alarmFrom` is when the countdown to `nextAt` began, for the progress border.
    // `snooze` is the snooze length in minutes (0 = off). `snoozed` is how long the current snooze lasts (ms),
    // or false: while snoozed, `nextAt` is the snoozed alarm instead of the next regular one.
    return { id, type, pos: null, alarmMode: 'off', alarmTime: '07:00', nextAt: null, alarmFrom: null, ringing: false, snooze: 0, snoozed: false, showSeconds: false };
  }

  if (type === 'timer') {
    const duration = 15 * MINUTE;
    // While snoozed (`snoozed` is its length in ms) the timer counts down the snooze instead of `duration`.
    return { id, type, pos: null, duration, remaining: duration, endsAt: null, ringing: false, snooze: 0, snoozed: false, autoStart: false, startOnSelect: false };
  }

  if (type === 'calculator') {
    // See calculator.js.
    return { id, type, pos: null, ...calculatorState() };
  }

  if (type === 'whiteboard') {
    // Its drawing is saved on its own (see whiteboard/store.js), under an id unique in the whole app: a widget's id is
    // only unique in its store, and the widget can move to another one with its task.
    return { id, type, pos: null, drawingId: `widget_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` };
  }

  if (type === 'image') {
    // `src` is a link to an image, or an uploaded one as a data URL (see image.js). Empty until one is set.
    return { id, type, pos: null, src: '' };
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
 * Next alarm timestamp for a clock after `from`. The alarm time is on the clock, which shows the time moved by
 * the clock offset from the settings.
 * @param {string} mode
 * @param {string} time "HH:MM"
 * @param {number} from
 */
export function nextAlarm(mode, time, from) {
  const offset = settings.clockOffset * MINUTE;
  const shown = from + offset;
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch value, not state
  const date = new Date(shown);

  if (mode === 'time') {
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    if (date.getTime() <= shown) date.setDate(date.getDate() + 1);
    return date.getTime() - offset;
  }

  const step = { hour: 60, half: 30, quarter: 15 }[mode];
  if (!step) return null;
  date.setMinutes(Math.floor(date.getMinutes() / step) * step + step, 0, 0);
  return date.getTime() - offset;
}

/** How long a repeating alarm counts down, a set time counts at most a day. @param {string} mode */
function alarmPeriod(mode) {
  return ({ hour: 60, half: 30, quarter: 15 }[mode] ?? 24 * 60) * MINUTE;
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

/**
 * Old places of widgets as a free position (see layout.svelte.js): beside the task column (`side`, `dx` from the
 * column, which was 620px wide with 24px gaps), or below the tasks (`area: 'list'`, inside the task list, which
 * started about 260px from the top).
 * @param {any} pos
 */
function migratePos(pos) {
  if (pos?.side === 'left') return { area: 'free', x: -310 - 24 - 230 - (pos.dx ?? 0), y: pos.y ?? 0 };
  if (pos?.side === 'right') return { area: 'free', x: 310 + 24 + (pos.dx ?? 0), y: pos.y ?? 0 };
  if (pos?.area === 'list') return { area: 'free', x: -300 + (pos.x ?? 0), y: 260 + (pos.y ?? 0) };
  return pos ?? null;
}

/** Updates widgets saved by older versions. @param {any} widget */
function migrate(widget) {
  widget = { ...widget, pos: migratePos(widget.pos) };
  // Pomodoros used to start when a task was completed, now they start when one is selected.
  if (widget.type === 'pomodoro' && 'autoStart' in widget) {
    const { autoStart, ...rest } = widget;
    return { ...rest, startOnSelect: autoStart };
  }
  if (widget.type === 'timer') {
    let timer = widget;
    if (!('startOnSelect' in timer)) timer = { ...timer, startOnSelect: false };
    if (!('snooze' in timer)) timer = { ...timer, snooze: 0, snoozed: false };
    return timer;
  }
  if (widget.type === 'clock') {
    let clock = widget;
    if (!('showSeconds' in clock)) clock = { ...clock, showSeconds: false };
    if (!('snooze' in clock)) clock = { ...clock, snooze: 0, snoozed: false };
    // Older alarms don't know when they were set: assume one interval (or a day) before they ring.
    if (!('alarmFrom' in clock)) clock = { ...clock, alarmFrom: clock.nextAt ? clock.nextAt - alarmPeriod(clock.alarmMode) : null };
    return clock;
  }
  return widget;
}

export class WidgetStore {
  /** @type {any[]} */
  list = $state([]);
  now = $state(Date.now());
  /** Turned off (a Tasks page with widgets disabled): kept and saved, but nothing ticks, rings or starts. */
  suspended = $state(false);
  /** @type {ReturnType<typeof setInterval> | undefined} */
  #interval;
  #lastAlarmAt = 0;
  /** Stops the chimes this store started that may still be playing. @type {Array<() => void>} */
  #playingChimes = [];
  #storageKey;
  /** @type {(() => void) | undefined} */
  #stopSaving;

  /** @param {string} storageKey */
  constructor(storageKey) {
    this.#storageKey = storageKey;
  }

  /**
   * Loads the saved widgets, starts ticking and saves every change from then on.
   * @param {{suspended?: boolean}} [options] start turned off, nothing ticks (so nothing rings) until `resume()`
   */
  load({ suspended = false } = {}) {
    this.list = loadJSON(this.#storageKey, []).map(migrate);
    this.suspended = suspended;

    if (!suspended) this.#startTicking();

    this.#stopSaving?.();
    this.#stopSaving = $effect.root(() => {
      $effect(() => saveJSON(this.#storageKey, this.list));

      // A new clock offset moves the clock, alarms count again from now to the time it shows.
      let offset = settings.clockOffset;
      $effect(() => {
        if (settings.clockOffset === offset) return;
        offset = settings.clockOffset;
        if (!this.suspended) untrack(() => this.#rescheduleAlarms());
      });
    });
  }

  #startTicking() {
    this.tick();
    clearInterval(this.#interval);
    this.#interval = setInterval(() => this.tick(), 250);
  }

  /**
   * Turns the widgets off: they stay saved, but stop ticking. Running timers and pomodoros pause, anything that
   * rings is dismissed, so nothing can play a sound in the background.
   */
  suspend() {
    if (this.suspended) return;
    this.suspended = true;
    clearInterval(this.#interval);

    for (const widget of this.list) {
      if (widget.ringing) {
        if (widget.type === 'clock') this.confirmAlarm(widget);
        else if (widget.type === 'pomodoro') this.advance(widget, false);
        else this.reset(widget);
      }
      if (widget.endsAt) this.pause(widget);
    }
    for (const stop of this.#playingChimes) stop();
    this.#playingChimes = [];
  }

  /** Turns the widgets back on. Paused timers stay paused, clock alarms count from now. */
  resume() {
    if (!this.suspended) return;
    this.suspended = false;

    // An alarm that would have rung while turned off doesn't go off all at once.
    this.#rescheduleAlarms();
    this.#startTicking();
  }

  /** Clock alarms that are set and not ringing count from now to their next time. */
  #rescheduleAlarms() {
    const now = Date.now();
    for (const widget of this.list) {
      if (widget.type !== 'clock' || widget.alarmMode === 'off' || widget.ringing) continue;
      widget.snoozed = false;
      widget.nextAt = nextAlarm(widget.alarmMode, widget.alarmTime, now);
      widget.alarmFrom = widget.nextAt ? now : null;
    }
  }

  /** @param {boolean} enabled */
  setEnabled(enabled) {
    if (enabled) this.resume();
    else this.suspend();
  }

  /** Stops ticking and saving and deletes the saved widgets. */
  destroy() {
    clearInterval(this.#interval);
    this.#stopSaving?.();
    localStorage.removeItem(this.#storageKey);
    for (const stop of this.#playingChimes) stop();
  }

  /** @param {string} id */
  get(id) {
    return this.list.find((widget) => widget.id === id);
  }

  /**
   * Adds a widget, of the page or (`taskId`) of one of its tasks: shown in that task, only reacts to that task.
   * @param {string} type @param {string} [taskId]
   */
  add(type, taskId) {
    const widget = createWidget(type, uniqueId((id) => Boolean(this.get(id))));
    this.list.push(taskId ? { ...widget, taskId } : widget);
  }

  /** The widgets of a task. @param {string} taskId */
  ofTask(taskId) {
    return this.list.filter((widget) => widget.taskId === taskId);
  }

  /** Removes the widgets of a deleted task. @param {string} taskId */
  removeTaskWidgets(taskId) {
    if (!this.list.some((widget) => widget.taskId === taskId)) return;
    this.list = this.list.filter((widget) => widget.taskId !== taskId);
    this.#silenceIfQuiet();
  }

  /** @param {string} id */
  remove(id) {
    this.list = this.list.filter((widget) => widget.id !== id);
    this.#silenceIfQuiet();
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
   * Chimes when a widget starts ringing and repeats until every ringing widget is confirmed.
   * @param {number} now
   * @param {boolean} startedRinging
   */
  #playAlarmSound(now, startedRinging) {
    if (!this.list.some((widget) => widget.ringing)) return;
    if (!startedRinging && now - this.#lastAlarmAt < ALARM_INTERVAL) return;

    // A chime is shorter than the interval, so only the one just started can still be playing.
    this.#playingChimes = [playAlarm()];
    this.#lastAlarmAt = now;
  }

  /** Cuts off the chime right away once nothing of this store rings anymore. */
  #silenceIfQuiet() {
    if (this.list.some((widget) => widget.ringing)) return;
    for (const stop of this.#playingChimes) stop();
    this.#playingChimes = [];
  }

  // Clock

  /** @param {any} widget @param {string} mode @param {string} [time] */
  setAlarm(widget, mode, time = widget.alarmTime) {
    widget.alarmMode = mode;
    widget.alarmTime = time;
    widget.ringing = false;
    widget.snoozed = false;
    widget.nextAt = nextAlarm(mode, time, Date.now());
    widget.alarmFrom = widget.nextAt ? Date.now() : null;
    this.#silenceIfQuiet();
  }

  /** @param {any} widget */
  confirmAlarm(widget) {
    widget.ringing = false;
    widget.snoozed = false;
    widget.nextAt = nextAlarm(widget.alarmMode, widget.alarmTime, Date.now());
    widget.alarmFrom = widget.nextAt ? Date.now() : null;
    this.#silenceIfQuiet();
  }

  /** Stops a ringing clock or timer, it rings again after its snooze time. @param {any} widget */
  snooze(widget) {
    if (!widget.ringing || !(widget.snooze > 0)) return;
    const now = Date.now();
    const length = widget.snooze * MINUTE;
    widget.ringing = false;
    widget.snoozed = length;

    if (widget.type === 'clock') {
      widget.nextAt = now + length;
      widget.alarmFrom = now;
    } else {
      widget.remaining = length;
      widget.endsAt = now + length;
    }
    this.#silenceIfQuiet();
  }

  /** @param {any} widget @param {number} minutes one of SNOOZE_OPTIONS */
  setSnooze(widget, minutes) {
    widget.snooze = minutes;
  }

  // Image

  /** @param {any} widget @param {string} src a link, or a data URL, or '' for none */
  setImage(widget, src) {
    widget.src = src;
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
    widget.snoozed = false;

    if (widget.type === 'pomodoro') {
      widget.phase = 'work';
      widget.completed = 0;
      widget.remaining = widget.work;
    } else {
      widget.remaining = widget.duration;
    }
    this.#silenceIfQuiet();
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
    this.#silenceIfQuiet();
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
   * @param {'autoStart' | 'startOnSelect' | 'showSeconds'} option
   * @param {boolean} value
   */
  setOption(widget, option, value) {
    widget[option] = value;
  }

  /** Stops all timers and alarms and puts every widget back to its start state. An image or a drawing stays. */
  resetAll() {
    for (const widget of this.list) {
      if (widget.type === 'image' || widget.type === 'whiteboard') continue;
      if (widget.type === 'clock') {
        this.setAlarm(widget, 'off');
      } else {
        this.reset(widget);
      }
    }
  }

  /**
   * Called when the current task is completed. The task's own widgets stop, they go to the history with it.
   * The page's timers that start on a completed task start again.
   * @param {string} [taskId]
   */
  taskCompleted(taskId) {
    for (const widget of this.list) {
      if (widget.taskId) {
        if (widget.taskId === taskId) this.#stop(widget);
        continue;
      }
      if (this.suspended) continue;
      if (widget.type === 'timer' && widget.autoStart && !widget.ringing) this.#restart(widget);
    }
  }

  /** Stops a widget: a clock's alarm off, a running timer or pomodoro paused, one that rings dismissed. @param {any} widget */
  #stop(widget) {
    if (widget.type === 'clock') {
      if (widget.alarmMode !== 'off') this.setAlarm(widget, 'off');
      return;
    }
    if (widget.ringing) {
      if (widget.type === 'pomodoro') this.advance(widget, false);
      else this.reset(widget);
    }
    this.pause(widget);
  }

  /**
   * Called when a task becomes the current task. A task's own widgets only react to that task.
   * @param {string} [taskId]
   */
  taskSelected(taskId) {
    if (this.suspended) return;
    for (const widget of this.list) {
      if (widget.taskId && widget.taskId !== taskId) continue;
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

