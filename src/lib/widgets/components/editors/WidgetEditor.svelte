<!-- src/lib/widgets/components/editors/WidgetEditor.svelte -->
<!-- The settings of a widget, picked by its type. Used in the widget's edit panel and for widget pages. -->
<script>
  import ClockEditor from './ClockEditor.svelte';
  import TimerEditor from './TimerEditor.svelte';
  import PomodoroEditor from './PomodoroEditor.svelte';

  /** @type {Record<string, import('svelte').Component<any>>} */
  const EDITORS = { clock: ClockEditor, timer: TimerEditor, pomodoro: PomodoroEditor };

  /**
   * `taskOptions` false hides the options that react to tasks, for widgets without a task list.
   * @type {{widget: any, store: import('../../store.svelte.js').WidgetStore, taskOptions?: boolean}}
   */
  let { widget, store, taskOptions = true } = $props();

  let Editor = $derived(EDITORS[widget.type]);
</script>

{#if Editor}
  <Editor {widget} {store} {taskOptions} />
{/if}
