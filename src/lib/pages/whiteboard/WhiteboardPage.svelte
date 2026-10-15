<!-- src/lib/pages/whiteboard/WhiteboardPage.svelte -->
<!-- A Whiteboard page: the whiteboard over the whole window, the app's menu button (top left) and the page's
     settings button (top right) float over it. -->
<script>
  import PageHeader from '$lib/app/PageHeader.svelte';
  import Whiteboard from './Whiteboard.svelte';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();
</script>

<main class="whiteboard-page">
  {#key page.id}
    <Whiteboard drawingId={page.id} />
  {/key}

  <!-- The page's name and settings, in the top right corner over the whiteboard. -->
  <div class="header">
    <PageHeader {page} />
  </div>
</main>


<style>
  /* The whole window. The menu button and the settings button are 46px wide, 14px from the edges: Excalidraw's
     buttons beside them move aside, its tool bar standing on the right edge starts below them. */
  .whiteboard-page {
    position: fixed;
    inset: 0;
    --whiteboard-top: 74px;
    --whiteboard-side: 52px;
  }

  /* Only the settings button: the name would cover the whiteboard's own buttons. */
  .header {
    position: absolute;
    top: 0;
    right: 14px;
    width: 46px;
  }

  .header :global(.page-header) {
    grid-template-columns: 0 0 46px;
    gap: 0;
  }

  .header :global(.page-header .title) {
    display: none;
  }

  .header :global(.page-header .panel) {
    width: min(calc(100vw - 28px), 420px);
  }
</style>
