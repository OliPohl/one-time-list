<!-- src/lib/pages/notes/NotesOptions.svelte -->
<!-- Customization of a Notes page, shown on the "Add New" screen and in the page settings. Edits `options` in place. -->
<script>
  import ColorOptions from '../ColorOptions.svelte';

  /** @type {{options: Record<string, any>}} */
  let { options } = $props();
</script>

<ColorOptions {options} />
