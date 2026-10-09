<!-- src/lib/app/SettingsDialog.svelte -->
<!-- App settings popup, opened from the bottom of the sidebar. Settings get added here later. -->
<script>
  import { fade, scale, slide } from 'svelte/transition';
  import PrivacyPolicy from './PrivacyPolicy.svelte';
  import { settings, THEMES } from './settings.svelte.js';
  import { COLORS } from '../colors.js';

  /** @type {Record<typeof THEMES[number], {label: string, icon: string}>} */
  const THEME_OPTIONS = {
    auto: { label: 'Auto', icon: 'brightness_auto' },
    light: { label: 'Light', icon: 'light_mode' },
    dark: { label: 'Dark', icon: 'dark_mode' }
  };

  /** @type {HTMLButtonElement | undefined} */
  let closeButton = $state();
  let privacyOpen = $state(false);

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
      <h3 class="setting-label" id="colors-label">Colors</h3>
      <div class="color-options" role="radiogroup" aria-labelledby="colors-label">
        {#each Object.entries(COLORS) as [key, colors] (key)}
          <button
            class="color-option"
            class:selected={settings.colors === key}
            role="radio"
            aria-checked={settings.colors === key}
            style:--preview-wave={colors.wave}
            style:--preview-accent={colors.accent}
            style:--preview-task={colors.task}
            onclick={() => (settings.colors = key)}>
            <!-- A tiny sidebar next to a page: that's where the default colors show. -->
            <span class="preview" aria-hidden="true">
              <span class="mini-sidebar">
                <span class="mini-menu"></span>
                <span class="mini-label"></span>
                <span class="mini-row active"></span>
                <span class="mini-row"></span>
                <span class="mini-slider"><span class="mini-thumb"></span></span>
              </span>
              <span class="mini-page">
                <span class="mini-title"></span>
                <span class="mini-line"></span>
                <span class="mini-line short"></span>
                <span class="mini-button"></span>
              </span>
            </span>
            <span class="color-name">{colors.label}</span>
          </button>
        {/each}
      </div>
    </section>

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

    <!-- At the bottom, opens below so the settings stay short. -->
    <section class="setting privacy">
      <!-- Looks like plain text (like "Show History" on Tasks pages), still a button for keyboards and screen readers. -->
      <button class="privacy-toggle" aria-expanded={privacyOpen} onclick={() => (privacyOpen = !privacyOpen)}>
        <span>{privacyOpen ? 'Hide Privacy Policy' : 'Privacy Policy'}</span>
        <span class="chevron m3-icon" class:open={privacyOpen} aria-hidden="true">expand_more</span>
      </button>
      {#if privacyOpen}
        <div transition:slide={{ duration: 250 }}>
          <PrivacyPolicy />
        </div>
      {/if}
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

  .color-options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;
  }

  .color-option {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 7px 7px 9px;
    background-color: var(--surface);
    border: 2.5px solid var(--line);
    border-radius: 22px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    cursor: pointer;
    transition: border-color 0.4s, color 0.4s;
  }

  .color-option:hover {
    border-color: var(--text-muted);
  }

  .color-option.selected {
    border-color: var(--preview-accent);
    color: var(--preview-accent);
  }

  .preview {
    height: 64px;
    display: flex;
    gap: 5px;
    padding: 5px;
    overflow: hidden;
    border-radius: 15px;
    background-color: var(--bg);
    box-sizing: border-box;
  }

  .mini-sidebar {
    width: 44%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 5px 4px;
    border-radius: 10px;
    background-color: var(--surface-raised);
    box-sizing: border-box;
  }

  .mini-menu {
    width: 9px;
    height: 6px;
    border-top: 1.5px solid var(--preview-accent);
    border-bottom: 1.5px solid var(--preview-accent);
    box-sizing: border-box;
  }

  .mini-label {
    width: 55%;
    height: 3px;
    border-radius: 3px;
    background-color: var(--preview-task);
  }

  .mini-row {
    height: 6px;
    border-radius: 6px;
    background-color: var(--line);
  }

  .mini-row.active {
    background-color: var(--preview-accent);
  }

  .mini-slider {
    position: relative;
    margin-top: auto;
    height: 3px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--preview-accent) 60%, var(--line) 60%);
  }

  .mini-thumb {
    position: absolute;
    left: 60%;
    top: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--preview-accent);
    translate: -50% -50%;
  }

  .mini-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 5px 2px;
  }

  .mini-title {
    width: 70%;
    height: 5px;
    border-radius: 5px;
    background-color: var(--preview-accent);
  }

  .mini-line {
    height: 3px;
    border-radius: 3px;
    background-color: var(--line);
  }

  .mini-line.short {
    width: 60%;
  }

  .mini-button {
    align-self: flex-end;
    margin-top: auto;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--preview-wave);
  }

  .color-name {
    text-align: center;
  }

  .privacy {
    padding-top: 14px;
    border-top: 1.5px solid var(--surface-active);
  }

  .privacy-toggle {
    align-self: center;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    cursor: pointer;
    transition: color 0.4s;
  }

  .privacy-toggle:hover,
  .privacy-toggle:focus-visible {
    color: var(--accent);
  }

  /* Points down while closed, turns up when open. */
  .chevron {
    font-size: 20px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
    transition: transform 0.25s;
  }

  .chevron.open {
    transform: rotate(180deg);
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
