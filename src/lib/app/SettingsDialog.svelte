<!-- src/lib/app/SettingsDialog.svelte -->
<!-- App settings popup, opened from the bottom of the sidebar. Settings get added here later. -->
<script>
  import { fade, scale } from 'svelte/transition';
  import { settings, THEMES } from './settings.svelte.js';

  /** @type {Record<typeof THEMES[number], {label: string, icon: string}>} */
  const THEME_OPTIONS = {
    auto: { label: 'Auto', icon: 'brightness_auto' },
    light: { label: 'Light', icon: 'light_mode' },
    dark: { label: 'Dark', icon: 'dark_mode' }
  };

  /** @type {HTMLButtonElement | undefined} */
  let closeButton = $state();

  $effect(() => closeButton?.focus());

  function close() {
    settings.dialogOpen = false;
  }

  // Capture phase, so Escape doesn't also close the sidebar behind the dialog.
  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    close();
  }
</script>

<svelte:window onkeydowncapture={handleKeyDown} />

<div class="dialog-layer" data-dialog>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={close}></div>

  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" transition:scale={{ duration: 200, start: 0.94 }}>
    <div class="head">
      <h2 class="title" id="settings-title">Settings</h2>
      <button class="close-btn m3-icon" title="Close" bind:this={closeButton} onclick={close}>close</button>
    </div>

    <section class="setting">
      <h3 class="setting-label" id="theme-label">Appearance</h3>
      <div class="segments" role="radiogroup" aria-labelledby="theme-label">
        {#each THEMES as theme (theme)}
          <button
            class="segment"
            class:selected={settings.theme === theme}
            role="radio"
            aria-checked={settings.theme === theme}
            onclick={() => (settings.theme = theme)}>
            <span class="segment-icon m3-icon">{THEME_OPTIONS[theme].icon}</span>
            <span>{THEME_OPTIONS[theme].label}</span>
          </button>
        {/each}
      </div>
    </section>
  </div>
</div>


<style>
  .dialog-layer {
    position: fixed;
    inset: 0;
    z-index: 4000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background-color: var(--scrim);
  }

  .dialog {
    position: relative;
    box-sizing: border-box;
    width: min(100%, 480px);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 30px;
    box-shadow: 0 12px 40px var(--shadow);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .title {
    margin: 0;
    font-family: "Stoke", serif;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .close-btn {
    padding: 4px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 26px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 26;
    cursor: pointer;
    transition: color 0.4s;
  }

  .close-btn:hover {
    color: var(--text);
  }

  .setting {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .setting-label {
    margin: 0;
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    font-weight: 400;
    color: var(--text-muted);
  }

  .segments {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .segment {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 12px;
    background: none;
    border: 2.5px solid var(--line);
    border-radius: 40px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    cursor: pointer;
    transition: color 0.4s, border-color 0.4s;
  }

  .segment:hover {
    border-color: var(--text-muted);
  }

  .segment.selected {
    border-color: var(--accent);
    color: var(--accent);
  }

  .segment-icon {
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
  }
</style>
