<!-- src/lib/pages/new-page/NewPage.svelte -->
<!-- Creates a page: pick a name, a page type and that type's options. -->
<script>
  import { slide } from 'svelte/transition';
  import { PAGE_TYPES } from '../index.js';
  import { pages } from '../../app/pages.svelte.js';
  import { navigation } from '../../app/navigation.svelte.js';

  const DEFAULT_NAME = 'New Page';

  let name = $state(DEFAULT_NAME);
  /** Once the user typed a name, picking a type no longer replaces it. */
  let nameEdited = $state(false);
  /** @type {string | null} */
  let selectedType = $state(null);
  /** @type {Record<string, any>} */
  let options = $state({});

  let pageType = $derived(selectedType ? PAGE_TYPES[selectedType] : null);

  /** @param {string} type */
  function selectType(type) {
    if (type === selectedType) return;
    selectedType = type;
    options = PAGE_TYPES[type].defaultOptions();
    if (!nameEdited) name = PAGE_TYPES[type].defaultName;
  }

  function confirm() {
    if (!pageType) return;
    const page = pages.create({
      type: pageType.type,
      name: name.trim() || pageType.defaultName,
      options: $state.snapshot(options)
    });
    navigation.go({ kind: 'page', id: page.id });
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Enter') confirm();
  }
</script>

<main class="new-page">
  <h1 class="heading">New Page</h1>

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

  <section class="field">
    <h2 class="label">Page Type</h2>
    <div class="types">
      {#each Object.values(PAGE_TYPES) as type (type.type)}
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

  {#if pageType}
    <section class="field" transition:slide={{ duration: 250 }}>
      <h2 class="label">Options</h2>
      {#key pageType.type}
        {#if pageType.Options}
          <pageType.Options {options} />
        {/if}
      {/key}
    </section>
  {/if}

  <div class="actions">
    <button class="action cancel" onclick={() => navigation.back()}>Cancel</button>
    <button class="action confirm" disabled={!pageType} onclick={confirm}>Confirm</button>
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
    background-color: rgb(0, 0, 0);
    border: 2.5px solid var(--accent);
    border-radius: 40px;
    color: #ffffff;
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
    background-color: rgb(0, 0, 0);
    border: 2.5px solid #494949;
    border-radius: 30px;
    color: #dadada;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.4s, color 0.4s;
  }

  .type:hover {
    border-color: #8c8c8c;
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
    color: #8c8c8c;
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
    border-color: #494949;
    color: #aaaaaa;
  }

  .cancel:hover {
    border-color: #8c8c8c;
    color: #e0e0e0;
  }

  .confirm {
    background-color: var(--accent);
    color: #000000;
  }

  .confirm:hover:enabled {
    filter: brightness(110%);
  }

  .confirm:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
