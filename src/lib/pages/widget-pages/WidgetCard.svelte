<!-- src/lib/pages/widget-pages/WidgetCard.svelte -->
<!-- A widget page on the dashboard: the whole widget, a bit smaller. -->
<script>
  import WidgetPageView from './WidgetPageView.svelte';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();
</script>

<WidgetPageView {page} compact />
