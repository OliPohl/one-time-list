<!-- src/lib/app/FolderStyle.svelte -->
<!-- Picks a folder's icon (Material Symbols) and the icon's color. Used on the "Add New" screen and while editing a
     folder in the sidebar. `compact` is the smaller version for the sidebar. -->
<script>
  import { FOLDER_ICONS, FOLDER_COLORS } from './folders.svelte.js';

  /**
   * @type {{
   *   icon: string,
   *   color: string,
   *   onIconChange: (icon: string) => void,
   *   onColorChange: (color: string) => void,
   *   compact?: boolean
   * }}
   */
  let { icon, color, onIconChange, onColorChange, compact = false } = $props();
</script>

<div class="folder-style" class:compact>
  <div class="field">
    <span class="label">Icon</span>
    <div class="icons" role="radiogroup" aria-label="Folder icon">
      {#each FOLDER_ICONS as name (name)}
        <button
          class="icon-option m3-icon"
          class:selected={icon === name}
          style:color={color ? `var(--${color})` : undefined}
          role="radio"
          aria-checked={icon === name}
          title={name.replace(/_/g, ' ')}
          onclick={() => onIconChange(name)}>{name}</button>
      {/each}
    </div>
  </div>

  <div class="field">
    <span class="label">Icon Color</span>
    <div class="colors" role="radiogroup" aria-label="Icon color">
      {#each FOLDER_COLORS as option (option.key)}
        <button
          class="color-option"
          class:selected={color === option.key}
          class:default={!option.key}
          style:--swatch={option.key ? `var(--${option.key})` : 'var(--text-soft)'}
          role="radio"
          aria-checked={color === option.key}
          title={option.label}
          onclick={() => onColorChange(option.key)}></button>
      {/each}
    </div>
  </div>
</div>


<style>
  .folder-style {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    color: var(--text-muted);
  }

  .icons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 6px;
  }

  .icon-option {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: 2px solid transparent;
    border-radius: 14px;
    color: var(--text-soft);
    font-size: 26px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
    cursor: pointer;
    transition: border-color 0.3s, background-color 0.3s;
  }

  .icon-option:hover {
    background-color: var(--surface-active);
  }

  .icon-option.selected {
    border-color: var(--accent);
    background-color: var(--surface-active);
  }

  .colors {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .color-option {
    width: 30px;
    height: 30px;
    padding: 0;
    background-color: var(--swatch);
    border: 3px solid var(--surface);
    border-radius: 50%;
    outline: 2px solid transparent;
    cursor: pointer;
    transition: outline-color 0.3s;
  }

  /* No color of its own: the icon keeps the text color, shown as a ring. */
  .color-option.default {
    background-color: transparent;
    border: 3px solid var(--swatch);
  }

  .color-option:hover {
    outline-color: var(--line);
  }

  .color-option.selected {
    outline-color: var(--accent);
  }

  /* In the sidebar: smaller, so the whole picker fits under the folder. */
  .compact {
    gap: 12px;
    padding: 10px 6px 4px;
  }

  .compact .label {
    font-size: 14px;
  }

  /* In the sidebar: about five rows, the rest scrolls. */
  .compact .icons {
    grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
    gap: 4px;
    max-height: 190px;
    overflow-y: auto;
  }

  .compact .icon-option {
    border-radius: 10px;
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }

  /* All nine colors on one line in the sidebar. */
  .compact .colors {
    gap: 5px;
  }

  .compact .color-option {
    width: 22px;
    height: 22px;
  }
</style>
