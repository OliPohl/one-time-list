<!-- src/lib/pages/tasks/components/TaskWidgets.svelte -->
<!-- The widgets of one task, in its card and in the task popup. They're in the store of the task's list (`store`),
     which they need to run and to be dragged out again. `quickRemove`: each has a remove button with its controls
     (the popup), not only in its edit panel. -->
<script>
  import WidgetView from '$lib/widgets/components/WidgetView.svelte';
  import { setWidgets } from '$lib/widgets';

  /**
   * @type {{
   *   store: import('$lib/widgets/store.svelte.js').WidgetStore,
   *   widgets: any[],
   *   quickRemove?: boolean
   * }}
   */
  let { store, widgets, quickRemove = false } = $props();

  // Shown for one list's widgets only, so the store never changes.
  // svelte-ignore state_referenced_locally
  setWidgets(store);
</script>

<div class="task-widgets">
  {#each widgets as widget (widget.id)}
    <WidgetView {widget} {quickRemove} />
  {/each}
</div>


<style>
  .task-widgets {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
