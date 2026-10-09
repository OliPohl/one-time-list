<!-- src/lib/app/VolumeControl.svelte -->
<!-- Volume of all sounds: the icon mutes, the slider sets the level and plays a note at the new volume. -->
<script>
  import { settings } from './settings.svelte.js';
  import { playVolumePreview } from '../utils/sounds.js';
  import { COLORS } from '../pages/tasks/colors.js';

  /** Icon and slider turn crimson red while there is no sound. */
  const SILENT_COLOR = COLORS.crimson.wave;

  /** Dragging fires many input events, the preview note plays at most this often. */
  const PREVIEW_INTERVAL = 150;
  let lastPreview = 0;

  let shown = $derived(settings.effectiveVolume);
  // The icon font has a speaker with no, one and two waves.
  let icon = $derived(shown === 0 ? 'volume_off' : shown <= 1 / 3 ? 'volume_mute' : shown <= 2 / 3 ? 'volume_down' : 'volume_up');

  function preview() {
    const now = performance.now();
    if (now - lastPreview < PREVIEW_INTERVAL) return;
    lastPreview = now;
    playVolumePreview();
  }

  /** @param {Event & {currentTarget: HTMLInputElement}} event */
  function handleInput(event) {
    settings.setVolume(Number(event.currentTarget.value) / 100);
    preview();
  }

  function toggleMute() {
    settings.toggleMute();
    if (!settings.muted) preview();
  }
</script>

<div class="volume" class:silent={shown === 0} style:--silent={SILENT_COLOR}>
  <button class="mute-btn m3-icon" title={settings.muted ? 'Unmute' : 'Mute'} aria-pressed={settings.muted} onclick={toggleMute}>{icon}</button>
  <input
    class="slider"
    type="range"
    min="0"
    max="100"
    step="1"
    aria-label="Volume"
    value={Math.round(shown * 100)}
    style:--fill="{shown * 100}%"
    oninput={handleInput}
    onchange={preview} />
</div>


<style>
  .volume {
    --slider-color: var(--accent);

    display: flex;
    align-items: center;
    gap: 10px;
    height: var(--sidebar-item-height, 48px);
    padding: 0 16px 0 10px;
  }

  .mute-btn {
    flex-shrink: 0;
    padding: 4px;
    background: none;
    border: none;
    color: var(--text-soft);
    font-size: 25px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 25;
    cursor: pointer;
    transition: color 0.4s;
  }

  .mute-btn:hover {
    color: var(--accent);
  }

  .volume.silent {
    --slider-color: var(--silent);
  }

  .silent .mute-btn {
    color: var(--silent);
  }

  .slider {
    flex: 1;
    min-width: 0;
    height: 24px;
    margin: 0;
    background: none;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
  }

  /* Track: accent up to the thumb, grey after it. */
  .slider::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 6px;
    background: linear-gradient(to right, var(--slider-color) var(--fill), var(--line) var(--fill));
  }

  .slider::-moz-range-track {
    height: 6px;
    border-radius: 6px;
    background: linear-gradient(to right, var(--slider-color) var(--fill), var(--line) var(--fill));
  }

  .slider::-webkit-slider-thumb {
    width: 18px;
    height: 18px;
    margin-top: -6px;
    border: none;
    border-radius: 50%;
    background-color: var(--slider-color);
    -webkit-appearance: none;
    appearance: none;
  }

  .slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 50%;
    background-color: var(--slider-color);
  }

  .slider:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--text);
  }

  .slider:focus-visible::-moz-range-thumb {
    outline: 2px solid var(--text);
  }
</style>
