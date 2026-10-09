<!-- src/lib/app/AppShell.svelte -->
<!-- Everything around the pages: loads the saved state, shows the current view, the menu button and the sidebar. -->
<script>
  import { onMount } from 'svelte';
  import { PAGE_TYPES } from '../pages/index.js';
  import DashboardPage from '../pages/dashboard/DashboardPage.svelte';
  import NewPage from '../pages/new-page/NewPage.svelte';
  import { unlockAudio } from '../utils/sounds.js';
  import { pages } from './pages.svelte.js';
  import { navigation } from './navigation.svelte.js';
  import MenuButton from './MenuButton.svelte';
  import Sidebar from './Sidebar.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import { confirmState } from './confirm.svelte.js';

  let isLoaded = $state(false);

  let page = $derived(navigation.page);
  let PageComponent = $derived(page && PAGE_TYPES[page.type].component);
  let pageStyle = $derived(page && PAGE_TYPES[page.type].style?.(page));
  let title = $derived(
    navigation.view.kind === 'dashboard' ? 'Dashboard' : navigation.view.kind === 'new-page' ? 'New Page' : page?.name
  );

  onMount(() => {
    pages.load();
    navigation.load();
    unlockAudio();
    isLoaded = true;
  });
</script>

<svelte:head>
  <title>{(isLoaded && title) || 'One Time List'}</title>
</svelte:head>

{#if isLoaded}
  <div class="app" style={pageStyle}>
    {#if navigation.view.kind === 'dashboard'}
      <DashboardPage />
    {:else if navigation.view.kind === 'new-page'}
      <NewPage />
    {:else if page && PageComponent}
      {#key page.id}
        <PageComponent {page} />
      {/key}
    {/if}

    <Sidebar />
    <MenuButton />

    {#if confirmState.request}
      <ConfirmDialog {...confirmState.request} onAnswer={(confirmed) => confirmState.answer(confirmed)} />
    {/if}
  </div>
{/if}


<style>
  /* Only carries the page's custom properties, it doesn't affect the layout. */
  .app {
    display: contents;
  }
</style>
