<!-- src/lib/pages/widget-pages/WidgetPage.svelte -->
<!-- A widget as a minimal page: icon, title and settings, the time in big, its status and the controls. -->
<script>
  import { widgetOf, getWidgetPageStore } from './store.svelte.js';
  import { widgetView } from '$lib/widgets/views.js';
  import { WIDGET_TYPES } from '$lib/widgets/store.svelte.js';
  import PageHeader from '$lib/app/PageHeader.svelte';
  import Grain from '$lib/ui/Grain.svelte';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  // The page view is re-created for every page, so the store never changes.
  // svelte-ignore state_referenced_locally
  const store = getWidgetPageStore(page);

  let widget = $derived(widgetOf(page));
  /** @type {import('$lib/widgets/views.js').View | undefined} */
  let view = $derived(widget && widgetView(widget, store, { long: true }));
  // While it rings the page only offers the confirm button, the widget cards keep all their controls.
  let controls = $derived(view?.tone === 'ring' ? view.controls.filter((control) => control.kind === 'confirm') : (view?.controls ?? []));
  // Roboto Slab has no equal width digits, so every digit gets a slot as wide as the widest one.
  // Otherwise the centered time wiggles whenever a digit changes.
  let timeChars = $derived(view ? [...view.time] : []);
  let icon = $derived(WIDGET_TYPES[/** @type {keyof typeof WIDGET_TYPES} */ (page.type)].icon);
</script>

<Grain />

<main class="widget-page">
  <PageHeader {page} {icon} centered />

  {#if view}
    <div class="time {view.tone}" aria-label={view.time}>
      {#each timeChars as char, index (index)}
        <span class:digit={char >= '0' && char <= '9'} aria-hidden="true">{char}</span>
      {/each}
    </div>
    <div class="sub">{view.sub}</div>

    <div class="controls">
      {#each controls as control (control.title)}
        {#if control.kind === 'confirm'}
          <button class="confirm" title={control.title} onclick={control.onclick}>
            <span class="confirm-icon m3-icon">{control.icon}</span>
            <span>{control.label ?? control.title}</span>
          </button>
        {:else}
          <button class="control m3-icon" title={control.title} onclick={control.onclick}>{control.icon}</button>
        {/if}
      {/each}
    </div>
  {/if}
</main>


<style>
  .widget-page {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 80px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text);
    font-family: "Roboto Slab", serif;
  }

  /* Same colors as the widget border in the dock. */
  .time {
    margin-top: 18px;
    font-size: clamp(64px, 20vw, 150px);
    line-height: 1.05;
    white-space: nowrap;
    color: var(--tone-idle);
    transition: color 0.4s;
  }

  /* Width of the widest digit ("4") in Roboto Slab. */
  .digit {
    display: inline-block;
    width: 0.58em;
    text-align: center;
  }

  .time.blue {
    color: var(--tone-blue);
  }

  .time.orange {
    color: var(--tone-orange);
  }

  .time.ring {
    animation: ring 2s ease-in-out infinite;
  }

  @keyframes ring {
    0%, 100% { color: var(--tone-idle); }
    50% { color: var(--tone-ring); }
  }

  /* Keeps its height while empty, so the controls don't jump when a status appears. */
  .sub {
    min-height: 1.5em;
    font-size: 20px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* Fixed height: the page is centered, a row that changes height (buttons swapped for "Dismiss") moves everything. */
  .controls {
    height: 64px;
    margin-top: 22px;
    display: flex;
    align-items: center;
    gap: 22px;
  }

  .control {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-soft);
    font-size: 44px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 44;
    transition: color 0.4s, font-variation-settings 0.7s;
  }

  .control:hover {
    color: var(--text);
  }

  .control:active {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 44;
    transition: none;
  }

  .confirm {
    height: 60px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 30px 0 24px;
    background-color: var(--surface);
    border: 2.5px solid var(--tone-ring);
    border-radius: 40px;
    color: var(--tone-ring);
    font-family: "Roboto Slab", serif;
    font-size: 20px;
    cursor: pointer;
    transition: transform 0.15s;
    /* Blinks with the ringing time. */
    animation: confirm-blink 2s ease-in-out infinite;
  }

  @keyframes confirm-blink {
    0%, 100% { color: var(--tone-idle); border-color: var(--tone-idle); }
    50% { color: var(--tone-ring); border-color: var(--tone-ring); }
  }

  .confirm:hover {
    animation: none;
    color: var(--red-hover);
    border-color: var(--red-hover);
  }

  .confirm:active {
    transform: scale(0.97);
  }

  .confirm-icon {
    font-size: 30px;
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 30;
  }
</style>
