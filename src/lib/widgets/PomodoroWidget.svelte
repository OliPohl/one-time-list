<!-- src/lib/widgets/PomodoroWidget.svelte -->
<script>
  import Widget from './Widget.svelte';
  import EditorRow from './ui/EditorRow.svelte';
  import Chip from './ui/Chip.svelte';
  import NumberField from './ui/NumberField.svelte';
  import Toggle from './ui/Toggle.svelte';
  import { widgets, WIDGET_TYPES, POMODORO_PRESETS, remainingOf, formatCountdown } from './widgets.svelte.js';

  let { widget, variant = 'dock', ghost = false } = $props();

  const MINUTE = 60 * 1000;
  /** @type {Record<string, string>} */
  const PHASE_LABELS = { work: 'Focus', short: 'Break', long: 'Long Break' };

  let running = $derived(widget.endsAt !== null);
  let isWork = $derived(widget.phase === 'work');
  let time = $derived(formatCountdown(remainingOf(widget, widgets.now)));

  let sub = $derived.by(() => {
    const phase = PHASE_LABELS[widget.phase];
    if (widget.ringing) return `${phase} done!`;
    return isWork ? `${phase} ${widget.completed + 1}/${widget.every}` : phase;
  });

  let tone = $derived(widget.ringing ? 'ring' : !running ? 'idle' : isWork ? 'orange' : 'blue');

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
    widgets.setPomodoro(widget, {
      work: Number(work) || 1,
      short: Number(short) || 1,
      long: Number(long) || 1,
      every: Number(every) || 1
    });
  }

  let controls = $derived(
    widget.ringing
      ? [
          { icon: 'check_circle', title: `Start ${PHASE_LABELS[isWork ? 'short' : 'work']}`, kind: 'confirm', onclick: () => widgets.advance(widget, true) }
        ]
      : [
          running
            ? { icon: 'pause', title: 'Pause', onclick: () => widgets.pause(widget) }
            : { icon: 'play_arrow', title: 'Start', onclick: () => widgets.start(widget) },
          { icon: 'skip_next', title: 'Skip Phase', onclick: () => widgets.advance(widget, running) },
          { icon: 'restart_alt', title: 'Reset', onclick: () => widgets.reset(widget) }
        ]
  );
</script>

<Widget {widget} {variant} {ghost} icon={WIDGET_TYPES.pomodoro.icon} label={WIDGET_TYPES.pomodoro.label} {time} {sub} {tone} {controls}>
  {#snippet editor()}
    <EditorRow label="Presets">
      {#each POMODORO_PRESETS as preset (preset.name)}
        <Chip active={isPreset(preset)} onclick={() => widgets.setPomodoro(widget, preset)}>
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

    <Toggle checked={widget.startOnSelect} onchange={(checked) => widgets.setOption(widget, 'startOnSelect', checked)}>
      Start when a task is selected
    </Toggle>
  {/snippet}
</Widget>
