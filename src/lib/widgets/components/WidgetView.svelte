<!-- src/lib/widgets/components/WidgetView.svelte -->
<!-- A widget card: the shared Widget shell filled with the widget's view and editor. -->
<script>
  import Widget from './Widget.svelte';
  import WidgetEditor from './editors/WidgetEditor.svelte';
  import { WIDGET_TYPES } from '../store.svelte.js';
  import { widgetView } from '../views.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  let { widget, variant = 'dock', ghost = false } = $props();

  let type = $derived(WIDGET_TYPES[/** @type {keyof typeof WIDGET_TYPES} */ (widget.type)]);
  let view = $derived(widgetView(widget, widgets));
</script>

{#if type}
  <Widget {widget} {variant} {ghost} icon={type.icon} label={type.label} time={view.time} sub={view.sub} tone={view.tone} controls={view.controls} slots={view.slots}>
    {#snippet editor()}
      <WidgetEditor {widget} store={widgets} />
    {/snippet}
  </Widget>
{/if}
