<!-- src/lib/pages/tasks/TasksOptions.svelte -->
<!-- Customization of a Tasks page, shown on the "New Page" screen and in the page settings. Edits `options` in place. -->
<script>
  import ColorOptions from '../ColorOptions.svelte';
  import { widgetsEnabled } from './list.svelte.js';
  import Toggle from '../../ui/Toggle.svelte';

  /** @type {{options: Record<string, any>}} */
  let { options } = $props();
</script>

<ColorOptions {options} />

<div class="option">
  <span class="option-label">Widgets</span>
  <!-- Off keeps the widgets but stops them, so nothing rings in the background. -->
  <Toggle checked={widgetsEnabled(options)} onchange={(checked) => (options.widgets = checked)}>
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
