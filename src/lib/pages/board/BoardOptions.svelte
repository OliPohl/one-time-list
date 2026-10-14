<!-- src/lib/pages/board/BoardOptions.svelte -->
<!-- Customization of a board, shown on the "New Page" screen and in the page settings: its colors and whether its
     Tasks lists have widgets. A page on the board can have its own instead (ItemSettings). Edits `options` in place. -->
<script>
  import ColorOptions from '../ColorOptions.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import { boardWidgetsEnabled } from './board.svelte.js';

  /** @type {{options: Record<string, any>}} */
  let { options } = $props();
</script>

<ColorOptions {options} />

<div class="option">
  <span class="option-label">Widgets</span>
  <!-- Off keeps the widgets but stops them, so nothing rings in the background. -->
  <Toggle checked={boardWidgetsEnabled(options)} onchange={(checked) => (options.widgets = checked)}>
    Enable widgets
  </Toggle>
</div>

<style>
  .option {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .option-label {
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    color: var(--text-muted);
  }
</style>
