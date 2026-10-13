<!-- src/lib/widgets/components/WidgetHeaderArea.svelte -->
<!-- Widgets placed in the free space beside the page title. Fills that space, its width is the room they have. -->
<script>
  import WidgetView from './WidgetView.svelte';
  import { layout, SIDE_WIDTH } from '../layout.svelte.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  let width = $state(0);
  let headerWidgets = $derived(layout.headerIds(widgets.list).map((id) => widgets.get(id)));

  $effect(() => {
    layout.headerRoom = width;
    return () => (layout.headerRoom = 0);
  });
</script>

<div class="header-area" data-widget-area="header" bind:clientWidth={width}>
  {#each headerWidgets as widget (widget.id)}
    <div class="item" data-header-widget={widget.id} style:width="{SIDE_WIDTH}px">
      <WidgetView {widget} variant="side" />
    </div>
  {/each}
</div>


<style>
  .header-area {
    width: 100%;
    min-height: 46px;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    gap: 12px;
  }

  .item {
    flex-shrink: 0;
  }
</style>
