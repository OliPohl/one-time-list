<!-- src/lib/widgets/components/WidgetImage.svelte -->
<!-- The picture of an image widget, filling the widget (see `bare` in Widget): as wide as the widget's place, as tall
     as the image's own shape makes it, nothing cut off. A link that doesn't load says so. -->
<script>
  /** @type {{widget: any, variant?: string}} */
  let { widget, variant = 'dock' } = $props();

  let failed = $state(false);

  // A new image gets another try.
  $effect(() => {
    void widget.src;
    failed = false;
  });
</script>

<div class="picture {variant}">
  {#if failed}
    <p class="failed"><span class="m3-icon">broken_image</span>The image couldn't be loaded.</p>
  {:else}
    <!-- A linked image isn't told which page it's shown on (see the privacy policy). -->
    <img src={widget.src} alt="" draggable="false" referrerpolicy="no-referrer" onerror={() => (failed = true)} />
  {/if}
</div>


<style>
  .picture {
    display: flex;
    justify-content: center;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
  }

  .failed {
    margin: 0;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-muted);
  }
</style>
