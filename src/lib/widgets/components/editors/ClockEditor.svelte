<!-- src/lib/widgets/components/editors/ClockEditor.svelte -->
<script>
  import EditorRow from '../../../ui/EditorRow.svelte';
  import Chip from '../../../ui/Chip.svelte';
  import TimeField from '../../../ui/TimeField.svelte';
  import Toggle from '../../../ui/Toggle.svelte';

  /** @type {{widget: any, store: import('../../store.svelte.js').WidgetStore}} */
  let { widget, store } = $props();

  const QUICK_ALARMS = [
    { mode: 'hour', label: 'Every hour' },
    { mode: 'half', label: 'Every 30 min' },
    { mode: 'quarter', label: 'Every 15 min' }
  ];
</script>

<EditorRow label="Alarm">
  <Chip icon="alarm_off" active={widget.alarmMode === 'off'} onclick={() => store.setAlarm(widget, 'off')}>Off</Chip>
  <Chip icon="alarm" active={widget.alarmMode === 'time'} onclick={() => store.setAlarm(widget, 'time')}>Alarm</Chip>
  <TimeField
    value={widget.alarmTime}
    active={widget.alarmMode === 'time'}
    onchange={(time) => store.setAlarm(widget, 'time', time)} />
</EditorRow>

<EditorRow label="Quick Alarms">
  {#each QUICK_ALARMS as quick (quick.mode)}
    <Chip active={widget.alarmMode === quick.mode} onclick={() => store.setAlarm(widget, quick.mode)}>{quick.label}</Chip>
  {/each}
</EditorRow>

<Toggle checked={widget.showSeconds} onchange={(checked) => store.setOption(widget, 'showSeconds', checked)}>
  Show seconds
</Toggle>
