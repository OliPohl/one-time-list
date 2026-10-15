<!-- src/lib/app/KeyboardHint.svelte -->
<!-- Shows at the bottom while a page that takes the keyboard (a calculator, a whiteboard, a note) gave it to the keyboard
     shortcuts with Escape (see `released` in shortcuts.svelte.js), and how to give it back to the page. -->
<script>
  import { fly } from 'svelte/transition';
  import { shortcuts } from './shortcuts.svelte.js';

  const BACK = {
    calculator: 'Click the calculator to type into it again.',
    whiteboard: 'Click the whiteboard to draw again.',
    notes: 'Click the note to write in it again.'
  };
</script>

<div class="hint" role="status" transition:fly={{ y: 20, duration: 200 }}>
  <span class="icon m3-icon">keyboard</span>
  <span><strong>Shortcuts are on.</strong> {shortcuts.released ? BACK[shortcuts.released] : ''}</span>
</div>


<style>
  .hint {
    position: fixed;
    left: 50%;
    bottom: calc(20px + env(safe-area-inset-bottom));
    z-index: 3500;
    box-sizing: border-box;
    max-width: calc(100vw - 32px);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px 10px 14px;
    background-color: var(--surface-raised);
    border: 1.5px solid var(--line);
    border-radius: 40px;
    box-shadow: 0 8px 24px var(--shadow);
    color: var(--text-soft);
    font-family: "Roboto Slab", serif;
    font-size: 14px;
    translate: -50% 0;
    pointer-events: none;
  }

  .icon {
    flex-shrink: 0;
    font-size: 22px;
    color: var(--accent);
  }

  strong {
    font-weight: 600;
    color: var(--accent);
  }
</style>
