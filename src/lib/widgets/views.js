// src/lib/widgets/views.js
// What a widget shows: its time, a line of status text, its state color and its control buttons.
// Shared by the widget cards (dock / side) and the widget pages, so both always behave the same.

import { formatCountdown, formatRemaining, remainingOf, phaseDuration } from './store.svelte.js';
import { frameClock } from '../utils/frameClock.svelte.js';

/** @typedef {import('./store.svelte.js').WidgetStore} WidgetStore */
/** `label` is shown next to the icon where there is room (widget pages). */
/** @typedef {{icon: string, title: string, onclick: () => void, kind?: 'confirm', label?: string}} Control */
/**
 * How far a countdown has run, drawn as the widget border and the bar on widget pages: `track` is the full
 * length and shows as the used part, `fill` the part that's left.
 * While counting, `elapsedAt(now)` gives the share used (0 to 1) at any moment, so borders and bars can move every
 * frame (see utils/frameClock.svelte.js). Otherwise `elapsed` is fixed.
 * Used time is the page's primary color, time left the secondary color (tertiary during breaks).
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

const USED = 'var(--wave)';

/**
 * `progress` is null while nothing counts down (not started, no alarm set, or ringing).
 * `bar` is the same for the bar on widget pages: timers and pomodoros always show it (nothing used yet while
 * not counting), a clock only while an alarm is set.
 * `slots` is how many controls the widget shows at most. While ringing, play / pause becomes the confirm
 * button, the clock only has controls then, free slots are kept so the widget doesn't change size.
 * @typedef {{time: string, sub: string, tone: 'idle' | 'blue' | 'orange' | 'ring', controls: Control[], slots: number, progress: Progress | null, bar?: Progress}} View
 */

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const timeFormatSeconds = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

/** @type {Record<string, string>} */
export const PHASE_LABELS = { work: 'Focus', short: 'Break', long: 'Long Break' };

/**
 * @param {any} widget
 * @param {WidgetStore} store
 * @param {{long?: boolean}} [options] `long` spells the status out, for the pages
 * @returns {View}
 */
function clockView(widget, store, { long = false } = {}) {
  const hasAlarm = widget.alarmMode !== 'off' && widget.nextAt;
  const time = (widget.showSeconds ? timeFormatSeconds : timeFormat).format(store.now);

  let sub = '';
  if (widget.ringing) sub = 'Alarm!';
  else if (hasAlarm) sub = `${long ? 'Alarm in' : 'in'} ${formatRemaining(widget.nextAt - store.now)}`;

  const counting = hasAlarm && !widget.ringing && widget.alarmFrom;
  const period = widget.nextAt - widget.alarmFrom;

  return {
    time,
    sub,
    slots: 1,
    progress: counting ? { elapsedAt: (now) => clamp01((now - widget.alarmFrom) / period), track: USED, fill: 'var(--accent)' } : null,
    tone: widget.ringing ? 'ring' : hasAlarm ? 'orange' : 'blue',
    controls: widget.ringing
      ? [{ icon: 'alarm_on', title: 'Confirm Alarm', label: 'Dismiss', kind: 'confirm', onclick: () => store.confirmAlarm(widget) }]
      : []
  };
}

/** @param {any} widget @param {WidgetStore} store @returns {View} */
function timerView(widget, store) {
  const running = widget.endsAt !== null;

  return {
    time: formatCountdown(remainingOf(widget, store.now)),
    sub: widget.ringing ? "Time's up!" : running ? 'Running' : widget.remaining < widget.duration ? 'Paused' : '',
    slots: 2,
    // Shown once started, also while paused.
    progress: !widget.ringing && (running || widget.remaining < widget.duration)
      ? { elapsedAt: (now) => clamp01(1 - remainingOf(widget, now) / widget.duration), track: USED, fill: 'var(--accent)' }
      : null,
    tone: widget.ringing ? 'ring' : running ? 'orange' : 'idle',
    controls: [
      widget.ringing
        ? { icon: 'check_circle', title: 'Confirm', label: 'Dismiss', kind: 'confirm', onclick: () => store.reset(widget) }
        : running
          ? { icon: 'pause', title: 'Pause', onclick: () => store.pause(widget) }
          : { icon: 'play_arrow', title: 'Start', onclick: () => store.start(widget) },
      { icon: 'restart_alt', title: 'Reset', onclick: () => store.reset(widget) }
    ]
  };
}

/** @param {any} widget @param {WidgetStore} store @returns {View} */
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
          // Breaks show the time left in the tertiary color, so they look different from focus.
          fill: isWork ? 'var(--accent)' : 'var(--task)'
        }
      : null,
    tone: widget.ringing ? 'ring' : !running ? 'idle' : isWork ? 'orange' : 'blue',
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

const VIEWS = { clock: clockView, timer: timerView, pomodoro: pomodoroView };

/**
 * Call inside `$derived` so it updates with the widget and the store's clock.
 * @param {any} widget
 * @param {WidgetStore} store
 * @param {{long?: boolean}} [options]
 * @returns {View}
 */
export function widgetView(widget, store, options) {
  const view = VIEWS[/** @type {keyof typeof VIEWS} */ (widget.type)](widget, store, options);
  const isBreak = widget.type === 'pomodoro' && widget.phase !== 'work';
  const idleBar = widget.type === 'clock' ? undefined : { elapsed: 0, track: USED, fill: isBreak ? 'var(--task)' : 'var(--accent)' };
  return { ...view, bar: view.progress ?? idleBar };
}
