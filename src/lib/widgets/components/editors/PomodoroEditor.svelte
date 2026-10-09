<!-- src/lib/widgets/components/editors/PomodoroEditor.svelte -->
<script>
  import EditorRow from '../../../ui/EditorRow.svelte';
  import Chip from '../../../ui/Chip.svelte';
  import NumberField from '../../../ui/NumberField.svelte';
  import Toggle from '../../../ui/Toggle.svelte';
  import { POMODORO_PRESETS } from '../../store.svelte.js';

  /** @type {{widget: any, store: import('../../store.svelte.js').WidgetStore, taskOptions?: boolean}} */
  let { widget, store, taskOptions = true } = $props();

  const MINUTE = 60 * 1000;

  // Edit fields, re-synced whenever the configured durations change.
  let work = $derived(widget.work / MINUTE);
  let short = $derived(widget.short / MINUTE);
  let long = $derived(widget.long / MINUTE);
  let every = $derived(widget.every);

  /** @param {{work: number, short: number, long: number, every: number}} preset */
  function isPreset(preset) {
    return widget.work === preset.work * MINUTE
      && widget.short === preset.short * MINUTE
      && widget.long === preset.long * MINUTE
      && widget.every === preset.every;
  }

  function applySettings() {
    store.setPomodoro(widget, {
      work: Number(work) || 1,
      short: Number(short) || 1,
      long: Number(long) || 1,
      every: Number(every) || 1
    });
  }
</script>

<EditorRow label="Presets">
  {#each POMODORO_PRESETS as preset (preset.name)}
    <Chip active={isPreset(preset)} onclick={() => store.setPomodoro(widget, preset)}>
      {preset.name} {preset.work}/{preset.short}
    </Chip>
  {/each}
</EditorRow>

<EditorRow label="Custom">
  <NumberField bind:value={work} label="Focus" unit="min" min={1} onchange={applySettings} />
  <NumberField bind:value={short} label="Break" unit="min" min={1} onchange={applySettings} />
  <NumberField bind:value={long} label="Long Break" unit="min" min={1} onchange={applySettings} />
  <NumberField bind:value={every} label="Long Break every" unit="sessions" min={1} max={12} onchange={applySettings} />
</EditorRow>

{#if taskOptions}
  <Toggle checked={widget.startOnSelect} onchange={(checked) => store.setOption(widget, 'startOnSelect', checked)}>
    Start when a task is selected
  </Toggle>
{/if}
