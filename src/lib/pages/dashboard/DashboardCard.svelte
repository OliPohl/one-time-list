<!-- src/lib/pages/dashboard/DashboardCard.svelte -->
<!-- A linked page on the dashboard: icon and name on top, the page type's Card, a button to open the page. -->
<script>
  import { PAGE_TYPES } from '../index.js';
  import { navigation } from '../../app/navigation.svelte.js';
  import { dashboard } from '../../app/dashboard.svelte.js';

  /** `ghost` is the copy that follows the pointer while dragging, it can't be used. */
  /** @type {{page: import('../types.js').Page, ghost?: boolean}} */
  let { page, ghost = false } = $props();

  let pageType = $derived(PAGE_TYPES[page.type]);
  // Pages with their own colors (Tasks) keep them on the dashboard, the others use the global colors.
  let pageStyle = $derived(pageType.style?.(page));
</script>

<article class="slot card" class:ghost inert={ghost} data-page-colors={pageStyle ? '' : undefined} style={pageStyle}>
  <header class="head">
    <span class="icon m3-icon">{pageType.icon}</span>
    <h2 class="name">{page.name}</h2>
    <button class="unlink m3-icon" title="Remove from Dashboard" onclick={() => dashboard.unlink(page.id)}>close</button>
  </header>

  <div class="body">
    {#if pageType.Card}
      <pageType.Card {page} />
    {/if}
  </div>

  <button class="open" onclick={() => navigation.go({ kind: 'page', id: page.id })}>
    <span>Open Page</span>
    <span class="open-icon m3-icon">arrow_forward</span>
  </button>
</article>


<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .icon {
    flex-shrink: 0;
    font-size: 24px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
    color: var(--accent);
  }

  .name {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Stoke", serif;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .unlink {
    flex-shrink: 0;
    padding: 2px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
    cursor: pointer;
    transition: color 0.4s;
  }

  .unlink:hover {
    color: var(--text);
  }

  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .open {
    align-self: center;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
    cursor: pointer;
    transition: color 0.4s;
  }

  .open:hover {
    color: var(--accent);
  }

  .open-icon {
    font-size: 20px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
  }
</style>
