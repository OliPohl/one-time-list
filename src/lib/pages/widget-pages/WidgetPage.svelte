<!-- src/lib/pages/widget-pages/WidgetPage.svelte -->
<!-- A widget as a minimal page: icon, title and settings, then the widget itself (see WidgetPageView). -->
<script>
  import WidgetPageView from './WidgetPageView.svelte';
  import { WIDGET_TYPES } from '$lib/widgets/store.svelte.js';
  import PageHeader from '$lib/app/PageHeader.svelte';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  let icon = $derived(WIDGET_TYPES[/** @type {keyof typeof WIDGET_TYPES} */ (page.type)].icon);
</script>

<main class="widget-page">
  <PageHeader {page} {icon} centered />
  <WidgetPageView {page} />
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
  }
</style>
