<!-- src/lib/widgets/components/WidgetSideLayer.svelte -->
<!-- Widgets placed freely on the screen (beside or below the tasks, see layout.svelte.js), plus the drag ghost. -->
<script>
  import WidgetView from './WidgetView.svelte';
  import DragGhost from './DragGhost.svelte';
  import { layout, SIDE_WIDTH } from '../layout.svelte.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  let { visible = true } = $props();

  let freeWidgets = $derived(widgets.list.filter((widget) => widget.pos?.area === 'free' && !layout.isDocked(widget)));
</script>

<svelte:window bind:innerWidth={layout.width} bind:innerHeight={layout.height} />

<div class="side-layer" class:hidden={!visible}>
  {#each freeWidgets as widget (widget.id)}
    {@const position = layout.freePosition(widget.pos, layout.heights[widget.id])}
    <div
      class="item"
      style:left="{position.left}px"
      style:top="{position.top}px"
      style:width="{SIDE_WIDTH}px"
      bind:offsetHeight={layout.heights[widget.id]}
    >
      <WidgetView {widget} variant="side" />
    </div>
  {/each}
</div>

{#if layout.drag}
  {@const widget = widgets.get(layout.drag.id)}
  {#if widget}
    <DragGhost {widget} drag={layout.drag} />
  {/if}
{/if}


<style>
  .side-layer {
    position: fixed;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    transition: transform 2s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .side-layer.hidden {
    transform: translateY(-100%);
  }

  .item {
    position: absolute;
    pointer-events: all;
  }
</style>
