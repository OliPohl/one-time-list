<!-- src/lib/widgets/components/editors/ImageEditor.svelte -->
<!-- The image of an image widget: uploaded from the device (made smaller, see image.js) or a link to one. -->
<script>
  import EditorRow from '../../../ui/EditorRow.svelte';
  import Chip from '../../../ui/Chip.svelte';
  import { imageFileToDataUrl, isImageLink } from '../../image.js';

  /** @type {{widget: any, store: import('../../store.svelte.js').WidgetStore}} */
  let { widget, store } = $props();

  /** @type {HTMLInputElement} */
  let fileInput;
  // A link shows in the field, an uploaded image doesn't (it's a long data URL).
  // svelte-ignore state_referenced_locally
  let link = $state(widget.src.startsWith('data:') ? '' : widget.src);
  let error = $state('');
  let uploading = $state(false);

  /** @param {Event} event */
  async function upload(event) {
    const input = /** @type {HTMLInputElement} */ (event.currentTarget);
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    error = '';
    uploading = true;
    try {
      store.setImage(widget, await imageFileToDataUrl(file));
      link = '';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The image couldn\'t be read.';
    } finally {
      uploading = false;
    }
  }

  function useLink() {
    const text = link.trim();
    if (!text) return;
    if (!isImageLink(text)) {
      error = 'A link starts with https:// (or http://).';
      return;
    }
    error = '';
    store.setImage(widget, text);
  }

  function clear() {
    store.setImage(widget, '');
    link = '';
    error = '';
  }
</script>

<EditorRow label="Image">
  <Chip icon="upload" onclick={() => fileInput.click()}>{uploading ? 'Uploading…' : 'Upload'}</Chip>
  {#if widget.src}
    <Chip icon="hide_image" onclick={clear}>Remove</Chip>
  {/if}
  <input class="file" type="file" accept="image/*" bind:this={fileInput} onchange={upload} />
</EditorRow>

<EditorRow label="Or a Link">
  <div class="field">
    <input
      type="url"
      placeholder="https://…"
      spellcheck="false"
      aria-label="Image Link"
      bind:value={link}
      onkeydown={(event) => event.key === 'Enter' && useLink()} />
    <button class="apply m3-icon" title="Show This Image" disabled={!link.trim()} onclick={useLink}>check</button>
  </div>
</EditorRow>

{#if error}
  <p class="error">{error}</p>
{/if}


<style>
  .file {
    display: none;
  }

  /* Like the other fields of the edit panels (TimeField). */
  .field {
    flex: 1;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px 4px 14px;
    border-radius: 40px;
    border: 1.5px solid var(--line);
    transition: border-color 0.4s;
  }

  .field:focus-within {
    border-color: var(--accent);
  }

  input[type='url'] {
    flex: 1;
    width: 0;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 15px;
  }

  .apply {
    padding: 2px;
    background: none;
    border: none;
    color: var(--text-soft);
    font-size: 20px;
    cursor: pointer;
    transition: color 0.4s;
  }

  .apply:hover:not(:disabled) {
    color: var(--accent);
  }

  .apply:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .error {
    margin: 0;
    font-family: "Roboto Slab", serif;
    font-size: 13px;
    color: var(--red);
  }
</style>
