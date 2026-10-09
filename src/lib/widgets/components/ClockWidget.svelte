<!-- src/lib/widgets/components/ClockWidget.svelte -->
<script>
  import Widget from './Widget.svelte';
  import EditorRow from '../../ui/EditorRow.svelte';
  import Chip from '../../ui/Chip.svelte';
  import TimeField from '../../ui/TimeField.svelte';
  import { WIDGET_TYPES, formatRemaining } from '../store.svelte.js';
  import { getWidgets } from '../context.js';

  const widgets = getWidgets();

  let { widget, variant = 'dock', ghost = false } = $props();

  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  const QUICK_ALARMS = [
    { mode: 'hour', label: 'Every hour' },
    { mode: 'half', label: 'Every 30 min' },
    { mode: 'quarter', label: 'Every 15 min' }
  ];

  let hasAlarm = $derived(widget.alarmMode !== 'off' && widget.nextAt);
  let time = $derived(timeFormat.format(widgets.now));

  let sub = $derived.by(() => {
    if (widget.ringing) return 'Alarm!';
    if (hasAlarm) return `in ${formatRemaining(widget.nextAt - widgets.now)}`;
    return '';
  });

  let tone = $derived(widget.ringing ? 'ring' : hasAlarm ? 'orange' : 'blue');

  let controls = $derived(
    widget.ringing
      ? [{ icon: 'alarm_on', title: 'Confirm Alarm', kind: 'confirm', onclick: () => widgets.confirmAlarm(widget) }]
      : []
  );
</script>

<Widget {widget} {variant} {ghost} icon={WIDGET_TYPES.clock.icon} label={WIDGET_TYPES.clock.label} {time} {sub} {tone} {controls}>
  {#snippet editor()}
    <EditorRow label="Alarm">
      <Chip icon="alarm_off" active={widget.alarmMode === 'off'} onclick={() => widgets.setAlarm(widget, 'off')}>Off</Chip>
      <Chip icon="alarm" active={widget.alarmMode === 'time'} onclick={() => widgets.setAlarm(widget, 'time')}>Alarm</Chip>
      <TimeField
        value={widget.alarmTime}
        active={widget.alarmMode === 'time'}
        onchange={(time) => widgets.setAlarm(widget, 'time', time)} />
    </EditorRow>

    <EditorRow label="Quick Alarms">
      {#each QUICK_ALARMS as quick (quick.mode)}
        <Chip active={widget.alarmMode === quick.mode} onclick={() => widgets.setAlarm(widget, quick.mode)}>{quick.label}</Chip>
      {/each}
    </EditorRow>
  {/snippet}
</Widget>

