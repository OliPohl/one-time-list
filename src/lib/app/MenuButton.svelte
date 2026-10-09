<!-- src/lib/app/MenuButton.svelte -->
<!-- Hamburger button in the top left corner, toggles the sidebar. It stays above the open drawer so it can close it too. -->
<script>
  import { navigation } from './navigation.svelte.js';
</script>

<button
  class="menu-btn m3-icon"
  class:open={navigation.sidebarOpen}
  title={navigation.sidebarOpen ? 'Close Menu' : 'Open Menu'}
  aria-expanded={navigation.sidebarOpen}
  onclick={() => (navigation.sidebarOpen = !navigation.sidebarOpen)}
>
  {navigation.sidebarOpen ? 'menu_open' : 'menu'}
</button>


<style>
  .menu-btn {
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 3001;
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: #cacaca;
    font-size: 30px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 30;
    cursor: pointer;
    transition: color 0.4s, background-color 0.4s;
  }

  .menu-btn:hover,
  .menu-btn.open {
    color: var(--accent);
  }

  .menu-btn:hover {
    background-color: #0c0c0c;
  }
</style>
