<!-- src/lib/pages/board/components/AddPageOptions.svelte -->
<!-- What can be added to a board as a new column: a new Tasks list, note or whiteboard, or a link to a Tasks, Notes or
     Whiteboard page that isn't on the board yet. In the "Add New Column" menu, and (`large`) on an empty board: there
     like the page types on the "Add New" screen, with their descriptions. -->
<script>
  import { pages } from '../../../app/pages.svelte.js';
  import tasksType from '../../tasks/index.js';
  import notesType from '../../notes/index.js';
  import whiteboardType from '../../whiteboard/index.js';

  /**
   * @type {{
   *   board: import('../board.svelte.js').BoardStore,
   *   onAdded: () => void,
   *   large?: boolean
   * }}
   */
  let { board, onAdded, large = false } = $props();

  /** The kinds of page a board can hold. */
  const TYPES = { tasks: tasksType, notes: notesType, whiteboard: whiteboardType };
  const KINDS = /** @type {import('../board.svelte.js').ItemKind[]} */ (Object.keys(TYPES));

  let linkable = $derived(pages.list.filter((page) => page.type in TYPES && !board.isLinked(page.id)));

  /** @param {import('../board.svelte.js').ItemKind} kind */
  function add(kind) {
    board.addItem(kind);
    onAdded();
  }

  /** @param {string} pageId */
  function link(pageId) {
    board.linkPage(pageId);
    onAdded();
  }
</script>

{#if large}
  <section class="field">
    <h2 class="label">New</h2>
    <div class="types">
      {#each KINDS as kind (kind)}
        <button class="type" onclick={() => add(kind)}>
          <span class="type-icon m3-icon">{TYPES[kind].icon}</span>
          <span class="type-text">
            <span class="type-label">{TYPES[kind].label}</span>
            <span class="type-description">{TYPES[kind].description}</span>
          </span>
        </button>
      {/each}
    </div>
  </section>

  {#if linkable.length > 0}
    <section class="field">
      <h2 class="label">Link Page</h2>
      <div class="types">
        {#each linkable as page (page.id)}
          {@const type = TYPES[/** @type {keyof typeof TYPES} */ (page.type)]}
          <button class="type" onclick={() => link(page.id)}>
            <span class="type-icon m3-icon">{type.icon}</span>
            <span class="type-text">
              <span class="type-label">{page.name}</span>
              <span class="type-description">{type.label} page, shown with its own data</span>
            </span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
{:else}
  <span class="heading">New</span>
  {#each KINDS as kind (kind)}
    <button class="option" role="menuitem" onclick={() => add(kind)}>
      <span class="option-icon m3-icon">{TYPES[kind].icon}</span>
      <span class="option-name">{TYPES[kind].label}</span>
    </button>
  {/each}

  {#if linkable.length > 0}
    <span class="heading">Link Page</span>
    {#each linkable as page (page.id)}
      <button class="option" role="menuitem" onclick={() => link(page.id)}>
        <span class="option-icon m3-icon">{TYPES[/** @type {keyof typeof TYPES} */ (page.type)].icon}</span>
        <span class="option-name">{page.name}</span>
      </button>
    {/each}
  {/if}
{/if}


<style>
  /* Large: like the "Add New" screen (NewPage). */
  .field {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .label {
    margin: 0;
    font-family: "Stoke", serif;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--task);
  }

  .types {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .type {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 22px;
    background-color: var(--surface);
    border: 2.5px solid var(--line);
    border-radius: 30px;
    color: var(--text-soft);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.4s, color 0.4s;
  }

  .type:hover,
  .type:focus-visible {
    border-color: var(--accent);
    color: var(--accent);
  }

  .type-icon {
    flex-shrink: 0;
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
  }

  .type-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .type-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Roboto Slab", serif;
    font-size: 18px;
  }

  .type-description {
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    color: var(--text-muted);
  }

  /* The menu's list. */
  .heading {
    padding: 8px 14px 4px;
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    color: var(--text-muted);
  }

  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 14px;
    background: none;
    border: none;
    border-radius: 18px;
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    text-align: left;
    cursor: pointer;
    transition: color 0.4s, background-color 0.4s;
  }

  /* Also the one picked with the keyboard ("Add a column" key, arrow keys). */
  .option:hover,
  .option:focus-visible {
    color: var(--accent);
    background-color: var(--surface-active);
  }

  .option-icon {
    flex-shrink: 0;
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
  }

  .option-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
