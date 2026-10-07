<!-- src/lib/widgets/ui/Toggle.svelte -->
<script>
  /** @type {{checked?: boolean, onchange: (checked: boolean) => void, children: import('svelte').Snippet}} */
  let { checked = false, onchange, children } = $props();
</script>

<label class="toggle" class:checked>
  <input type="checkbox" {checked} onchange={(event) => onchange(event.currentTarget.checked)} />
  <span class="icon m3-icon">{checked ? 'check_box' : 'check_box_outline_blank'}</span>
  <span class="text">{@render children()}</span>
</label>


<style>
  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #dadada;
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    transition: color 0.4s;
  }

  .toggle:hover {
    color: #d6e550;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .icon {
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
  }

  .checked .icon {
    color: #d6e550;
  }
</style>
