<!-- src/lib/widgets/WidgetDock.svelte -->
<!-- Default widget position: stacked above the "Add Widget" button, below the current task. -->
<script>
  import { flip } from 'svelte/animate';
  import WidgetView from './WidgetView.svelte';
  import AddWidget from './AddWidget.svelte';
  import { widgets, layout } from './widgets.svelte.js';

  let docked = $derived(widgets.list.filter((widget) => layout.isDocked(widget)));
</script>

<div class="dock">
  {#each docked as widget (widget.id)}
    <div class="item" data-dock-widget={widget.id} animate:flip={{ duration: 300 }}>
      <WidgetView {widget} />
    </div>
  {/each}

  <AddWidget />
</div>


<style>
  .dock {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding-top: 25px;
  }

  .item {
    width: 100%;
  }
</style>
