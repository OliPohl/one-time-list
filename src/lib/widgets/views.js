// src/lib/widgets/views.js
// What a widget shows: its time, a line of status text, its state color and its control buttons.
// Shared by the widget cards (dock / side) and the widget pages, so both always behave the same.

import { formatCountdown, formatRemaining, remainingOf, phaseDuration } from './store.svelte.js';
import { frameClock } from '../utils/frameClock.svelte.js';
import { settings } from '../app/settings.svelte.js';
import { openWhiteboard } from '../pages/whiteboard/window.svelte.js';

/** @typedef {import('./store.svelte.js').WidgetStore} WidgetStore */
/** `label` is shown next to the icon where there is room (widget pages). */
/** `snooze` only shows while an alarm rings, next to the `confirm` button. */
/** @typedef {{icon: string, title: string, onclick: () => void, kind?: 'confirm' | 'snooze', label?: string}} Control */
/**
 * How far a countdown has run, drawn as the widget border and the bar on widget pages: `track` is the full
 * length and shows as the used part, `fill` the part that's left.
 * While counting, `elapsedAt(now)` gives the share used (0 to 1) at any moment, so borders and bars can move every
 * frame (see utils/frameClock.svelte.js). Otherwise `elapsed` is fixed.
 * The colors are the widget roles of global.css (`--widget-used`, `--widget-left`, `--widget-left-break`).
 * @typedef {{track: string, fill: string, elapsed?: number, elapsedAt?: (now: number) => number}} Progress
 */

/**
 * Share of a progress used right now. Inside a `$derived` it updates every frame while counting,
 * the frame clock is only read (and running) then.
 * @param {Progress} progress
 */
export function elapsedNow(progress) {
  return progress.elapsedAt ? progress.elapsedAt(frameClock.now) : (progress.elapsed ?? 0);
}

/** @param {number} elapsed */
const clamp01 = (elapsed) => Math.min(1, Math.max(0, elapsed));

const USED = 'var(--widget-used)';
const LEFT = 'var(--widget-left)';
const LEFT_BREAK = 'var(--widget-left-break)';

/**
 * `progress` is null while nothing counts down (not started, no alarm set, or ringing).
 * `bar` is the same for the bar on widget pages: timers and pomodoros always show it (nothing used yet while
 * not counting), a clock only while an alarm is set.
 * `slots` is how many controls the widget shows at most. While ringing, play / pause becomes the confirm
 * button, the clock only has controls then, free slots are kept so the widget doesn't change size.
 * @typedef {{time: string, sub: string, tone: 'idle' | 'counting' | 'ring', controls: Control[], slots: number, progress: Progress | null, bar?: Progress, breakEnd?: boolean}} View
 * `breakEnd` is true while a pomodoro rings because its break ended, it then blinks in the break colors.
 * @typedef {Omit<View, 'tone' | 'bar' | 'breakEnd'>} TypeView what each widget type works out, `widgetView` adds the rest
 */

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const timeFormatSeconds = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

/** @type {Record<string, string>} */
export const PHASE_LABELS = { work: 'Focus', short: 'Break', long: 'Long Break' };

/**
 * @param {any} widget
 * @param {WidgetStore} store
 * @param {{long?: boolean}} [options] `long` spells the status out, for the pages
 * @returns {TypeView}
 */
function clockView(widget, store, { long = false } = {}) {
  const hasAlarm = widget.alarmMode !== 'off' && widget.nextAt;
  // The clock shows the time moved by the clock offset from the settings.
  const time = (widget.showSeconds ? timeFormatSeconds : timeFormat).format(store.now + settings.clockOffset * 60 * 1000);

  let sub = '';
  if (widget.ringing) sub = 'Alarm!';
  else if (hasAlarm && widget.snoozed) sub = `${long ? 'Snoozed,' : 'Snooze'} ${formatRemaining(widget.nextAt - store.now)}`;
  else if (hasAlarm) sub = `${long ? 'Alarm in' : 'in'} ${formatRemaining(widget.nextAt - store.now)}`;

  const counting = hasAlarm && !widget.ringing && widget.alarmFrom;
  const period = widget.nextAt - widget.alarmFrom;

  return {
    time,
    sub,
    // Room for snooze too when it's turned on, so the widget keeps its size when the alarm rings.
    slots: widget.snooze > 0 ? 2 : 1,
    progress: counting ? { elapsedAt: (now) => clamp01((now - widget.alarmFrom) / period), track: USED, fill: LEFT } : null,
    controls: widget.ringing
      ? withSnooze(widget, store, [
          { icon: 'alarm_on', title: 'Confirm Alarm', label: 'Dismiss', kind: 'confirm', onclick: () => store.confirmAlarm(widget) }
        ])
      : []
  };
}

/** @param {any} widget @param {WidgetStore} store @returns {TypeView} */
function timerView(widget, store) {
  const running = widget.endsAt !== null;
  // While snoozed the timer counts down the snooze.
  const total = widget.snoozed || widget.duration;
  const status = running ? 'Running' : widget.remaining < total ? 'Paused' : '';

  return {
    time: formatCountdown(remainingOf(widget, store.now)),
    sub: widget.ringing ? "Time's up!" : widget.snoozed ? `Snoozed${running ? '' : ', paused'}` : status,
    // Room for snooze too when it's turned on, so the widget keeps its size when the timer rings.
    slots: widget.snooze > 0 ? 3 : 2,
    // Shown once started, also while paused.
    progress: !widget.ringing && (running || widget.remaining < total)
      ? { elapsedAt: (now) => clamp01(1 - remainingOf(widget, now) / total), track: USED, fill: LEFT }
      : null,
    controls: [
      ...(widget.ringing
        ? withSnooze(widget, store, [{ icon: 'check_circle', title: 'Confirm', label: 'Dismiss', kind: 'confirm', onclick: () => store.reset(widget) }])
        : running
          ? [{ icon: 'pause', title: 'Pause', onclick: () => store.pause(widget) }]
          : [{ icon: 'play_arrow', title: 'Start', onclick: () => store.start(widget) }]),
      { icon: 'restart_alt', title: 'Reset', onclick: () => store.reset(widget) }
    ]
  };
}

/**
 * Puts a snooze button before the controls of a ringing clock or timer, if its snooze is turned on.
 * @param {any} widget
 * @param {WidgetStore} store
 * @param {Control[]} controls
 * @returns {Control[]}
 */
function withSnooze(widget, store, controls) {
  if (!(widget.snooze > 0)) return controls;
  return [{ icon: 'snooze', title: `Snooze ${widget.snooze} min`, label: 'Snooze', kind: 'snooze', onclick: () => store.snooze(widget) }, ...controls];
}

/** @param {any} widget @param {WidgetStore} store @returns {TypeView} */
function pomodoroView(widget, store) {
  const running = widget.endsAt !== null;
  const isWork = widget.phase === 'work';
  const phase = PHASE_LABELS[widget.phase];

  let sub = isWork ? `${phase} ${widget.completed + 1}/${widget.every}` : phase;
  if (widget.ringing) sub = `${phase} done!`;

  return {
    time: formatCountdown(remainingOf(widget, store.now)),
    sub,
    slots: 3,
    progress: !widget.ringing && (running || widget.remaining < phaseDuration(widget))
      ? {
          elapsedAt: (now) => clamp01(1 - remainingOf(widget, now) / phaseDuration(widget)),
          track: USED,
          // Breaks show the time left in their own color, so they look different from focus.
          fill: isWork ? LEFT : LEFT_BREAK
        }
      : null,
    controls: [
      widget.ringing
        ? {
            icon: 'check_circle',
            title: `Start ${PHASE_LABELS[isWork ? 'short' : 'work']}`,
            // Confirming starts the next phase, so it says which one.
            label: `Start ${isWork ? 'Break' : 'Focus'}`,
            kind: 'confirm',
            onclick: () => store.advance(widget, true)
          }
        : running
          ? { icon: 'pause', title: 'Pause', onclick: () => store.pause(widget) }
          : { icon: 'play_arrow', title: 'Start', onclick: () => store.start(widget) },
      // Skipping or resetting while it rings also stops the ringing.
      { icon: 'skip_next', title: 'Skip Phase', onclick: () => store.advance(widget, running) },
      { icon: 'restart_alt', title: 'Reset', onclick: () => store.reset(widget) }
    ]
  };
}

/** The number on the calculator, the calculation (or the error) above it. Its keys are the keypad, no controls. @param {any} widget @returns {TypeView} */
function calculatorView(widget) {
  return { time: widget.entry, sub: widget.error || widget.expression, slots: 0, progress: null, controls: [] };
}

/** An image shows itself (see WidgetImage), no time and no controls. @param {any} widget @returns {TypeView} */
function imageView(widget) {
  return { time: '', sub: widget.src ? '' : 'No image yet', slots: 0, progress: null, controls: [] };
}

/** A whiteboard shows its drawing (see WidgetWhiteboard), its control opens it to draw. @param {any} widget @returns {TypeView} */
function whiteboardView(widget) {
  return {
    time: '',
    sub: '',
    slots: 1,
    progress: null,
    controls: [{ icon: 'open_in_full', title: 'Open Whiteboard', onclick: () => openWhiteboard(widget.drawingId, 'Whiteboard') }]
  };
}

const VIEWS = { clock: clockView, timer: timerView, pomodoro: pomodoroView, calculator: calculatorView, image: imageView, whiteboard: whiteboardView };

/** A pomodoro that rings because its break ended. @param {any} widget */
export function isBreakEnd(widget) {
  return widget.type === 'pomodoro' && widget.ringing && widget.phase !== 'work';
}

/**
 * Call inside `$derived` so it updates with the widget and the store's clock.
 * @param {any} widget
 * @param {WidgetStore} store
 * @param {{long?: boolean}} [options]
 * @returns {View}
 */
export function widgetView(widget, store, options) {
  const view = VIEWS[/** @type {keyof typeof VIEWS} */ (widget.type)](widget, store, options);
  /** @type {View['tone']} */
  const tone = widget.ringing ? 'ring' : view.progress ? 'counting' : 'idle';
  const isBreak = widget.type === 'pomodoro' && widget.phase !== 'work';
  const counts = widget.type === 'timer' || widget.type === 'pomodoro';
  const idleBar = counts ? { elapsed: 0, track: USED, fill: isBreak ? LEFT_BREAK : LEFT } : undefined;
  return { ...view, tone, bar: view.progress ?? idleBar, breakEnd: isBreakEnd(widget) };
}
