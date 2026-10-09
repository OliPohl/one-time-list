<!-- src/lib/ui/NumberField.svelte -->
<script>
  let { value = $bindable(0), label = '', unit = '', min = 0, max = 999, onchange } = $props();
</script>

<label class="field">
  {#if label}<span class="unit">{label}</span>{/if}
  <input type="number" inputmode="numeric" {min} {max} bind:value {onchange} />
  {#if unit}<span class="unit">{unit}</span>{/if}
</label>


<style>
  .field {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 40px;
    border: 1.5px solid var(--line);
    transition: border-color 0.4s;
  }

  .field:focus-within {
    border-color: var(--accent);
  }

  input {
    width: 3ch;
    background: transparent;
    border: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .unit {
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
