<!-- src/lib/pages/tasks/components/Grain.svelte -->
<!-- Subtle grain behind the whole page, tinted with the accent color. -->
<script>
  import { grainUrl, GRAIN_SIZE } from '../../../utils/grain.js';

  const mask = grainUrl();
</script>

<div
  class="grain"
  style:mask-image={mask}
  style:-webkit-mask-image={mask}
  style:mask-size="{GRAIN_SIZE}px"
  style:-webkit-mask-size="{GRAIN_SIZE}px"
  aria-hidden="true"
></div>


<style>
  .grain {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background-color: color-mix(in srgb, var(--accent) 5%, transparent);
  }
</style>
