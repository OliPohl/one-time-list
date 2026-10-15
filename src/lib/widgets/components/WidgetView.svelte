<!-- src/lib/widgets/components/WidgetView.svelte -->
<!-- A widget card: the shared Widget shell filled with the widget's view and editor. -->
<script>
  import Widget from './Widget.svelte';
  import WidgetEditor, { EDITORS } from './editors/WidgetEditor.svelte';
  import CalculatorPad from './CalculatorPad.svelte';
  import WidgetImage from './WidgetImage.svelte';
  import WidgetWhiteboard from './WidgetWhiteboard.svelte';
  import { WIDGET_TYPES } from '../store.svelte.js';
  import { widgetView } from '../views.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  /** `quickRemove`: a remove button with the controls too, see Widget. */
  let { widget, variant = 'dock', ghost = false, quickRemove = false } = $props();

  let type = $derived(WIDGET_TYPES[/** @type {keyof typeof WIDGET_TYPES} */ (widget.type)]);
  let view = $derived(widgetView(widget, widgets));
  let isCalculator = $derived(widget.type === 'calculator');
  let isImage = $derived(widget.type === 'image');
  /** The calculator takes the keyboard after it was clicked. */
  let active = $state(false);
</script>

{#snippet editor()}
  <WidgetEditor {widget} store={widgets} />
{/snippet}

{#snippet keypad()}
  <CalculatorPad {widget} {ghost} bind:active />
{/snippet}

{#snippet picture()}
  <WidgetImage {widget} {variant} />
{/snippet}

{#snippet drawing()}
  <WidgetWhiteboard {widget} {ghost} />
{/snippet}

{#if type}
  <Widget
    {widget}
    {variant}
    {ghost}
    icon={type.icon}
    label={type.label}
    time={view.time}
    sub={view.sub}
    tone={view.tone}
    controls={view.controls}
    slots={view.slots}
    progress={view.progress}
    breakEnd={view.breakEnd}
    focused={active}
    fitTime={isCalculator}
    {quickRemove}
    bare={(isImage && Boolean(widget.src)) || widget.type === 'whiteboard'}
    editor={EDITORS[widget.type] ? editor : undefined}
    body={isCalculator ? keypad : isImage && widget.src ? picture : widget.type === 'whiteboard' ? drawing : undefined} />
{/if}
