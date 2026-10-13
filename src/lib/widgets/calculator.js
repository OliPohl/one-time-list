// src/lib/widgets/calculator.js
// The calculator widget's logic, like a simple pocket calculator: a number is typed (`entry`), an operator keeps it
// (`acc`, `op`), "=" works out the result. `expression` is the line above the number ("12 + 7 =").
// Every key changes the widget in place, so it's saved like any other widget.

/** @typedef {'+' | '-' | '*' | '/'} Operator */
/**
 * @typedef {'0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | Operator | '=' | 'clear' | 'back'
 *   | 'sqrt' | 'square' | 'inverse' | 'percent' | 'negate'} Key
 */

/** Digits a typed number can have. */
const MAX_DIGITS = 16;

/** @type {Record<Operator, string>} */
export const OPERATOR_SIGNS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** The fields of a new calculator widget. */
export function calculatorState() {
  return { entry: '0', acc: null, op: null, expression: '', fresh: false, error: '' };
}

/**
 * A result as shown: 12 significant digits (no 0.30000000000000004), very large or small numbers as 1.2e+20.
 * @param {number} value
 */
export function formatNumber(value) {
  const rounded = Number(value.toPrecision(12));
  const size = Math.abs(rounded);
  if (size !== 0 && (size >= 1e16 || size < 1e-9)) return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  return String(rounded);
}

/** @param {number} a @param {Operator} op @param {number} b */
function compute(a, op, b) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  return a / b;
}

/** @param {any} widget @param {string} message */
function fail(widget, message) {
  Object.assign(widget, calculatorState(), { entry: 'Error', error: message, fresh: true });
}

/** Shows a result, or the error if it isn't a number. @param {any} widget @param {number} value @returns {boolean} */
function show(widget, value) {
  if (!Number.isFinite(value)) {
    fail(widget, 'Result too large');
    return false;
  }
  widget.entry = formatNumber(value);
  return true;
}

/**
 * Presses a key of the calculator.
 * @param {any} widget
 * @param {Key} key
 */
export function press(widget, key) {
  // After an error only a new number or clearing does something.
  if (widget.error) {
    if (key !== 'clear' && key !== 'back' && !/^[\d.]$/.test(key)) return;
    Object.assign(widget, calculatorState());
    if (key === 'clear' || key === 'back') return;
  }

  if (/^[\d.]$/.test(key)) {
    typeDigit(widget, key);
  } else if (key in OPERATOR_SIGNS) {
    setOperator(widget, /** @type {Operator} */ (key));
  } else if (key === '=') {
    equals(widget);
  } else if (key === 'clear') {
    Object.assign(widget, calculatorState());
  } else if (key === 'back') {
    // Only the number being typed, not a result.
    if (widget.fresh) return;
    const shorter = widget.entry.slice(0, -1);
    widget.entry = shorter === '' || shorter === '-' ? '0' : shorter;
  } else if (key === 'negate') {
    if (widget.entry !== '0') widget.entry = widget.entry.startsWith('-') ? widget.entry.slice(1) : `-${widget.entry}`;
  } else {
    applyFunction(widget, key);
  }
}

/** @param {any} widget @param {string} key a digit or "." */
function typeDigit(widget, key) {
  // A number typed after "=" starts a new calculation.
  if (widget.fresh && widget.op === null) widget.expression = '';
  if (widget.fresh) {
    widget.entry = key === '.' ? '0.' : key;
    widget.fresh = false;
    return;
  }
  if (key === '.' && widget.entry.includes('.')) return;
  if (widget.entry.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
  widget.entry = widget.entry === '0' && key !== '.' ? key : widget.entry + key;
}

/** @param {any} widget @param {Operator} op */
function setOperator(widget, op) {
  // 2 + 3 × works out 2 + 3 first. A second operator right after the first one only replaces it.
  if (widget.op !== null && !widget.fresh) {
    if (widget.op === '/' && Number(widget.entry) === 0) return fail(widget, "Can't divide by 0");
    if (!show(widget, compute(widget.acc, widget.op, Number(widget.entry)))) return;
  }
  widget.acc = Number(widget.entry);
  widget.op = op;
  widget.expression = `${formatNumber(widget.acc)} ${OPERATOR_SIGNS[op]}`;
  widget.fresh = true;
}

/** @param {any} widget */
function equals(widget) {
  // Without an operator the number is the result, the next digit starts a new one.
  if (widget.op === null) {
    widget.expression = `${formatNumber(Number(widget.entry))} =`;
    widget.fresh = true;
    return;
  }
  const b = Number(widget.entry);
  if (widget.op === '/' && b === 0) return fail(widget, "Can't divide by 0");
  const expression = `${formatNumber(widget.acc)} ${OPERATOR_SIGNS[/** @type {Operator} */ (widget.op)]} ${formatNumber(b)} =`;
  if (!show(widget, compute(widget.acc, widget.op, b))) return;
  widget.expression = expression;
  widget.acc = null;
  widget.op = null;
  widget.fresh = true;
}

/** Square root, square, 1/x and percent: work on the number shown. @param {any} widget @param {Key} key */
function applyFunction(widget, key) {
  const x = Number(widget.entry);
  let value;
  let label;

  if (key === 'sqrt') {
    if (x < 0) return fail(widget, 'Invalid input');
    value = Math.sqrt(x);
    label = `√(${formatNumber(x)})`;
  } else if (key === 'square') {
    value = x * x;
    label = `sqr(${formatNumber(x)})`;
  } else if (key === 'inverse') {
    if (x === 0) return fail(widget, "Can't divide by 0");
    value = 1 / x;
    label = `1/(${formatNumber(x)})`;
  } else {
    // 50 + 10% is 50 + 5, like on a pocket calculator. Times and divided by take the percent itself.
    value = widget.op === '+' || widget.op === '-' ? (widget.acc * x) / 100 : x / 100;
    label = formatNumber(value);
  }

  if (!show(widget, value)) return;
  widget.expression = widget.op === null ? label : `${formatNumber(widget.acc)} ${OPERATOR_SIGNS[/** @type {Operator} */ (widget.op)]} ${label}`;
  widget.fresh = true;
}

/**
 * The calculator key for a key on the keyboard, or null.
 * @param {KeyboardEvent} event
 * @returns {Key | null}
 */
export function keyFromKeyboard(event) {
  const { key } = event;
  if (/^[\d.+\-*/]$/.test(key)) return /** @type {Key} */ (key);
  if (key === ',') return '.';
  if (key === 'x' || key === 'X') return '*';
  if (key === 'Enter' || key === '=') return '=';
  if (key === 'Backspace') return 'back';
  if (key === 'Escape' || key === 'Delete') return 'clear';
  if (key === '%') return 'percent';
  if (key === 'r' || key === 'R') return 'sqrt';
  if (key === '^') return 'square';
  return null;
}
