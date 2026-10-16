<!-- src/lib/app/PageFinder.svelte -->
<!-- Finds a page by its name and opens it, from a keyboard shortcut (Shift T by default, see shortcuts.svelte.js).
     Lists the dashboard and every page in sidebar order, the arrow keys (or Ctrl J, Ctrl K) pick one, Enter opens it. -->
<script>
  import { fade, scale } from 'svelte/transition';
  import { PAGE_TYPES } from '../pages/index.js';
  import { pages } from './pages.svelte.js';
  import { folders, pageIdsIn } from './folders.svelte.js';
  import { navigation } from './navigation.svelte.js';
  import { shortcuts } from './shortcuts.svelte.js';

  let query = $state('');
  let index = $state(0);
  /** @type {HTMLInputElement | undefined} */
  let input = $state();
  /** @type {HTMLElement | undefined} */
  let list = $state();

  /** @typedef {{key: string, name: string, icon: string, type: string, view: import('./navigation.svelte.js').View}} Result */

  /** @type {Result[]} */
  let everything = $derived([
    { key: 'dashboard', name: 'Dashboard', icon: 'dashboard', type: '', view: { kind: 'dashboard' } },
    ...pageIdsIn(folders.tree).flatMap((id) => {
      const page = pages.get(id);
      if (!page) return [];
      const type = PAGE_TYPES[page.type];
      return [{ key: id, name: page.name, icon: type.icon, type: type.label, view: /** @type {const} */ ({ kind: 'page', id }) }];
    })
  ]);

  // Names that start with what's typed first, then names that have it anywhere.
  let results = $derived.by(() => {
    const typed = query.trim().toLowerCase();
    if (!typed) return everything;
    const starts = everything.filter((result) => result.name.toLowerCase().startsWith(typed));
    const contains = everything.filter((result) => !starts.includes(result) && result.name.toLowerCase().includes(typed));
    return [...starts, ...contains];
  });

  $effect(() => {
    void query;
    index = 0;
  });

  $effect(() => input?.focus());

  // The picked one stays in view.
  $effect(() => {
    list?.children[index]?.scrollIntoView({ block: 'nearest' });
  });

  function close() {
    shortcuts.finderOpen = false;
  }

  /** @param {Result | undefined} result */
  function open(result) {
    if (!result) return;
    navigation.go(result.view);
    close();
  }

  // Capture phase, so Escape doesn't also close the sidebar behind it.
  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    // Typing the name, J and K move with Ctrl (like Vim's in a list).
    const ctrl = event.ctrlKey && !event.altKey && !event.metaKey;
    const down = event.key === 'ArrowDown' || (ctrl && event.key.toLowerCase() === 'j');
    const up = event.key === 'ArrowUp' || (ctrl && event.key.toLowerCase() === 'k');
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    } else if (down || up) {
      event.preventDefault();
      const count = results.length;
      if (count) index = (index + (down ? 1 : -1) + count) % count;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      open(results[index]);
    }
  }
</script>

<svelte:window onkeydowncapture={handleKeyDown} />

<div class="dialog-layer" data-dialog>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 150 }} onclick={close}></div>

  <div class="finder" role="dialog" aria-modal="true" aria-label="Find a Page" transition:scale={{ duration: 150, start: 0.96 }}>
    <label class="search">
      <span class="search-icon m3-icon">search</span>
      <input bind:this={input} bind:value={query} placeholder="Find a page" aria-label="Page name" autocomplete="off" spellcheck="false" />
    </label>

    {#if results.length > 0}
      <ul class="results" bind:this={list} role="listbox" aria-label="Pages">
        {#each results as result, resultIndex (result.key)}
          <li role="option" aria-selected={resultIndex === index}>
            <button class="result" class:picked={resultIndex === index} tabindex="-1" onpointermove={() => (index = resultIndex)} onclick={() => open(result)}>
              <span class="result-icon m3-icon">{result.icon}</span>
              <span class="result-name">{result.name}</span>
              <span class="result-type">{result.type}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">No page is called that.</p>
    {/if}
  </div>
</div>


<style>
  .dialog-layer {
    position: fixed;
    inset: 0;
    z-index: 4000;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 12vh 16px 16px;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background-color: var(--scrim);
  }

  .finder {
    position: relative;
    box-sizing: border-box;
    width: min(100%, 480px);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background-color: var(--surface);
    border: 2.5px solid var(--line-strong);
    border-radius: 30px;
    box-shadow: 0 12px 40px var(--shadow);
  }

  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 14px;
    border-bottom: 1.5px solid var(--surface-active);
  }

  .search-icon {
    font-size: 24px;
    color: var(--accent);
  }

  .search input {
    flex: 1;
    min-width: 0;
    padding: 10px 0;
    background: none;
    border: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 18px;
  }

  .search input::placeholder {
    color: var(--text-muted);
  }

  .results {
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .result {
    box-sizing: border-box;
    width: 100%;
    height: 46px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 14px;
    background: none;
    border: none;
    border-radius: 20px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    text-align: left;
    cursor: pointer;
  }

  .result.picked {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .result-icon {
    flex-shrink: 0;
    font-size: 23px;
  }

  .result-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-type {
    flex-shrink: 0;
    color: var(--text-muted);
    font-size: 13px;
  }

  .empty {
    margin: 0;
    padding: 14px;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
  }
</style>
