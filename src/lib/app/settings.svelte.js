// src/lib/app/settings.svelte.js
// App wide settings, saved in the browser. The volume is changed in the sidebar, everything else in the
// settings dialog (`SettingsDialog.svelte`).

import { setVolume as applyVolume } from '../utils/sounds.js';
import { loadJSON, saveJSON } from '../utils/storage.js';

const STORAGE_KEY = 'otl_settings';
/** `auto` follows the system setting. */
export const THEMES = /** @type {const} */ (['auto', 'light', 'dark']);
/** Volume used when unmuting after the slider was dragged all the way down. */
const UNMUTE_VOLUME = 0.5;

class AppSettings {
  /** 0 to 1, kept while muted so unmuting returns to it. */
  volume = $state(0.5);
  muted = $state(false);
  /** @type {typeof THEMES[number]} */
  theme = $state('auto');
  /** The system prefers light mode, followed while `theme` is `auto`. */
  systemLight = $state(false);
  dialogOpen = $state(false);

  /** The theme that is shown. */
  resolvedTheme = $derived(this.theme === 'auto' ? (this.systemLight ? 'light' : 'dark') : this.theme);

  /** What the sounds actually play at. */
  effectiveVolume = $derived(this.muted ? 0 : this.volume);

  load() {
    const saved = loadJSON(STORAGE_KEY, /** @type {{volume?: number, muted?: boolean, theme?: string}} */ ({}));
    if (typeof saved.volume === 'number') this.volume = Math.min(1, Math.max(0, saved.volume));
    this.muted = saved.muted === true;
    this.theme = THEMES.find((theme) => theme === saved.theme) ?? 'auto';

    const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
    this.systemLight = lightQuery.matches;
    lightQuery.addEventListener('change', (event) => (this.systemLight = event.matches));

    $effect.root(() => {
      $effect(() => {
        saveJSON(STORAGE_KEY, { volume: this.volume, muted: this.muted, theme: this.theme });
        applyVolume(this.effectiveVolume);
      });

      // global.css switches every color on this attribute.
      $effect(() => {
        document.documentElement.dataset.theme = this.resolvedTheme;
      });
    });
  }

  /** @param {number} value 0 to 1, from the slider */
  setVolume(value) {
    this.volume = value;
    this.muted = value === 0;
    // Right away, not only in the effect, so a preview note played next already uses it.
    applyVolume(this.effectiveVolume);
  }

  toggleMute() {
    if (this.muted && this.volume === 0) this.volume = UNMUTE_VOLUME;
    this.muted = !this.muted;
    applyVolume(this.effectiveVolume);
  }
}

export const settings = new AppSettings();
