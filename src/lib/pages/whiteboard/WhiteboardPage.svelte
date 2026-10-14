<!-- src/lib/pages/whiteboard/WhiteboardPage.svelte -->
<!-- A Whiteboard page: Excalidraw over the whole window. Excalidraw is a React component, it's loaded (with React)
     only in the browser and only for this page, and drawn into this component. The drawing is saved a moment
     after each change. It follows the app's light or dark theme, its buttons and highlights are in the page's
     colors, the app's background shows through its canvas. -->
<script>
  import { onMount } from 'svelte';
  import { assets } from '$app/paths';
  import PageHeader from '$lib/app/PageHeader.svelte';
  import { settings } from '$lib/app/settings.svelte.js';
  import { loadDrawing, saveDrawing } from './store.js';

  /** @type {{page: import('../types.js').Page}} */
  let { page } = $props();

  /** Saved this long after the last change, not on every stroke. */
  const SAVE_DELAY = 400;

  /** @type {HTMLElement} */
  let canvasParent;
  /** Draws Excalidraw again with the current theme. @type {(() => void) | undefined} */
  let render = $state();
  let failed = $state(false);

  onMount(() => {
    // Its fonts come from this site, see excalidrawFonts in vite.config.js.
    /** @type {any} */ (window).EXCALIDRAW_ASSET_PATH = `${assets}/excalidraw/`;

    const drawing = loadDrawing(page.id);
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let saveTimer;
    let lastVersion = -1;
    let lastView = '';
    /** React's root, drawing Excalidraw into this page. @type {{render: (element: any) => void, unmount: () => void} | undefined} */
    let root;
    let stopped = false;

    (async () => {
      try {
        const [React, { createRoot }, Excalidraw] = await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('@excalidraw/excalidraw'),
          import('@excalidraw/excalidraw/index.css')
        ]);
        if (stopped) return;

        /** @param {readonly any[]} elements @param {any} appState @param {Record<string, any>} files */
        const onChange = (elements, appState, files) => {
          // Only when something changed: it's called for every pointer move.
          const version = Excalidraw.getSceneVersion(elements);
          const view = `${appState.scrollX},${appState.scrollY},${appState.zoom.value}`;
          if (version === lastVersion && view === lastView) return;
          lastVersion = version;
          lastView = view;
          clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            saveDrawing(page.id, {
              elements: elements.filter((element) => !element.isDeleted),
              files,
              view: { scrollX: appState.scrollX, scrollY: appState.scrollY, zoom: appState.zoom.value }
            });
          }, SAVE_DELAY);
        };

        const initialData = {
          elements: drawing.elements,
          files: drawing.files,
          appState: {
            // The app's background shows through. Excalidraw inverts its canvas for dark mode, a color here
            // would turn into its opposite there.
            viewBackgroundColor: 'transparent',
            ...(drawing.view ? { scrollX: drawing.view.scrollX, scrollY: drawing.view.scrollY, zoom: { value: drawing.view.zoom } } : {})
          },
          scrollToContent: !drawing.view
        };

        root = createRoot(canvasParent);
        render = () =>
          root?.render(
            React.createElement(Excalidraw.Excalidraw, {
              initialData,
              theme: settings.resolvedTheme === 'light' ? 'light' : 'dark',
              onChange,
              UIOptions: { canvasActions: { changeViewBackgroundColor: false, toggleTheme: false } }
            })
          );
      } catch (error) {
        console.error(error);
        failed = true;
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(saveTimer);
      // Unmounted after Svelte is done with this page: React doesn't like being stopped while it draws.
      const done = root;
      queueMicrotask(() => done?.unmount());
    };
  });

  // Drawn again when the theme changes. `render` is set once Excalidraw has loaded.
  $effect(() => {
    void settings.resolvedTheme;
    render?.();
  });
</script>

<main class="whiteboard">
  <div class="canvas" bind:this={canvasParent}></div>

  {#if failed}
    <p class="failed">The whiteboard couldn't be loaded.</p>
  {/if}

  <!-- The page's name and settings, in the top right corner over the whiteboard. -->
  <div class="header">
    <PageHeader {page} />
  </div>
</main>


<style>
  /* The whole window, the menu button and the page header float over it. */
  .whiteboard {
    position: fixed;
    inset: 0;
  }

  .canvas {
    position: absolute;
    inset: 0;
  }

  .failed {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    margin: 0;
    font-family: "Roboto Slab", serif;
    color: var(--text-muted);
  }

  /* Only the settings button: the name would cover the whiteboard's own buttons. */
  .header {
    position: absolute;
    top: 0;
    right: 14px;
    width: 46px;
  }

  .header :global(.page-header) {
    grid-template-columns: 0 0 46px;
    gap: 0;
  }

  .header :global(.page-header .title) {
    display: none;
  }

  .header :global(.page-header .panel) {
    width: min(calc(100vw - 28px), 420px);
  }

  /* Excalidraw in the page's colors: its buttons, selected tools and highlights in the accent color. Two classes,
     so it wins over Excalidraw's own (light and dark) colors. */
  .canvas :global(.excalidraw.excalidraw) {
    --color-primary: var(--accent);
    --color-primary-darker: color-mix(in srgb, var(--accent), black 15%);
    --color-primary-darkest: color-mix(in srgb, var(--accent), black 30%);
    --color-primary-light: color-mix(in srgb, var(--accent), transparent 75%);
    --color-primary-light-darker: color-mix(in srgb, var(--accent), transparent 65%);
    --color-primary-hover: color-mix(in srgb, var(--accent), black 10%);
    /* Selected tools and buttons: a soft accent background, the icon in a stronger accent. Mixed with the theme's
       surface and text, so it works in light and dark. */
    --color-surface-primary-container: color-mix(in srgb, var(--accent), var(--surface) 75%);
    --color-on-primary-container: color-mix(in srgb, var(--accent), var(--text) 45%);
    --color-selection: var(--accent);
  }

  /* Room for the app's menu button (top left, 14px from the edges, 46px wide) and the page's settings button (top
     right), Excalidraw's own buttons there move aside. */
  .canvas :global(.excalidraw .App-menu_top__left) {
    margin-left: 52px;
  }

  .canvas :global(.excalidraw .layer-ui__wrapper__top-right) {
    margin-right: 52px;
  }
</style>
