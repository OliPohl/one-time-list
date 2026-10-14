<!-- src/lib/pages/board/components/ColumnInput.svelte -->
<!-- The "Add Task" field at the top of a board column, a small version of the Tasks page's input.
     Enter adds the task, Shift+Enter starts a new line. -->
<script>
  /** @type {{onSubmit: (text: string) => void}} */
  let { onSubmit } = $props();

  let text = $state('');
  let active = $derived(text.trim().length > 0);
  /** @type {HTMLTextAreaElement} */
  let textarea;

  /** Grows with its lines, up to three. */
  function fit() {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 16 * 1.5 * 3)}px`;
  }

  function submit() {
    if (!active) return;
    onSubmit(text);
    text = '';
    queueMicrotask(fit);
  }

  /** @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }
</script>

<label class="input" class:active>
  <textarea
    rows="1"
    maxlength="500"
    spellcheck="false"
    placeholder="Add Task"
    bind:value={text}
    bind:this={textarea}
    oninput={fit}
    onkeydown={handleKeyDown}></textarea>
  <button class="send m3-icon" title="Add Task" disabled={!active} onclick={submit}>add_circle</button>
</label>


<style>
  .input {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px 7px 18px;
    background-color: var(--surface);
    border: 2.5px solid var(--accent);
    border-radius: 22px;
  }

  textarea {
    flex: 1;
    min-width: 0;
    padding: 0;
    background: none;
    border: none;
    outline: none;
    resize: none;
    overflow: auto;
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 16px;
    line-height: 1.5;
  }

  .send {
    flex-shrink: 0;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 26px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 26;
    transition: color 0.4s;
  }

  .active .send {
    color: var(--accent);
    cursor: pointer;
  }

  .active .send:hover {
    color: color-mix(in srgb, var(--accent), white 20%);
  }

  .active .send:active {
    font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 26;
  }
</style>
