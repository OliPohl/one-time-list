<!-- src/lib/ui/EditorRow.svelte -->
<script>
  let { label, children } = $props();
</script>

<div class="row">
  {#if label}<span class="label">{label}</span>{/if}
  <div class="content">
    {@render children()}
  </div>
</div>


<style>
  .row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    color: var(--text-muted);
  }

  .content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
</style>
