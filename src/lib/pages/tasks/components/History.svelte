<!-- src/lib/pages/tasks/components/History.svelte -->
<!-- Completed tasks, collapsed by default. Items can be returned, edited, deleted or dragged back into the list. -->
<script>
  import { flip } from 'svelte/animate';
  import { slide } from 'svelte/transition';
  import Task from './Task.svelte';

  /**
   * @type {{
   *   items?: Array<{id: string, text: string}>,
   *   draggingId?: string | null,
   *   visible?: boolean,
   *   onReturn: (id: string) => void,
   *   onDelete: (id: string) => void,
   *   onEdit: (id: string, text: string) => void,
   *   onClear: () => void,
   *   onDragStart: (id: string, point: {clientX: number, clientY: number}, rect: DOMRect) => void
   * }}
   */
  let {
    items = [],
    draggingId = null,
    /** False while the app is collapsed (no tasks). */
    visible = true,
    onReturn,
    onDelete,
    onEdit,
    onClear,
    onDragStart
  } = $props();

  let open = $state(false);

  // Collapse again once the history is emptied or the app collapses.
  $effect(() => {
    if (!visible || items.length === 0) open = false;
  });
</script>

{#if items.length > 0}
  <div class="history" data-history>
    <button class="text-btn" onclick={() => (open = !open)}>
      <span class="text-icon m3-icon">history</span>
      <span>{open ? 'Hide History' : 'Show History'}</span>
    </button>

    {#if open}
      <div class="list" transition:slide={{ duration: 250 }}>
        {#each items as item (item.id)}
          <div class="item" class:placeholder={draggingId === item.id} animate:flip={{ duration: 200 }}>
            <Task
              text={item.text}
              isCurrent={false}
              isHistory={true}
              onAction={() => onReturn(item.id)}
              onDelete={() => onDelete(item.id)}
              onEdit={(/** @type {{message: string}} */ event) => onEdit(item.id, event.message)}
              onDragStart={(/** @type {{clientX: number, clientY: number}} */ point, /** @type {DOMRect} */ rect) => onDragStart(item.id, point, rect)}
              isDragging={draggingId === item.id} />
          </div>
        {/each}

        <button class="text-btn clear" onclick={onClear}>
          <span class="text-icon m3-icon">delete_sweep</span>
          <span>Clear History</span>
        </button>
      </div>
    {/if}
  </div>
{/if}


<style>
  .history {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .list {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 25px;
    padding-top: 25px;
  }

  .item {
    width: 100%;
  }

  .item.placeholder {
    border-radius: 40px;
    outline: 2.5px dashed var(--line);
    outline-offset: -2.5px;
  }

  .item.placeholder > :global(*) {
    visibility: hidden;
  }

  .text-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    padding: 5px 10px;
    color: var(--text-muted);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    cursor: pointer;
    transition: color 0.4s;
  }

  .text-btn:hover {
    color: var(--accent);
  }

  .text-btn.clear:hover {
    color: var(--red);
  }

  .text-icon {
    font-size: 22px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 22;
  }
</style>
