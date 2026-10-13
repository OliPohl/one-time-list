<!-- src/lib/pages/tasks/components/TaskTag.svelte -->
<!-- A priority or label tag of an advanced task, tinted in its color (a palette key: `red` for `--red`, ...).
     Shown on the task, and as a button in the task popup (`onclick`, `selected`). -->
<script>
  /** @type {{name: string, color: string, icon?: string, selected?: boolean, onclick?: () => void, title?: string}} */
  let { name, color, icon = '', selected = true, onclick, title } = $props();
</script>

{#if onclick}
  <button class="tag" class:selected style:--tag="var(--{color})" {title} aria-pressed={selected} {onclick}>
    {#if icon}<span class="tag-icon m3-icon">{icon}</span>{/if}
    <span class="tag-name">{name}</span>
  </button>
{:else}
  <span class="tag selected" style:--tag="var(--{color})" {title}>
    {#if icon}<span class="tag-icon m3-icon">{icon}</span>{/if}
    <span class="tag-name">{name}</span>
  </span>
{/if}


<style>
  .tag {
    box-sizing: border-box;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 9px;
    border: 1.5px solid transparent;
    border-radius: 20px;
    background-color: transparent;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 12px;
    line-height: 1.5;
    white-space: nowrap;
    transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  }

  /* Tinted in its color, readable in light and dark mode. */
  .tag.selected {
    background-color: color-mix(in srgb, var(--tag) 18%, transparent);
    color: var(--tag);
    font-weight: 600;
  }

  /* Not picked: outlined in its color (not gray), so it's clear it can be clicked. Picked: filled. */
  button.tag {
    font-size: 14px;
    padding: 3px 12px;
    border-color: color-mix(in srgb, var(--tag) 45%, transparent);
    color: color-mix(in srgb, var(--tag) 80%, var(--text));
    cursor: pointer;
  }

  button.tag:hover {
    border-color: var(--tag);
  }

  button.tag.selected {
    border-color: var(--tag);
  }

  .tag-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tag-icon {
    font-size: 1.15em;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }
</style>
