<!-- src/lib/ui/Chip.svelte -->
<script>
  let { icon = '', active = false, onclick, children } = $props();
</script>

<button class="chip" class:active {onclick}>
  {#if icon}<span class="icon m3-icon">{icon}</span>{/if}
  {@render children()}
</button>


<style>
  .chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    background-color: transparent;
    border-radius: 40px;
    border: 1.5px solid #494949;
    color: #dadada;
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    cursor: pointer;
    transition: color 0.4s, border-color 0.4s;
  }

  .chip:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .chip.active {
    color: #000000;
    background-color: var(--accent);
    border-color: var(--accent);
  }

  .icon {
    font-size: 18px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 18;
  }
</style>
