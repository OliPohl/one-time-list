<!-- src/lib/pages/new-page/NewPage.svelte -->
<!-- "Add New": creates a page, a widget page or a folder. Tabs at the top pick which, then a name, a type and that
     type's options (folders only need a name). -->
<script>
  import { slide } from 'svelte/transition';
  import { PAGE_TYPES } from '../index.js';
  import { pages } from '../../app/pages.svelte.js';
  import { navigation } from '../../app/navigation.svelte.js';
  import { dashboard } from '../../app/dashboard.svelte.js';
  import { folders } from '../../app/folders.svelte.js';
  import FolderStyle from '../../app/FolderStyle.svelte';

  const TABS = /** @type {const} */ ([
    { key: 'page', label: 'Page', icon: 'description', defaultName: 'New Page' },
    { key: 'widget', label: 'Widget', icon: 'widgets', defaultName: 'New Widget' },
    { key: 'folder', label: 'Folder', icon: 'folder', defaultName: 'New Folder' }
  ]);

  // Opened from a dashboard slot: the new page goes onto the dashboard.
  const linkToDashboard = dashboard.linkNextPage;
  dashboard.linkNextPage = false;
  // A dashboard slot links a page, a folder can't go there.
  const tabs = linkToDashboard ? TABS.filter((tab) => tab.key !== 'folder') : TABS;

  /** @type {typeof TABS[number]['key']} */
  let tabKey = $state('page');
  let tab = $derived(TABS.find((item) => item.key === tabKey) ?? TABS[0]);
  let name = $state(/** @type {string} */ (TABS[0].defaultName));
  /** Once the user typed a name, picking a type no longer replaces it. */
  let nameEdited = $state(false);
  /** @type {string | null} */
  let selectedType = $state(null);
  /** @type {Record<string, any>} */
  let options = $state({});

  /** The icon and its color for a new folder. */
  let folderIcon = $state('folder');
  let folderColor = $state('');

  let pageType = $derived(selectedType ? PAGE_TYPES[selectedType] : null);
  let types = $derived(Object.values(PAGE_TYPES).filter((type) => type.group === tab.key));

  // Preview the new page's colors on this screen. Leaving clears it, the next New Page starts with the global colors.
  $effect(() => {
    const draft = { id: '', type: selectedType ?? '', name, options, createdAt: 0 };
    navigation.draftStyle = (pageType?.style?.(draft)) ?? '';
  });
  $effect(() => () => (navigation.draftStyle = ''));

  /** Every tab starts over: no type picked and its own default name. @param {typeof TABS[number]} next */
  function selectTab(next) {
    if (next.key === tabKey) return;
    tabKey = next.key;
    selectedType = null;
    options = {};
    name = next.defaultName;
    nameEdited = false;
  }

  /** @param {string} type */
  function selectType(type) {
    if (type === selectedType) return;
    selectedType = type;
    options = PAGE_TYPES[type].defaultOptions();
    if (!nameEdited) name = PAGE_TYPES[type].defaultName;
  }

  function confirm() {
    if (tab.key === 'folder') {
      createFolder();
      return;
    }
    if (!pageType) return;
    const page = pages.create({
      type: pageType.type,
      name: name.trim() || pageType.defaultName,
      options: $state.snapshot(options)
    });
    if (linkToDashboard) {
      dashboard.link(page.id);
      navigation.go({ kind: 'dashboard' });
    } else {
      navigation.go({ kind: 'page', id: page.id });
    }
  }

  function createFolder() {
    folders.add({ name, icon: folderIcon, color: folderColor });
    folderIcon = 'folder';
    folderColor = '';
    // Without any pages there is nowhere to go back to, a page still has to be created.
    if (pages.list.length === 0) {
      selectTab(TABS[0]);
      return;
    }
    navigation.back();
    // Show where the folder went.
    navigation.sidebarOpen = true;
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Enter') confirm();
  }
</script>

<main class="new-page">
  <h1 class="heading">Add New</h1>

  <div class="tabs" role="tablist">
    {#each tabs as item (item.key)}
      <button class="tab" class:selected={tabKey === item.key} role="tab" aria-selected={tabKey === item.key} onclick={() => selectTab(item)}>
        <span class="tab-icon m3-icon">{item.icon}</span>
        <span>{item.label}</span>
      </button>
    {/each}
  </div>

  <label class="field">
    <span class="label">Name</span>
    <input
      class="name-input"
      type="text"
      maxlength="60"
      spellcheck="false"
      bind:value={name}
      oninput={() => (nameEdited = true)}
      onkeydown={handleKeyDown} />
  </label>

  {#if tab.key === 'folder'}
    <section class="field">
      <h2 class="label">Options</h2>
      <FolderStyle
        icon={folderIcon}
        color={folderColor}
        onIconChange={(icon) => (folderIcon = icon)}
        onColorChange={(color) => (folderColor = color)} />
    </section>
  {:else}
    <section class="field">
      <h2 class="label">{tab.key === 'widget' ? 'Widget' : 'Page Type'}</h2>
      <div class="types">
        {#each types as type (type.type)}
          <button class="type" class:selected={selectedType === type.type} onclick={() => selectType(type.type)}>
            <span class="type-icon m3-icon">{type.icon}</span>
            <span class="type-text">
              <span class="type-label">{type.label}</span>
              <span class="type-description">{type.description}</span>
            </span>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if pageType}
    <section class="field" transition:slide={{ duration: 250 }}>
      <h2 class="label">Options</h2>
      {#key pageType.type}
        {#if pageType.Options}
          <pageType.Options {options} type={pageType.type} />
        {/if}
      {/key}
    </section>
  {/if}

  <div class="actions">
    <!-- Goes back to where Add New was opened from, or the dashboard (always without any pages). -->
    <button class="action cancel" onclick={() => navigation.back()}>Cancel</button>
    <button class="action confirm" disabled={tab.key !== 'folder' && !pageType} onclick={confirm}>Confirm</button>
  </div>
</main>


<style>
  .new-page {
    box-sizing: border-box;
    max-width: 600px;
    min-height: 100vh;
    margin: auto;
    padding: 80px 10px 30px;
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .heading {
    margin: 0;
    font-family: "Stoke", serif;
    font-size: 40px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }

  /* Same look as the theme buttons in the settings. */
  .tabs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 8px;
  }

  .tab {
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

  .tab:hover {
    border-color: var(--text-muted);
  }

  .tab.selected {
    border-color: var(--accent);
    color: var(--accent);
  }

  .tab-icon {
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
  }

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

  .name-input {
    box-sizing: border-box;
    width: 100%;
    padding: 12px 25px;
    background-color: var(--surface);
    border: 2.5px solid var(--accent);
    border-radius: 40px;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 18px;
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

  .type:hover {
    border-color: var(--text-muted);
  }

  .type.selected {
    border-color: var(--accent);
    color: var(--accent);
  }

  .type-icon {
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
  }

  .type-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .type-label {
    font-family: "Roboto Slab", serif;
    font-size: 18px;
  }

  .type-description {
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    color: var(--text-muted);
  }

  .actions {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .action {
    min-width: 120px;
    padding: 10px 25px;
    border-radius: 40px;
    border: 2.5px solid transparent;
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    cursor: pointer;
    transition: color 0.4s, border-color 0.4s, filter 0.2s, opacity 0.4s;
  }

  .cancel {
    background: none;
    border-color: var(--line);
    color: var(--text-muted);
  }

  .cancel:hover {
    border-color: var(--text-muted);
    color: var(--text-soft);
  }

  .confirm {
    background-color: var(--accent);
    color: var(--on-accent);
  }

  .confirm:hover:enabled {
    filter: brightness(110%);
  }

  .confirm:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
