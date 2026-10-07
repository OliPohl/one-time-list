<!-- src/lib/widgets/WidgetView.svelte -->
<!-- Picks the matching component for a widget's type. -->
<script>
  import ClockWidget from './ClockWidget.svelte';
  import TimerWidget from './TimerWidget.svelte';
  import PomodoroWidget from './PomodoroWidget.svelte';

  /** @type {Record<string, import('svelte').Component<any>>} */
  const COMPONENTS = { clock: ClockWidget, timer: TimerWidget, pomodoro: PomodoroWidget };

  let { widget, variant = 'dock', ghost = false } = $props();

  let Component = $derived(COMPONENTS[widget.type]);
</script>

{#if Component}
  <Component {widget} {variant} {ghost} />
{/if}
