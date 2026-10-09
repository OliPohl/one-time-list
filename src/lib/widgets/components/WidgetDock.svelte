<!-- src/lib/widgets/components/WidgetDock.svelte -->
<!-- Default widget position: stacked above the "Add Widget" button, below the current task. -->
<script>
  import { flip } from 'svelte/animate';
  import WidgetView from './WidgetView.svelte';
  import AddWidget from './AddWidget.svelte';
  import { layout } from '../layout.svelte.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

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
    margin-top: 15px;
    background-color: #0c0c0c;
    padding:10px;
    border-radius: 30px;
  }

  .item {
    width: 100%;
  }
</style>
