<!-- src/lib/widgets/components/WidgetSideLayer.svelte -->
<!-- Widgets placed beside the task column on wide screens, plus the drag ghost. -->
<script>
  import WidgetView from './WidgetView.svelte';
  import DragGhost from './DragGhost.svelte';
  import { layout, SIDE_WIDTH } from '../layout.svelte.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  let { visible = true } = $props();

  let sideWidgets = $derived(widgets.list.filter((widget) => !layout.isDocked(widget)));
  /** @type {Record<string, number>} */
  let heights = $state({});
</script>

<svelte:window bind:innerWidth={layout.width} bind:innerHeight={layout.height} />

<div class="side-layer" class:hidden={!visible}>
  {#each sideWidgets as widget (widget.id)}
    {@const position = layout.sidePosition(widget.pos, heights[widget.id])}
    <div
      class="item"
      style:left="{position.left}px"
      style:top="{position.top}px"
      style:width="{SIDE_WIDTH}px"
      bind:offsetHeight={heights[widget.id]}
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
