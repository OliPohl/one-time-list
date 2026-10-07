<!-- src/lib/widgets/DragGhost.svelte -->
<!-- Follows the pointer while a widget is dragged and morphs from task shape to a square card. -->
<script>
  import { onMount } from 'svelte';
  import WidgetView from './WidgetView.svelte';
  import { SIDE_WIDTH } from './widgets.svelte.js';

  let { widget, drag } = $props();

  let morphed = $state(false);

  onMount(() => {
    // Wait two frames so the start size is painted before morphing.
    requestAnimationFrame(() => requestAnimationFrame(() => (morphed = true)));
  });
</script>

<div
  class="ghost"
  style:left="{drag.x}px"
  style:top="{drag.y - drag.offsetY}px"
  style:width="{morphed ? SIDE_WIDTH : drag.startWidth}px"
  style:transform="translateX({-drag.ratioX * 100}%)"
>
  <WidgetView {widget} variant={morphed ? 'drag' : 'dock'} ghost />
</div>


<style>
  .ghost {
    position: fixed;
    z-index: 2000;
    pointer-events: none;
    transition: width 0.3s cubic-bezier(0.76, 0, 0.24, 1);
  }
</style>
