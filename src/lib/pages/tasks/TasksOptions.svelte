<!-- src/lib/pages/tasks/TasksOptions.svelte -->
<!-- Customization of a Tasks page, shown on the "New Page" screen and in the page settings. Edits `options` in place. -->
<script>
  import { COLORS, colorsKey } from '../../colors.js';

  /** @type {{options: Record<string, any>}} */
  let { options } = $props();

  let selected = $derived(colorsKey(options));
</script>

<div class="option">
  <span class="option-label">Colors</span>
  <div class="color-options">
    {#each Object.entries(COLORS) as [key, colors] (key)}
      <button
        class="color-option"
        class:selected={selected === key}
        style:--preview-wave={colors.wave}
        style:--preview-accent={colors.accent}
        style:--preview-task={colors.task}
        aria-pressed={selected === key}
        onclick={() => {
          options.colors = key;
          delete options.colorScheme;
        }}>
        <span class="preview" aria-hidden="true">
          <span class="preview-accent"></span>
          <span class="preview-task"></span>
          <svg class="preview-wave" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M0 14 C 20 4, 35 4, 50 12 S 80 22, 100 10 L 100 40 L 0 40 Z" />
          </svg>
        </span>
        <span class="color-name">{colors.label}</span>
      </button>
    {/each}
  </div>
</div>


<style>
  .option {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .option-label {
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    color: var(--text-muted);
  }

  .color-options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }

  .color-option {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 8px 10px;
    background-color: var(--surface);
    border: 2.5px solid var(--line);
    border-radius: 24px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    cursor: pointer;
    transition: border-color 0.4s, color 0.4s;
  }

  .color-option:hover {
    border-color: var(--text-muted);
  }

  .color-option.selected {
    border-color: var(--preview-accent);
    color: var(--preview-accent);
  }

  /* A tiny version of the page: accent input and current task above the wave. */
  .preview {
    position: relative;
    height: 56px;
    overflow: hidden;
    border-radius: 16px;
    background-color: var(--bg);
  }

  .preview-accent,
  .preview-task {
    position: absolute;
    left: 10px;
    right: 10px;
    height: 9px;
    border-radius: 9px;
  }

  .preview-task {
    top: 9px;
    border: 2px dashed var(--preview-task);
    box-sizing: border-box;
  }

  .preview-accent {
    z-index: 1;
    bottom: 9px;
    border: 2px solid var(--preview-accent);
    background-color: var(--surface);
    box-sizing: border-box;
  }

  .preview-wave {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 28px;
    fill: var(--preview-wave);
  }

  .color-name {
    text-align: center;
  }
</style>
