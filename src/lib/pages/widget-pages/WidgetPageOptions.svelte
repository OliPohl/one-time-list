<!-- src/lib/pages/widget-pages/WidgetPageOptions.svelte -->
<!-- The widget's own settings, the same ones its edit panel shows in the dock.
     On the "New Page" screen there is no page yet, so a draft widget is edited and saved in `options.widget`. -->
<script>
  import { WidgetStore } from '../../widgets/store.svelte.js';
  import WidgetEditor from '../../widgets/components/editors/WidgetEditor.svelte';
  import { getWidgetPageStore } from './store.svelte.js';

  /** @type {{options: Record<string, any>, type: string, page?: import('../types.js').Page}} */
  let { options, type, page } = $props();

  // Re-created for every page and type, so these never change.
  // svelte-ignore state_referenced_locally
  const store = page ? getWidgetPageStore(page) : createDraft();

  function createDraft() {
    // Never loaded, so it doesn't save or tick, the store methods only edit the widget.
    const draft = new WidgetStore('');
    draft.add(type);
    options.widget = draft.list[0];
    return draft;
  }

  let widget = $derived(store.list.find((item) => item.type === type));
</script>

{#if widget}
  <div class="widget-options">
    <WidgetEditor {widget} {store} taskOptions={false} />
  </div>
{/if}


<style>
  .widget-options {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
</style>
