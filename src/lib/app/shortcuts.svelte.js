// src/lib/app/shortcuts.svelte.js
// Keyboard shortcuts for the whole app, like Trello's: single keys while nothing is being typed. Every action has
// one or more keys (`bindings`), changed in the settings dialog and saved in the browser. App wide actions
// (switching pages, the sidebar) are run here, task actions by the page that shows the tasks (see taskCursor.svelte.js).

import { loadJSON, saveJSON } from '../utils/storage.js';

const STORAGE_KEY = 'taskbook_shortcuts';

/**
 * @typedef {'pages' | 'board' | 'tasks'} ShortcutGroup
 * @typedef {{id: string, label: string, group: ShortcutGroup, keys: string[]}} ShortcutAction
 */

/** Every action, in the order the settings list them, with its default keys. @type {ShortcutAction[]} */
export const ACTIONS = [
  { id: 'findPage', label: 'Find a page', group: 'pages', keys: ['Shift+T', 'Shift+Space'] },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `page${index + 1}`,
    label: `Open page ${index + 1}`,
    group: /** @type {ShortcutGroup} */ ('pages'),
    keys: [`Shift+${index + 1}`]
  })),
  { id: 'previousPage', label: 'Previous page', group: 'pages', keys: [] },
  { id: 'nextPage', label: 'Next page', group: 'pages', keys: ['Shift+Tab'] },
  { id: 'dashboard', label: 'Open the dashboard', group: 'pages', keys: ['Shift+D'] },
  { id: 'newPage', label: 'New page', group: 'pages', keys: ['Shift+N'] },
  { id: 'toggleSidebar', label: 'Open or close the sidebar', group: 'pages', keys: ['Shift+W'] },
  { id: 'showShortcuts', label: 'Show keyboard shortcuts', group: 'pages', keys: ['?'] },

  { id: 'addColumn', label: 'Add a column', group: 'board', keys: ['A'] },
  { id: 'nextList', label: 'Next column', group: 'board', keys: ['L', 'ArrowRight'] },
  { id: 'previousList', label: 'Previous column', group: 'board', keys: ['H', 'ArrowLeft'] },
  { id: 'moveTaskLeft', label: 'Move task to the previous column', group: 'board', keys: ['<'] },
  { id: 'moveTaskRight', label: 'Move task to the next column', group: 'board', keys: ['>'] },

  { id: 'newTask', label: 'New task', group: 'tasks', keys: ['N'] },
  { id: 'nextTask', label: 'Next task', group: 'tasks', keys: ['J', 'ArrowDown'] },
  { id: 'previousTask', label: 'Previous task', group: 'tasks', keys: ['K', 'ArrowUp'] },
  { id: 'openTask', label: 'Open task', group: 'tasks', keys: ['Enter', 'E'] },
  { id: 'selectTask', label: 'Make current task', group: 'tasks', keys: ['Space'] },
  { id: 'completeTask', label: 'Complete task', group: 'tasks', keys: ['Shift+C'] },
  { id: 'completeCurrentTask', label: 'Complete current task', group: 'tasks', keys: ['C'] },
  { id: 'moveTaskUp', label: 'Move task up', group: 'tasks', keys: ['Shift+K', 'Shift+ArrowUp'] },
  { id: 'moveTaskDown', label: 'Move task down', group: 'tasks', keys: ['Shift+J', 'Shift+ArrowDown'] }
];

/** Keys that only change other keys, never a shortcut of their own. */
const MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'CapsLock', 'Dead', 'Unidentified'];

/**
 * The key combination of a key press, like "Shift+N", "Alt+ArrowUp" or "?", or null for a modifier alone.
 * Letters are upper case, with Shift when it's held. Other characters are what the key typed, Shift is already in
 * them ("?" not "Shift+/"), so they work the same on every keyboard layout. Digits with Shift are the exception:
 * what they type differs on every layout ("!", "§", or the digit itself), so they're the key: "Shift+1".
 * @param {KeyboardEvent} event
 * @returns {string | null}
 */
export function comboOf(event) {
  if (MODIFIER_KEYS.includes(event.key)) return null;

  const digit = event.shiftKey ? /^(?:Digit|Numpad)(\d)$/.exec(event.code ?? '')?.[1] : undefined;
  let key = digit ?? (event.key === ' ' ? 'Space' : event.key);
  const isCharacter = key.length === 1 && !digit;
  const isLetter = isCharacter && key.toLowerCase() !== key.toUpperCase();
  if (isLetter) key = key.toUpperCase();

  // AltGr types characters (like "[" on German keyboards), some systems report it as Ctrl+Alt.
  const altGraph = event.getModifierState?.('AltGraph') || (isCharacter && !isLetter && event.ctrlKey && event.altKey);

  const parts = [];
  if (event.ctrlKey && !altGraph) parts.push('Ctrl');
  if (event.metaKey) parts.push('Meta');
  if (event.altKey && !altGraph) parts.push('Alt');
  if (event.shiftKey && (!isCharacter || isLetter)) parts.push('Shift');
  return [...parts, key].join('+');
}

/** How a combination is shown: "Shift+ArrowUp" as "Shift ↑". @param {string} combo */
export function comboLabel(combo) {
  const names = /** @type {Record<string, string>} */ ({
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Delete: 'Del', Backspace: '⌫'
  });
  return combo
    .split('+')
    .map((part, index, all) => (index === all.length - 1 && part === '' ? '+' : names[part] ?? part))
    .filter(Boolean)
    .join(' ');
}

/** Pages that keep the focus while they're used, Escape lets it go (`releaseFocus`). */
const FOCUS_AREAS = { whiteboard: '.excalidraw', notes: '.notes-page .note' };

/** Typing into these, drawing on a whiteboard or picking in a menu (they have keys of their own), the keys stay there. */
const TYPING = 'input, textarea, select, [contenteditable="true"], .excalidraw, [role="menu"]';

/** Typing into it, unless it's in a dialog that is closing (fading out, `inert`), which still has the focus. @param {Element | null | undefined} element */
const isTyping = (element) => Boolean(element?.closest(TYPING) && !element.closest('[inert]'));

/** @typedef {Partial<Record<string, () => boolean | void>>} Handlers returning false leaves the key to the browser */

class Shortcuts {
  /** Turned off in the settings, no key does anything. */
  enabled = $state(true);
  /** The keys of every action. @type {Record<string, string[]>} */
  bindings = $state(defaultBindings());
  /** The settings dialog is waiting for a key to bind, shortcuts don't run meanwhile. */
  recording = $state(false);
  /** The page switcher is open. */
  finderOpen = $state(false);
  /** The popup to change the shortcuts is open (ShortcutsDialog). */
  dialogOpen = $state(false);
  /**
   * A page that takes the keyboard (a calculator, a whiteboard) gave it back with Escape: the shortcuts work until it's
   * clicked again (`take`). `released` says which one, for the hint that shows meanwhile (KeyboardHint).
   * @type {'calculator' | 'whiteboard' | 'notes' | null}
   */
  released = $state(null);

  /** Handlers of what's shown (a Tasks page, a board), the last one added comes first. @type {Handlers[]} */
  #handlers = [];

  /** The action each combination runs. */
  #byCombo = $derived.by(() => {
    /** @type {Map<string, string>} */
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- built fresh each time, not state
    const map = new Map();
    for (const action of ACTIONS) for (const combo of this.bindings[action.id] ?? []) if (!map.has(combo)) map.set(combo, action.id);
    return map;
  });

  load() {
    const saved = loadJSON(STORAGE_KEY, /** @type {{enabled?: unknown, keys?: Record<string, unknown>}} */ ({}));
    this.enabled = saved.enabled !== false;
    for (const action of ACTIONS) {
      const keys = saved.keys?.[action.id];
      if (Array.isArray(keys) && keys.every((key) => typeof key === 'string')) this.bindings[action.id] = keys;
    }
    $effect.root(() => {
      // Only what differs from the defaults is saved, changed defaults reach everyone who kept them.
      $effect(() => {
        const changed = Object.fromEntries(ACTIONS.filter((action) => !this.isDefault(action.id)).map((action) => [action.id, this.bindings[action.id]]));
        saveJSON(STORAGE_KEY, { enabled: this.enabled, keys: changed });
      });
    });
  }

  /** The keyboard goes back to the shortcuts. @param {'calculator' | 'whiteboard' | 'notes'} from */
  release(from) {
    this.released = from;
  }

  /** The page that gave the keyboard back takes it again (clicked, or another page opened). */
  take() {
    this.released = null;
  }

  /**
   * Escape on a page that keeps the focus (a whiteboard, the Notes page's note): the focus is let go, the keys reach
   * the shortcuts. Called in the capture phase, a whiteboard stops Escape from going further. It still gets it and
   * does its own (deselecting, closing its menus). Writing text on a whiteboard, Escape only ends that. Clicking the
   * page again takes the keys back (`takeOnClick`).
   * @param {KeyboardEvent} event
   */
  releaseFocus(event) {
    if (event.key !== 'Escape' || !this.enabled) return;
    const active = document.activeElement;
    if (!active || active.closest('[data-dialog]')) return;
    const from = /** @type {(keyof typeof FOCUS_AREAS)[]} */ (Object.keys(FOCUS_AREAS)).find((area) => active.closest(FOCUS_AREAS[area]));
    if (!from || (from === 'whiteboard' && active.closest('textarea, input'))) return;
    this.release(from);
    // A whiteboard focuses itself again while it handles Escape, the focus is let go once it's done.
    const letGo = () => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused.closest(FOCUS_AREAS[from])) focused.blur();
    };
    letGo();
    setTimeout(letGo);
    window.addEventListener('keyup', () => setTimeout(letGo), { once: true });
  }

  /** Clicking the page that let go of the focus gives it the keys again. @param {PointerEvent} event */
  takeOnClick(event) {
    const from = this.released;
    if (from && from in FOCUS_AREAS && /** @type {Element} */ (event.target).closest(FOCUS_AREAS[/** @type {keyof typeof FOCUS_AREAS} */ (from)])) {
      this.take();
    }
  }

  /** How an action's first key is shown ("Shift D"), '' without keys or while shortcuts are off. @param {string} id */
  keyLabel(id) {
    const combo = this.enabled ? this.bindings[id]?.[0] : undefined;
    return combo ? comboLabel(combo) : '';
  }

  /** @param {string} id */
  isDefault(id) {
    const keys = this.bindings[id] ?? [];
    const defaults = ACTIONS.find((action) => action.id === id)?.keys ?? [];
    return keys.length === defaults.length && keys.every((key, index) => key === defaults[index]);
  }

  /** The action a combination already runs, other than `id`. @param {string} combo @param {string} [id] */
  actionOf(combo, id) {
    const other = this.#byCombo.get(combo);
    return other && other !== id ? ACTIONS.find((action) => action.id === other) : undefined;
  }

  /** Adds a key to an action, taking it from any other action that had it. @param {string} id @param {string} combo */
  bind(id, combo) {
    for (const action of ACTIONS) {
      if (action.id !== id) this.bindings[action.id] = (this.bindings[action.id] ?? []).filter((key) => key !== combo);
    }
    const keys = this.bindings[id] ?? [];
    if (!keys.includes(combo)) this.bindings[id] = [...keys, combo];
  }

  /** @param {string} id @param {string} combo */
  unbind(id, combo) {
    this.bindings[id] = (this.bindings[id] ?? []).filter((key) => key !== combo);
  }

  /** @param {string} id */
  reset(id) {
    this.bindings[id] = [...(ACTIONS.find((action) => action.id === id)?.keys ?? [])];
  }

  resetAll() {
    this.bindings = defaultBindings();
  }

  /**
   * Lets what's shown run actions (task actions on a Tasks page or board). Returns the function that removes them.
   * @param {Handlers} handlers
   */
  register(handlers) {
    this.#handlers.unshift(handlers);
    return () => {
      this.#handlers = this.#handlers.filter((other) => other !== handlers);
    };
  }

  /**
   * Runs the action of a key press. Called by the app's key listener, with the app wide `actions`.
   * @param {KeyboardEvent} event
   * @param {Handlers} actions
   */
  handle(event, actions) {
    if (!this.enabled || event.defaultPrevented || event.isComposing || this.recording) return;
    const target = /** @type {Element | null} */ (event.target instanceof Element ? event.target : null);
    if (isTyping(target)) return;
    // Dialogs (settings, a task's popup, "Are you sure?") have their own keys, so has a calculator in use.
    // One that is closing doesn't count: what fades out of it is `inert`.
    const dialogs = [...document.querySelectorAll('[data-dialog]')];
    if (dialogs.some((dialog) => !dialog.querySelector('[inert]')) || document.querySelector('[data-takes-keys]')) return;
    if (isTyping(document.activeElement)) return;

    const combo = comboOf(event);
    // Enter and Space press a focused button or link, as they do everywhere.
    if ((combo === 'Enter' || combo === 'Space') && target?.closest('button, a[href], [role="button"], summary')) return;
    const id = combo && this.#byCombo.get(combo);
    if (!id) return;

    for (const handlers of [...this.#handlers, actions]) {
      const run = handlers[id];
      if (!run) continue;
      if (run() === false) return;
      event.preventDefault();
      return;
    }
  }
}

function defaultBindings() {
  return Object.fromEntries(ACTIONS.map((action) => [action.id, [...action.keys]]));
}

export const shortcuts = new Shortcuts();
