<!-- src/lib/widgets/TimerWidget.svelte -->
<script>
  import Widget from './Widget.svelte';
  import EditorRow from './ui/EditorRow.svelte';
  import Chip from './ui/Chip.svelte';
  import NumberField from './ui/NumberField.svelte';
  import Toggle from './ui/Toggle.svelte';
  import { widgets, WIDGET_TYPES, remainingOf, formatCountdown } from './widgets.svelte.js';

  let { widget, variant = 'dock', ghost = false } = $props();

  const MINUTE = 60 * 1000;
  const QUICK_DURATIONS = [15, 30, 60];

  let running = $derived(widget.endsAt !== null);
  let time = $derived(formatCountdown(remainingOf(widget, widgets.now)));
  let sub = $derived(widget.ringing ? "Time's up!" : running ? 'Running' : widget.remaining < widget.duration ? 'Paused' : '');
  let tone = $derived(widget.ringing ? 'ring' : running ? 'orange' : 'idle');

  // Edit fields, re-synced whenever the configured duration changes.
  let minutes = $derived(Math.floor(widget.duration / MINUTE));
  let seconds = $derived(Math.round((widget.duration % MINUTE) / 1000));

  function applyDuration() {
    const ms = ((Number(minutes) || 0) * 60 + (Number(seconds) || 0)) * 1000;
    widgets.setDuration(widget, ms);
  }

  let controls = $derived(
    widget.ringing
      ? [
          { icon: 'check_circle', title: 'Confirm', kind: 'confirm', onclick: () => widgets.reset(widget) }
        ]
      : [
          running
            ? { icon: 'pause', title: 'Pause', onclick: () => widgets.pause(widget) }
            : { icon: 'play_arrow', title: 'Start', onclick: () => widgets.start(widget) },
          { icon: 'restart_alt', title: 'Reset', onclick: () => widgets.reset(widget) }
        ]
  );
</script>

<Widget {widget} {variant} {ghost} icon={WIDGET_TYPES.timer.icon} label={WIDGET_TYPES.timer.label} {time} {sub} {tone} {controls}>
  {#snippet editor()}
    <EditorRow label="Duration">
      <NumberField bind:value={minutes} unit="min" onchange={applyDuration} />
      <NumberField bind:value={seconds} unit="sec" max={59} onchange={applyDuration} />
    </EditorRow>

    <EditorRow label="Quick Actions">
      {#each QUICK_DURATIONS as quick (quick)}
        <Chip active={widget.duration === quick * MINUTE} onclick={() => widgets.setDuration(widget, quick * MINUTE)}>
          {quick === 60 ? '1 hour' : `${quick} min`}
        </Chip>
      {/each}
    </EditorRow>

    <Toggle checked={widget.autoStart} onchange={(checked) => widgets.setAutoStart(widget, checked)}>
      Start timer when a task is completed
    </Toggle>
  {/snippet}
</Widget>
