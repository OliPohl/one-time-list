<!-- src/lib/ui/TimeField.svelte -->
<!-- 24 hour HH:MM input. The native time input follows the browser locale (AM/PM), this one doesn't. -->
<script>
  /** @type {{value: string, active?: boolean, onchange: (value: string) => void}} */
  let { value, active = false, onchange } = $props();

  /** @param {string} part */
  const pad = (part) => part.padStart(2, '0');

  // Edit fields, re-synced whenever the stored time changes.
  let hours = $derived(value.split(':')[0]);
  let minutes = $derived(value.split(':')[1]);

  /**
   * @param {string} input
   * @param {number} max
   * @param {string} fallback
   */
  function clamp(input, max, fallback) {
    const number = parseInt(input, 10);
    if (Number.isNaN(number)) return fallback;
    return pad(String(Math.min(Math.max(number, 0), max)));
  }

  function commit() {
    const [oldHours, oldMinutes] = value.split(':');
    const next = `${clamp(hours, 23, oldHours)}:${clamp(minutes, 59, oldMinutes)}`;
    hours = next.split(':')[0];
    minutes = next.split(':')[1];
    onchange(next);
  }

  /** @param {FocusEvent & {currentTarget: HTMLInputElement}} event */
  function selectAll(event) {
    event.currentTarget.select();
  }
</script>

<div class="field" class:active>
  <input
    type="text"
    inputmode="numeric"
    maxlength="2"
    aria-label="Hours"
    bind:value={hours}
    onfocus={selectAll}
    onchange={commit} />
  <span class="colon">:</span>
  <input
    type="text"
    inputmode="numeric"
    maxlength="2"
    aria-label="Minutes"
    bind:value={minutes}
    onfocus={selectAll}
    onchange={commit} />
</div>


<style>
  .field {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 12px;
    border-radius: 40px;
    border: 1.5px solid #494949;
    transition: border-color 0.4s;
  }

  .field:focus-within,
  .field.active {
    border-color: var(--accent);
  }

  input {
    width: 2ch;
    background: transparent;
    border: none;
    color: #ffffff;
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .colon {
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    color: #9a9a9a;
  }
</style>
