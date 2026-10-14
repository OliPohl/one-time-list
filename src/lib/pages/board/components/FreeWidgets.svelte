<!-- src/lib/pages/board/components/FreeWidgets.svelte -->
<!-- The widgets of one page on a board that are placed in the board's free space (`pos.area === 'board'`, see
     BoardPage). Inside the board, so they scroll with it, positioned in its content. They still belong to their
     page: covered by a column they show in its dock instead (`isFree`). Their heights go into `heights` (by
     `key`), to know what they'd cover. -->
<script>
  import WidgetView from '$lib/widgets/components/WidgetView.svelte';
  import { setWidgets } from '$lib/widgets';
  import { SIDE_WIDTH } from '$lib/widgets/layout.svelte.js';

  /**
   * @type {{
   *   store: import('$lib/widgets/store.svelte.js').WidgetStore,
   *   isFree: (widget: any) => boolean,
   *   heights: Record<string, number>,
   *   key: (widget: any) => string,
   *   style?: string
   * }}
   */
  let { store, isFree, heights, key, style } = $props();

  // Shown for one page's widgets only, so the store never changes.
  // svelte-ignore state_referenced_locally
  setWidgets(store);

  let free = $derived(store.list.filter((widget) => isFree(widget)));
</script>

{#each free as widget (widget.id)}
  <div
    class="free-widget"
    {style}
    style:left="{widget.pos.x}px"
    style:top="{widget.pos.y}px"
    style:width="{SIDE_WIDTH}px"
    bind:offsetHeight={heights[key(widget)]}>
    <WidgetView {widget} variant="side" />
  </div>
{/each}


<style>
  .free-widget {
    position: absolute;
    z-index: 5;
  }
</style>
