<!-- src/lib/app/AppShell.svelte -->
<!-- Everything around the pages: loads the saved state, shows the current view, the menu button and the sidebar. -->
<script>
  import { onMount } from 'svelte';
  import { PAGE_TYPES } from '../pages/index.js';
  import DashboardPage from '../pages/dashboard/DashboardPage.svelte';
  import NewPage from '../pages/new-page/NewPage.svelte';
  import { unlockAudio } from '../utils/sounds.js';
  import { syncAnimations } from '../utils/syncAnimations.js';
  import { pages } from './pages.svelte.js';
  import { navigation } from './navigation.svelte.js';
  import MenuButton from './MenuButton.svelte';
  import Sidebar from './Sidebar.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import { confirmState } from './confirm.svelte.js';
  import SettingsDialog from './SettingsDialog.svelte';
  import Grain from '../ui/Grain.svelte';
  import { dashboard } from './dashboard.svelte.js';
  import { folders } from './folders.svelte.js';
  import { settings } from './settings.svelte.js';
  import WhiteboardWindow from '../pages/whiteboard/WhiteboardWindow.svelte';
  import { whiteboardWindow, closeWhiteboard } from '../pages/whiteboard/window.svelte.js';
  import { cleanUpWidgetDrawings } from '../pages/whiteboard/store.js';
  import { addLibraryFromAddress } from '../pages/whiteboard/library.js';
  import { shortcuts } from './shortcuts.svelte.js';
  import { taskCursor } from './taskCursor.svelte.js';
  import { pageIdsIn } from './folders.svelte.js';
  import PageFinder from './PageFinder.svelte';
  import ShortcutsDialog from './ShortcutsDialog.svelte';
  import KeyboardHint from './KeyboardHint.svelte';
  import { showFavicon } from './favicon.js';

  let isLoaded = $state(false);

  let page = $derived(navigation.page);
  let PageComponent = $derived(page && PAGE_TYPES[page.type].component);
  // The New Page screen previews the colors picked for the new page.
  let pageStyle = $derived(navigation.view.kind === 'new-page' ? navigation.draftStyle : page && PAGE_TYPES[page.type].style?.(page));
  let title = $derived(
    navigation.view.kind === 'dashboard' ? 'Dashboard' : navigation.view.kind === 'new-page' ? 'Add New' : page?.name
  );

  onMount(() => {
    settings.load();
    pages.load();
    folders.load();
    dashboard.load();
    navigation.load();
    shortcuts.load();
    taskCursor.start();
    unlockAudio();
    isLoaded = true;
    // Once every page's saved state has been written again.
    const cleanUp = setTimeout(cleanUpWidgetDrawings, 5000);
    // Back from Excalidraw's library site with a library to add.
    addLibraryFromAddress();
    const stopAnimations = syncAnimations();
    return () => {
      clearTimeout(cleanUp);
      stopAnimations();
    };
  });

  /** Carries the colors of what's shown. @type {HTMLElement | undefined} */
  let pageColorsEl = $state();

  // The tab's icon in the colors of what's shown, also when the default colors or the theme change. Read once the
  // colors are applied (the settings set the defaults in an effect of their own).
  $effect(() => {
    void pageStyle;
    void settings.colors;
    void settings.resolvedTheme;
    const element = pageColorsEl;
    if (element) queueMicrotask(() => showFavicon(element));
  });

  // Another page, the one that gave the keyboard back isn't shown anymore.
  $effect(() => {
    void navigation.view;
    shortcuts.take();
  });

  /** Pages in sidebar order. */
  const orderedPages = () => pageIdsIn(folders.tree).filter((id) => pages.get(id));

  /** Opens a page in sidebar order, false if there's none there. @param {string | undefined} id */
  function openPage(id) {
    if (!id) return false;
    navigation.go({ kind: 'page', id });
  }

  /** The page `by` steps further down the sidebar (up when negative), going round at the ends. @param {number} by */
  function stepPage(by) {
    const ids = orderedPages();
    if (ids.length === 0) return false;
    const current = navigation.view.kind === 'page' ? ids.indexOf(navigation.view.id) : -1;
    const next = current === -1 ? (by > 0 ? 0 : ids.length - 1) : (current + by + ids.length) % ids.length;
    return openPage(ids[next]);
  }

  /** The app wide shortcuts, see shortcuts.svelte.js. @type {import('./shortcuts.svelte.js').Handlers} */
  const appShortcuts = {
    findPage: () => void (shortcuts.finderOpen = true),
    ...Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`page${index + 1}`, () => openPage(orderedPages()[index])])),
    previousPage: () => stepPage(-1),
    nextPage: () => stepPage(1),
    dashboard: () => navigation.go({ kind: 'dashboard' }),
    newPage: () => navigation.go({ kind: 'new-page' }),
    toggleSidebar: () => void (navigation.sidebarOpen = !navigation.sidebarOpen),
    showShortcuts: () => void (shortcuts.dialogOpen = true)
  };
</script>

<!-- Escape on a whiteboard or a note gives the keyboard to the shortcuts, clicking it takes it back. -->
<svelte:window
  onkeydown={(event) => isLoaded && shortcuts.handle(event, appShortcuts)}
  onkeydowncapture={(event) => isLoaded && shortcuts.releaseFocus(event)}
  onpointerdowncapture={(event) => shortcuts.takeOnClick(event)} />

<svelte:head>
  <title>{(isLoaded && title) || 'Taskbook'}</title>
</svelte:head>

{#if isLoaded}
  <div class="app">
    <!-- Only the page gets its colors (e.g. the Tasks color set), the sidebar and dialogs keep the defaults. -->
    <div class="page-colors" data-page-colors style={pageStyle} bind:this={pageColorsEl}>
      <!-- Behind every page, tinted with the page's accent. -->
      <Grain />
      {#if navigation.view.kind === 'dashboard'}
        <DashboardPage />
      {:else if navigation.view.kind === 'new-page'}
        <NewPage />
      {:else if page && PageComponent}
        {#key page.id}
          <PageComponent {page} />
        {/key}
      {/if}

      <!-- A whiteboard widget's drawing, opened to draw on (see whiteboard/window.svelte.js). In the page's colors. -->
      {#if whiteboardWindow.current}
        {#key whiteboardWindow.current.drawingId}
          <WhiteboardWindow drawingId={whiteboardWindow.current.drawingId} name={whiteboardWindow.current.name} onClose={closeWhiteboard} />
        {/key}
      {/if}
    </div>

    <Sidebar />
    <MenuButton />

    {#if settings.dialogOpen}
      <SettingsDialog />
    {/if}

    {#if shortcuts.finderOpen}
      <PageFinder />
    {/if}

    {#if shortcuts.dialogOpen}
      <ShortcutsDialog />
    {/if}

    {#if shortcuts.released && shortcuts.enabled}
      <KeyboardHint />
    {/if}

    {#if confirmState.request}
      <ConfirmDialog {...confirmState.request} onAnswer={(confirmed) => confirmState.answer(confirmed)} />
    {/if}
  </div>
{/if}


<style>
  /* Wrappers only, they don't affect the layout. `.page-colors` carries the page's custom properties. */
  .app,
  .page-colors {
    display: contents;
  }
</style>
