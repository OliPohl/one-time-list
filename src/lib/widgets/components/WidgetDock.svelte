<!-- src/lib/widgets/components/WidgetDock.svelte -->
<!-- Default widget position: stacked above the "Add Widget" button, below the current task. `isDocked` picks the
     widgets shown here, by default the ones that aren't placed freely on the screen (see layout.svelte.js).
     `fixedMenu`: the "Add Widget" menu is drawn over everything, for a dock inside something that scrolls. -->
<script>
  import { flip } from 'svelte/animate';
  import WidgetView from './WidgetView.svelte';
  import AddWidget from './AddWidget.svelte';
  import { layout } from '../layout.svelte.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  /** @type {{isDocked?: (widget: any) => boolean, fixedMenu?: boolean}} */
  let { isDocked = (widget) => layout.isDocked(widget), fixedMenu = false } = $props();

  // A task's own widgets are shown in the task.
  let docked = $derived(widgets.list.filter((widget) => !widget.taskId && isDocked(widget)));
</script>

<div class="dock" data-widget-dock>
  {#each docked as widget (widget.id)}
    <div class="item" data-dock-widget={widget.id} animate:flip={{ duration: 300 }}>
      <WidgetView {widget} />
    </div>
  {/each}

  <AddWidget fixed={fixedMenu} />
</div>


<style>
  .dock {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-top: 15px;
    background-color: var(--surface-raised);
    padding:10px;
    border-radius: 30px;
  }

  .item {
    width: 100%;
  }
</style>
