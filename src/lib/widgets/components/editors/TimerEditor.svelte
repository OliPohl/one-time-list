<!-- src/lib/widgets/components/editors/TimerEditor.svelte -->
<script>
  import EditorRow from '../../../ui/EditorRow.svelte';
  import Chip from '../../../ui/Chip.svelte';
  import NumberField from '../../../ui/NumberField.svelte';
  import Toggle from '../../../ui/Toggle.svelte';

  /** @type {{widget: any, store: import('../../store.svelte.js').WidgetStore, taskOptions?: boolean}} */
  let { widget, store, taskOptions = true } = $props();

  const MINUTE = 60 * 1000;
  const QUICK_DURATIONS = [15, 30, 60];

  // Edit fields, re-synced whenever the configured duration changes.
  let minutes = $derived(Math.floor(widget.duration / MINUTE));
  let seconds = $derived(Math.round((widget.duration % MINUTE) / 1000));

  function applyDuration() {
    const ms = ((Number(minutes) || 0) * 60 + (Number(seconds) || 0)) * 1000;
    store.setDuration(widget, ms);
  }
</script>

<EditorRow label="Duration">
  <NumberField bind:value={minutes} unit="min" onchange={applyDuration} />
  <NumberField bind:value={seconds} unit="sec" max={59} onchange={applyDuration} />
</EditorRow>

<EditorRow label="Quick Actions">
  {#each QUICK_DURATIONS as quick (quick)}
    <Chip active={widget.duration === quick * MINUTE} onclick={() => store.setDuration(widget, quick * MINUTE)}>
      {quick === 60 ? '1 hour' : `${quick} min`}
    </Chip>
  {/each}
</EditorRow>

{#if taskOptions}
  <Toggle checked={widget.autoStart} onchange={(checked) => store.setOption(widget, 'autoStart', checked)}>
    Start when a task is completed
  </Toggle>

  <Toggle checked={widget.startOnSelect} onchange={(checked) => store.setOption(widget, 'startOnSelect', checked)}>
    Start when a task is selected
  </Toggle>
{/if}
