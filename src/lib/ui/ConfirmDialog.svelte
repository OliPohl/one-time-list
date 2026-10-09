<!-- src/lib/ui/ConfirmDialog.svelte -->
<!-- Modal "Are you sure?" dialog with a cancel and a (destructive) confirm button. -->
<script>
  import { fade, scale } from 'svelte/transition';

  /**
   * @type {{
   *   title: string,
   *   message: string,
   *   confirmLabel?: string,
   *   onAnswer: (confirmed: boolean) => void
   * }}
   */
  let { title, message, confirmLabel = 'Delete', onAnswer } = $props();

  /** @type {HTMLButtonElement | undefined} */
  let cancelButton = $state();

  $effect(() => cancelButton?.focus());

  // Capture phase, so Escape doesn't also close the sidebar or a settings panel behind the dialog.
  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onAnswer(false);
  }
</script>

<svelte:window onkeydowncapture={handleKeyDown} />

<div class="dialog-layer" data-confirm-dialog>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={() => onAnswer(false)}></div>

  <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" transition:scale={{ duration: 200, start: 0.94 }}>
    <h2 class="title" id="confirm-title">{title}</h2>
    <p class="message" id="confirm-message">{message}</p>

    <div class="actions">
      <button class="action cancel" bind:this={cancelButton} onclick={() => onAnswer(false)}>Cancel</button>
      <button class="action confirm" onclick={() => onAnswer(true)}>{confirmLabel}</button>
    </div>
  </div>
</div>


<style>
  .dialog-layer {
    position: fixed;
    inset: 0;
    z-index: 4000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
  }

  .dialog {
    position: relative;
    box-sizing: border-box;
    width: min(100%, 400px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 24px;
    background-color: rgb(0, 0, 0);
    border: 2.5px solid #d4d4d4;
    border-radius: 30px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  }

  .title {
    margin: 0;
    font-family: "Stoke", serif;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    color: #f73f43;
  }

  .message {
    margin: 0;
    color: #dadada;
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .actions {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .action {
    min-width: 110px;
    padding: 9px 22px;
    border-radius: 40px;
    border: 2.5px solid transparent;
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    cursor: pointer;
    transition: color 0.4s, border-color 0.4s, filter 0.2s;
  }

  .cancel {
    background: none;
    border-color: #494949;
    color: #aaaaaa;
  }

  .cancel:hover,
  .cancel:focus-visible {
    border-color: #8c8c8c;
    color: #e0e0e0;
  }

  .confirm {
    background-color: #f73f43;
    color: #ffffff;
  }

  .confirm:hover {
    filter: brightness(110%);
  }
</style>
