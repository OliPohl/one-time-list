<!-- src/lib/pages/whiteboard/Whiteboard.svelte -->
<!-- A whiteboard filling its parent (positioned): Excalidraw, on a Whiteboard page and on a board. Excalidraw is a
     React component, it's loaded (with React) only in the browser and only where a whiteboard is shown, and drawn
     into this component. The drawing is saved a moment after each change, and when the whiteboard goes away. It
     follows the app's light or dark theme, its buttons and highlights are in the page's colors, the app's
     background shows through its canvas, with dots in the page's wave color that move and zoom with the drawing.
     Post-it notes (see postIts.js) have a tool in Excalidraw's tool bar, with a panel for their color while it's
     picked.
     As a `preview` it only shows the whole drawing, without Excalidraw's buttons, and can't be changed: a board's
     column shows its whiteboard like this. Its web embeds (videos, ...) aren't loaded then, they show as a
     placeholder: a site is only contacted when its whiteboard is opened. YouTube videos load from
     youtube-nocookie.com (see embeds.js).
     The library is shared by all whiteboards and saved (library.js), also when another tab changes it.
     Where something floats over its top, its buttons make room: `--whiteboard-top` is kept free above the tool bar
     while it stands on the right edge, `--whiteboard-side` beside the buttons at the top corners. -->
<script>
  import { onMount } from 'svelte';
  import { assets } from '$app/paths';
  import { settings } from '$lib/app/settings.svelte.js';
  import { loadDrawing, saveDrawing } from './store.js';
  import { POST_IT_COLORS, postItSkeleton } from './postIts.js';
  import { APP_COLORS, convertColors, convertCurrentColors, stored } from './palette.js';
  import { youtubeNoCookie } from './embeds.js';
  import { loadLibrary, saveLibrary, isLibraryChange } from './library.js';

  /** @type {{drawingId: string, preview?: boolean}} */
  let { drawingId, preview = false } = $props();

  /** Saved this long after the last change, not on every stroke. */
  const SAVE_DELAY = 400;
  /** Space between the background dots, in the whiteboard's units. Doubled while zoomed out so far that they'd
      crowd together (closer than DOTS_MIN_GAP pixels). */
  const DOTS_STEP = 40;
  const DOTS_MIN_GAP = 24;
  /** Excalidraw's custom tool that places a post-it note where the whiteboard is clicked. */
  const POST_IT_TOOL = 'post-it';

  /** @type {HTMLElement} */
  let whiteboard;
  /** @type {HTMLElement} */
  let canvasParent;
  /** Draws Excalidraw again with the current theme. @type {(() => void) | undefined} */
  let render = $state();
  /** Gives the drawing the app's colors in the current theme's values (see palette.js). @type {(() => void) | undefined} */
  let convert = $state();

  /** Saves the last change, while it's waiting to be saved. @type {(() => void) | undefined} */
  let pendingSave;

  /** Saves the last change now, not a moment later. For one about to close, that's shown elsewhere right away. */
  export function flush() {
    pendingSave?.();
  }

  /** Excalidraw's state, once it's there. @type {(() => any) | undefined} */
  let appStateOf;

  /**
   * Whether Escape would end something on the whiteboard: writing or drawing, a tool picked (it goes back to the
   * selection tool), one of its menus or popups. A selection stays on Escape, it doesn't count. Otherwise a whiteboard in a window closes on Escape.
   */
  export function usesEscape() {
    const state = appStateOf?.();
    if (!state) return false;
    if (document.activeElement?.closest('.excalidraw input, .excalidraw textarea')) return true;
    const tool = state.activeTool;
    return Boolean(
      state.editingTextElement || state.newElement || state.multiElement || state.editingLinearElement ||
        state.selectionElement || state.croppingElementId || state.openMenu || state.openPopup ||
        state.openDialog || state.contextMenu || (state.openSidebar && !state.defaultSidebarDockedPreference) ||
        (tool && tool.type !== 'selection' && !tool.locked)
    );
  }

  /** @returns {import('./palette.js').Theme} */
  const theme = () => (settings.resolvedTheme === 'light' ? 'light' : 'dark');
  let failed = $state(false);

  /**
   * Moves and scales the background dots with the drawing. Set on the element directly, it changes on every
   * scroll. Excalidraw shows a point at (x + scrollX) * zoom.
   * @param {{scrollX: number, scrollY: number, zoom: number}} view
   */
  function placeDots({ scrollX, scrollY, zoom }) {
    let step = DOTS_STEP;
    while (step * zoom < DOTS_MIN_GAP) step *= 2;
    whiteboard.style.setProperty('--dots-size', `${step * zoom}px`);
    whiteboard.style.setProperty('--dots-x', `${scrollX * zoom}px`);
    whiteboard.style.setProperty('--dots-y', `${scrollY * zoom}px`);
  }

  onMount(() => {
    // Its fonts come from this site, see excalidrawFonts in vite.config.js.
    /** @type {any} */ (window).EXCALIDRAW_ASSET_PATH = `${assets}/excalidraw/`;

    const drawing = loadDrawing(drawingId);
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let saveTimer;
    /** Shows the whole drawing (a preview), on load and when the whiteboard changes size. */
    let fitPreview = () => {};
    /** @type {ResizeObserver | undefined} */
    let resizeObserver;
    /** Takes the library another tab saved. @type {((event: StorageEvent) => void) | undefined} */
    let onStorage;
    let lastVersion = -1;
    let lastView = '';
    placeDots(drawing.view ?? { scrollX: 0, scrollY: 0, zoom: 1 });
    /** React's root, drawing Excalidraw into this component. @type {{render: (element: any) => void, unmount: () => void} | undefined} */
    let root;
    let stopped = false;

    (async () => {
      try {
        const [React, { createRoot }, { createPortal }, Excalidraw] = await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('react-dom'),
          import('@excalidraw/excalidraw'),
          import('@excalidraw/excalidraw/index.css')
        ]);
        if (stopped) return;

        /** Excalidraw's controls, once it's there. @type {any} */
        let api;
        /** The color the next note is placed in. */
        let postItColor = POST_IT_COLORS.find((color) => color.name === 'Yellow') ?? POST_IT_COLORS[0];

        /** Not captured for undo: the colors only follow the theme. */
        convert = () => {
          if (!api) return;
          const elements = convertColors(api.getSceneElementsIncludingDeleted(), theme(), Excalidraw.newElementWith);
          const appState = convertCurrentColors(api.getAppState(), theme());
          if (elements || appState) {
            api.updateScene({ ...(elements && { elements }), ...(appState && { appState }), captureUpdate: Excalidraw.CaptureUpdateAction.NEVER });
          }
        };

        /** @param {readonly any[]} elements @param {any} appState @param {Record<string, any>} files */
        const onChange = (elements, appState, files) => {
          // Only when something changed: it's called for every pointer move.
          const version = Excalidraw.getSceneVersion(elements);
          const view = `${appState.scrollX},${appState.scrollY},${appState.zoom.value}`;
          if (version === lastVersion && view === lastView) return;
          // Elements added or changed (drawn with Excalidraw's black, pasted, brought back by undo) take the theme's values.
          if (version !== lastVersion) queueMicrotask(() => convert?.());
          if (view !== lastView)
            placeDots({
              scrollX: appState.scrollX,
              scrollY: appState.scrollY,
              zoom: appState.zoom.value
            });
          lastVersion = version;
          lastView = view;
          // A preview changes nothing, and its view isn't the one to come back to.
          if (preview) return;
          clearTimeout(saveTimer);
          pendingSave = () => {
            pendingSave = undefined;
            saveDrawing(drawingId, {
              elements: elements.filter((element) => !element.isDeleted),
              files,
              view: {
                scrollX: appState.scrollX,
                scrollY: appState.scrollY,
                zoom: appState.zoom.value
              }
            });
          };
          saveTimer = setTimeout(pendingSave, SAVE_DELAY);
        };

        const initialData = {
          libraryItems: loadLibrary(),
          elements: convertColors(drawing.elements, theme(), Excalidraw.newElementWith) ?? drawing.elements,
          files: drawing.files,
          appState: {
            // The app's background shows through. Excalidraw inverts its canvas for dark mode, a color here
            // would turn into its opposite there.
            viewBackgroundColor: 'transparent',
            ...(drawing.view && !preview
              ? {
                  scrollX: drawing.view.scrollX,
                  scrollY: drawing.view.scrollY,
                  zoom: { value: drawing.view.zoom }
                }
              : {})
          },
          scrollToContent: !drawing.view || preview
        };

        /**
         * A web embed: in a preview a placeholder (nothing loaded), a YouTube video from youtube-nocookie.com, the
         * others as Excalidraw shows them (null). Without Excalidraw's own iframe, a click in the middle of a video
         * only activates it, the video's own play button plays it.
         * @param {any} element
         */
        const renderEmbeddable = (element) => {
          if (preview) return React.createElement('div', { className: 'embed-placeholder' }, React.createElement('span', { className: 'm3-icon' }, 'smart_display'));
          const src = youtubeNoCookie(element.link);
          if (!src) return null;
          return React.createElement('iframe', {
            className: 'excalidraw__embeddable',
            src,
            scrolling: 'no',
            // Only this site's address, not the page's (YouTube's player needs to know where it's shown).
            referrerPolicy: 'strict-origin-when-cross-origin',
            title: 'Excalidraw Embedded Content',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowFullScreen: true,
            sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads'
          });
        };

        // Zoomed out to show it all, but never in beyond 100%.
        fitPreview = () => api?.scrollToContent(undefined, { fitToContent: true, animate: false });

        /**
         * A click with the post-it tool places a note there and starts writing in it, then it's back to selecting.
         * @param {any} activeTool @param {any} pointerDownState
         */
        const onPointerUp = (activeTool, pointerDownState) => {
          if (activeTool.type !== 'custom' || activeTool.customType !== POST_IT_TOOL) return;
          const center = pointerDownState.origin;
          // After Excalidraw is done with the click, it would undo the selection.
          setTimeout(() => {
            const [note] = Excalidraw.convertToExcalidrawElements([postItSkeleton(center, stored(postItColor, theme()))]);
            api.updateScene({
              elements: [...api.getSceneElementsIncludingDeleted(), note],
              appState: { selectedElementIds: { [note.id]: true } },
              captureUpdate: Excalidraw.CaptureUpdateAction.IMMEDIATELY
            });
            api.setActiveTool({ type: 'selection' });
            // Excalidraw has no call to start writing in a shape, Enter on a selected one does that.
            requestAnimationFrame(() =>
              canvasParent
                .querySelector('.excalidraw-container')
                ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
            );
          });
        };

        /** A note, drawn like Excalidraw's own tool icons. */
        const POST_IT_ICON = React.createElement(
          'svg',
          {
            'aria-hidden': 'true',
            focusable: 'false',
            role: 'img',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
          React.createElement('path', { d: 'M13 20l7 -7' }),
          React.createElement('path', {
            d: 'M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7'
          })
        );

        /**
         * A row of color buttons like Excalidraw's, with the app's colors (and "transparent" when given). Shown
         * through Excalidraw's dark mode filter like its own, so they look like what's drawn with them.
         * @param {{colors: import('./palette.js').AppColor[], transparent?: boolean, active: string | null, onPick: (value: string) => void}} props
         */
        const Swatches = ({ colors, transparent, active, onPick }) =>
          React.createElement(
            'div',
            { className: 'app-colors' },
            [
              ...(transparent ? [{ name: 'Transparent', value: 'transparent' }] : []),
              ...colors.map((color) => ({ name: color.name, value: stored(color, theme()) }))
            ].map(({ name, value }) =>
              React.createElement(
                'button',
                {
                  key: name,
                  type: 'button',
                  className: ['color-picker__button', value === active && 'active', value === 'transparent' && 'is-transparent'].filter(Boolean).join(' '),
                  style: { '--swatch-color': value },
                  title: name,
                  'aria-label': name,
                  onClick: () => onPick(value)
                },
                React.createElement('div', { className: 'color-picker__button-outline' })
              )
            )
          );

        /**
         * Excalidraw's stroke or background color action, with the app's colors instead of its own: registered
         * under its name, its properties panel shows this one.
         * @param {'strokeColor' | 'backgroundColor'} key
         */
        const colorAction = (key) => {
          const stroke = key === 'strokeColor';
          const current = stroke ? 'currentItemStrokeColor' : 'currentItemBackgroundColor';
          /** The selected elements, the text in them for the stroke color, the text being written. @param {readonly any[]} elements @param {any} appState */
          const targets = (elements, appState) => {
            const selected = (/** @type {any} */ element) => !element.isDeleted && !!appState.selectedElementIds[element.id];
            const inSelected = (/** @type {any} */ element) => stroke && !element.isDeleted && !!appState.selectedElementIds[element.containerId];
            return elements.filter((element) => selected(element) || inSelected(element) || element.id === appState.editingTextElement?.id);
          };
          return {
            name: stroke ? 'changeStrokeColor' : 'changeBackgroundColor',
            label: stroke ? 'labels.stroke' : 'labels.changeBackground',
            trackEvent: false,
            /** @param {readonly any[]} elements @param {any} appState @param {{color: string}} value */
            perform: (elements, appState, value) => {
              const ids = new Set(targets(elements, appState).map((element) => element.id));
              return {
                elements: elements.map((element) => (ids.has(element.id) ? Excalidraw.newElementWith(element, { [key]: value.color }) : element)),
                appState: { ...appState, [current]: value.color },
                captureUpdate: Excalidraw.CaptureUpdateAction.IMMEDIATELY
              };
            },
            /** @param {{elements: readonly any[], appState: any, updateData: (value: {color: string}) => void}} props */
            PanelComponent: ({ elements, appState, updateData }) => {
              const values = new Set(targets(elements, appState).map((element) => element[key]));
              const active = values.size === 0 ? appState[current] : values.size === 1 ? [...values][0] : null;
              return React.createElement(
                React.Fragment,
                null,
                React.createElement('h3', { 'aria-hidden': 'true' }, stroke ? 'Stroke' : 'Background'),
                React.createElement(Swatches, { colors: APP_COLORS, transparent: !stroke, active, onPick: (/** @type {string} */ color) => updateData({ color }) })
              );
            }
          };
        };

        /** An open book, Excalidraw's library icon. */
        const LIBRARY_ICON = React.createElement(
          'svg',
          {
            'aria-hidden': 'true',
            focusable: 'false',
            role: 'img',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
          React.createElement('path', { d: 'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0' }),
          React.createElement('path', { d: 'M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0' }),
          React.createElement('path', { d: 'M3 6l0 13M12 6l0 13M21 6l0 13' })
        );

        // Excalidraw has no place for tools of its own, this one is put into its tool bar, its colors where its
        // properties panel would be. Moved back in after each of its updates, it may have drawn them anew.
        const toolbarSpot = Object.assign(document.createElement('div'), {
          className: 'toolbar-spot'
        });
        const librarySpot = Object.assign(document.createElement('div'), { className: 'toolbar-spot' });
        const zoomSpot = Object.assign(document.createElement('div'), { className: 'toolbar-spot' });

        /**
         * Zooms around the middle of the window, like Excalidraw's own zoom buttons (its `getStateForZoom`), within
         * its limits (10% to 3000%).
         * @param {(zoom: number) => number} next
         */
        const zoomTo = (next) => {
          if (!api) return;
          const { zoom, scrollX, scrollY, width, height } = api.getAppState();
          const nextZoom = Math.min(30, Math.max(0.1, Math.round(next(zoom.value) * 100) / 100));
          const [x, y] = [width / 2, height / 2];
          api.updateScene({
            appState: {
              zoom: { value: nextZoom },
              scrollX: scrollX + (x - x / zoom.value) - (x - x / nextZoom),
              scrollY: scrollY + (y - y / zoom.value) - (y - y / nextZoom)
            },
            captureUpdate: Excalidraw.CaptureUpdateAction.EVENTUALLY
          });
        };
        const panelSpot = document.createElement('div');

        /**
         * The post-it tool in the tool bar, before the "more tools" button, and the library button at its end (instead
         * of Excalidraw's, at the top right or with the phone's extra buttons). While it's picked, the colors for new
         * notes in a panel like Excalidraw's properties panel (a placed note is a rectangle, Excalidraw's own panel
         * changes its color).
         * @param {{appState: any}} props
         */
        const PostItTool = ({ appState }) => {
          // Redrawn when only the color of new notes changes, Excalidraw doesn't know about that.
          const [, redraw] = React.useReducer((/** @type {number} */ count) => count + 1, 0);
          const toolActive = appState.activeTool.type === 'custom' && appState.activeTool.customType === POST_IT_TOOL;

          React.useLayoutEffect(() => {
            const app = canvasParent.querySelector('.excalidraw-container');
            const divider = [...(app?.querySelectorAll('.App-toolbar .App-toolbar__divider') ?? [])].at(-1);
            if (divider && toolbarSpot.nextElementSibling !== divider) divider.before(toolbarSpot);
            const row = divider?.parentElement;
            if (row && row.lastElementChild !== librarySpot) row.append(librarySpot);
            // Phones: zoom buttons in the bottom bar, before undo and redo (Excalidraw has none there).
            const bottomBar = app?.querySelector('.App-bottom-bar .App-toolbar-content');
            const undoRedo = bottomBar?.lastElementChild;
            if (!bottomBar) zoomSpot.remove();
            else if (undoRedo && undoRedo !== zoomSpot && zoomSpot.nextElementSibling !== undoRedo) undoRedo.before(zoomSpot);
            // Excalidraw's hint on how to move the whiteboard isn't wanted, the others are. It can't be turned off and
            // has no class of its own, it's told apart by its (English) text.
            for (const hint of app?.querySelectorAll('.HintViewer') ?? []) {
              hint.classList.toggle('panning-hint', hint.textContent?.startsWith('To move canvas') ?? false);
            }
            const column = toolActive ? app?.querySelector('.App-menu_top__left') : null;
            if (!column) panelSpot.remove();
            else if (panelSpot.parentElement !== column) column.append(panelSpot);
          });

          const tool = React.createElement(
            'label',
            { className: 'ToolIcon Shape fillable', title: 'Post-it Note' },
            React.createElement('input', {
              className: 'ToolIcon_type_radio ToolIcon_size_medium',
              type: 'radio',
              name: 'editor-current-shape',
              'aria-label': 'Post-it Note',
              checked: toolActive,
              onChange: () => api?.setActiveTool({ type: 'custom', customType: POST_IT_TOOL })
            }),
            React.createElement('div', { className: 'ToolIcon__icon' }, POST_IT_ICON)
          );

          const libraryOpen = appState.openSidebar?.name === 'default';
          const library = React.createElement(
            'button',
            {
              type: 'button',
              className: libraryOpen ? 'ToolIcon ToolIcon_type_button ToolIcon_size_medium library-button selected' : 'ToolIcon ToolIcon_type_button ToolIcon_size_medium library-button',
              title: 'Library',
              'aria-label': 'Library',
              'aria-pressed': libraryOpen,
              onClick: () => api?.toggleSidebar({ name: 'default', tab: 'library' })
            },
            React.createElement('div', { className: 'ToolIcon__icon' }, LIBRARY_ICON)
          );

          /** @param {string} name @param {string} className @param {() => void} onClick @param {any} content @param {boolean} [disabled] */
          const zoomButton = (name, className, onClick, content, disabled = false) =>
            React.createElement(
              'button',
              { type: 'button', className: `ToolIcon ToolIcon_type_button ToolIcon_size_medium zoom-button ${className}`, title: name, 'aria-label': name, disabled, onClick },
              content
            );
          const zoomIcon = (/** @type {string} */ d) =>
            React.createElement(
              'div',
              { className: 'ToolIcon__icon' },
              React.createElement(
                'svg',
                { 'aria-hidden': 'true', focusable: 'false', role: 'img', viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d })
              )
            );
          const zoom = React.createElement(
            'div',
            { className: 'zoom-actions mobile-zoom' },
            zoomButton('Zoom Out', 'zoom-out-button', () => zoomTo((value) => value - 0.1), zoomIcon('M4.167 10h11.666'), appState.zoom.value <= 0.1),
            zoomButton('Reset Zoom', 'reset-zoom-button', () => zoomTo(() => 1), `${Math.round(appState.zoom.value * 100)}%`),
            zoomButton('Zoom In', 'zoom-in-button', () => zoomTo((value) => value + 0.1), zoomIcon('M10 4.167v11.666M4.167 10h11.666'), appState.zoom.value >= 30)
          );

          const colorsSection = React.createElement(
            'div',
            null,
            React.createElement('h3', { 'aria-hidden': 'true' }, 'Background'),
            React.createElement(Swatches, {
              colors: POST_IT_COLORS,
              active: stored(postItColor, theme()),
              onPick: (/** @type {string} */ value) => {
                postItColor = POST_IT_COLORS.find((color) => stored(color, theme()) === value) ?? postItColor;
                redraw();
              }
            })
          );
          const panel = React.createElement(
            'section',
            { className: 'selected-shape-actions' },
            React.createElement(
              'div',
              { className: 'Island App-menu__left', style: { '--padding': 2 } },
              React.createElement('div', { className: 'panelColumn' }, colorsSection)
            )
          );

          return React.createElement(
            React.Fragment,
            null,
            createPortal(tool, toolbarSpot),
            createPortal(library, librarySpot),
            createPortal(zoom, zoomSpot),
            toolActive && createPortal(panel, panelSpot)
          );
        };

        root = createRoot(canvasParent);
        render = () =>
          root?.render(
            React.createElement(Excalidraw.Excalidraw, {
              initialData,
              theme: settings.resolvedTheme === 'light' ? 'light' : 'dark',
              onChange,
              onPointerUp,
              renderEmbeddable,
              // A preview changes nothing, also not the library.
              onLibraryChange: preview ? undefined : (/** @type {readonly any[]} */ items) => saveLibrary(items),
              viewModeEnabled: preview,
              zenModeEnabled: preview,
              excalidrawAPI: (/** @type {any} */ value) => {
                api = value;
                appStateOf = () => api.getAppState();
                api.registerAction(colorAction('strokeColor'));
                api.registerAction(colorAction('backgroundColor'));
                if (preview) requestAnimationFrame(fitPreview);
              },
              renderTopRightUI: preview
                ? undefined
                : (/** @type {boolean} */ _isMobile, /** @type {any} */ appState) => React.createElement(PostItTool, { appState }),
              UIOptions: { canvasActions: { changeViewBackgroundColor: false, toggleTheme: false } }
            })
          );
        if (preview) {
          resizeObserver = new ResizeObserver(() => fitPreview());
          resizeObserver.observe(whiteboard);
        } else {
          onStorage = (event) => {
            if (isLibraryChange(event)) api?.updateLibrary({ libraryItems: loadLibrary(), merge: false });
          };
          window.addEventListener('storage', onStorage);
        }
      } catch (error) {
        console.error(error);
        failed = true;
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(saveTimer);
      pendingSave?.();
      resizeObserver?.disconnect();
      if (onStorage) window.removeEventListener('storage', onStorage);
      // Unmounted after Svelte is done with this component: React doesn't like being stopped while it draws.
      const done = root;
      queueMicrotask(() => done?.unmount());
    };
  });

  // Drawn again when the theme changes, the drawing's colors switched to the theme's values. `render` and `convert`
  // are set once Excalidraw has loaded.
  $effect(() => {
    void settings.resolvedTheme;
    render?.();
    convert?.();
  });
</script>

<div class="whiteboard" class:preview bind:this={whiteboard}>
  <div class="canvas" bind:this={canvasParent}></div>

  {#if failed}
    <p class="failed">The whiteboard couldn't be loaded.</p>
  {/if}
</div>


<style>
  /* The background in the theme's color with dots in the page's wave color, a dot on every grid point (each
     tile has its dot in the corner, so the offset puts one on the whiteboard's 0, 0). */
  .whiteboard {
    position: absolute;
    inset: 0;
    overflow: hidden;
    /* Its buttons are laid out by its own size, not the window's: it may be in a smaller window on a board. */
    container: whiteboard / size;
    background-color: var(--bg);
    background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--wave), transparent 55%) 1px, transparent 1.5px);
    background-size: var(--dots-size, 40px) var(--dots-size, 40px);
    background-position: calc(var(--dots-x, 0px) - 1px) calc(var(--dots-y, 0px) - 1px);
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

  /* A preview: only the drawing, nothing of Excalidraw's to press. */
  .preview .canvas {
    pointer-events: none;
  }

  .canvas :global(.embed-placeholder) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--surface-card);
    color: var(--text-muted);
    font-size: 40px;
  }

  .preview .canvas :global(.excalidraw .layer-ui__wrapper),
  .preview .canvas :global(.excalidraw .App-top-bar),
  .preview .canvas :global(.excalidraw .App-bottom-bar) {
    display: none;
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

  /* The library button is in the tool bar (see `PostItTool`), not where Excalidraw puts its own. */
  .canvas :global(.excalidraw .default-sidebar-trigger) {
    display: none;
  }

  /* The zoom buttons in the phone's bottom bar (see `PostItTool`), Excalidraw's desktop ones in a row. On the
     narrowest phones without the zoom level between them, there's no room. */
  .canvas :global(.excalidraw .mobile-zoom) {
    display: flex;
    overflow: hidden;
  }

  @container whiteboard (max-width: 400px) {
    .canvas :global(.excalidraw .mobile-zoom .reset-zoom-button) {
      display: none;
    }
  }

  /* Open like a picked tool. */
  .canvas :global(.excalidraw .library-button.selected .ToolIcon__icon) {
    background-color: var(--color-surface-primary-container);
    color: var(--color-on-primary-container);
  }

  /* The post-it tool and the library button sit among Excalidraw's tools as if they were some of them. */
  .canvas :global(.toolbar-spot) {
    display: contents;
  }

  /* Room for what floats over the top corners (on a Whiteboard page the app's menu button and the page's settings
     button), Excalidraw's own buttons there move aside. */
  .canvas :global(.excalidraw .App-menu_top__left) {
    margin-left: var(--whiteboard-side, 0px);
  }

  .canvas :global(.excalidraw .layer-ui__wrapper__top-right) {
    margin-right: var(--whiteboard-side, 0px);
  }

  /* A tool bar wider than the window scrolls sideways. The row of tools scrolls, not the bar around it: the "more
     tools" menu and the hints are placed from the bar and would be cut off. */
  .canvas :global(.excalidraw:not(.excalidraw--mobile) .App-toolbar > .Stack_horizontal) {
    max-width: calc(100cqw - 3rem);
    overflow-x: auto;
    overscroll-behavior: contain;
  }

  /* The app's color buttons in the properties panel (see `colorAction`), in rows like the app's color pickers. */
  .canvas :global(.excalidraw .app-colors) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0.25rem 0;
  }

  /* On phones (Excalidraw's phone layout) and narrow windows the tool bar stands on the right edge, below what
     floats over the top (`--whiteboard-top`) and above Excalidraw's bottom buttons, and scrolls when it's taller than that.
     Excalidraw lays it out in grids, they become columns that can shrink. On phones the lock, hand and library
     buttons are a second bar below it, as wide as the first. */
  .canvas :global(.excalidraw--mobile .App-top-bar) {
    top: var(--whiteboard-top, 14px);
    right: 14px;
    bottom: 96px;
    left: auto;
    align-items: flex-end;
  }

  .canvas :global(.excalidraw--mobile .App-top-bar > section),
  .canvas :global(.excalidraw--mobile .App-top-bar > section > .Stack),
  .canvas :global(.excalidraw--mobile .App-toolbar-container),
  .canvas :global(.excalidraw--mobile .App-toolbar) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    width: auto;
    max-width: none;
    min-height: 0;
    max-height: 100%;
  }

  .canvas :global(.excalidraw--mobile .App-toolbar) {
    gap: 0;
  }

  .canvas :global(.excalidraw--mobile .App-toolbar > .Stack_horizontal) {
    grid-template-rows: none;
    grid-auto-flow: row;
    grid-auto-rows: min-content;
    justify-items: center;
    min-height: 0;
    max-width: none;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .canvas :global(.excalidraw--mobile .App-toolbar .App-toolbar__divider) {
    width: 1.5rem;
    height: 1px;
    margin: 0.25rem auto;
  }

  /* Every button in both bars the same size. */
  .canvas :global(.excalidraw--mobile .App-toolbar-container .ToolIcon__icon) {
    width: var(--default-button-size);
    height: var(--default-button-size);
    border-radius: var(--border-radius-lg);
  }

  /* "More tools" opens to the left of the bar. */
  .canvas :global(.excalidraw--mobile .App-toolbar .App-toolbar__extra-tools-dropdown) {
    top: auto;
    bottom: 0;
    left: auto;
    right: calc(100% + 6px);
    width: max-content;
    margin: 0;
  }

  .canvas :global(.excalidraw--mobile .mobile-misc-tools-container) {
    position: static;
    flex-shrink: 0;
    align-items: center;
    padding: calc(var(--space-factor));
    border: none;
    border-radius: var(--border-radius-lg);
    background-color: var(--island-bg-color);
    box-shadow: var(--shadow-island);
  }

  /* The hint about moving the whiteboard, see `PostItTool`. */
  .canvas :global(.excalidraw .HintViewer.panning-hint) {
    display: none;
  }

  .canvas :global(.excalidraw--mobile .App-top-bar .HintViewer) {
    max-width: 60cqw;
    padding-right: 0;
  }

  /* Narrow whiteboards: Excalidraw's tool bar in the middle of the top would run into the buttons beside it. Its
     hints show to the left of it. */
  @container whiteboard (max-width: 1100px) {
    .canvas :global(.excalidraw:not(.excalidraw--mobile) .shapes-section) {
      position: absolute;
      top: calc(var(--whiteboard-top, 14px) - var(--editor-container-padding));
      right: calc(14px - var(--editor-container-padding));
      bottom: 3.5rem;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-end;
    }

    .canvas :global(.excalidraw:not(.excalidraw--mobile) .shapes-section > div),
    .canvas :global(.excalidraw:not(.excalidraw--mobile) .shapes-section > div > .Stack),
    .canvas :global(.excalidraw:not(.excalidraw--mobile) .shapes-section .App-toolbar-container),
    .canvas :global(.excalidraw:not(.excalidraw--mobile) .shapes-section .App-toolbar) {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: auto;
      min-height: 0;
      max-height: 100%;
    }

    .canvas :global(.excalidraw:not(.excalidraw--mobile) .App-toolbar > .Stack_horizontal) {
      grid-template-rows: none;
      grid-auto-flow: row;
      grid-auto-rows: min-content;
      justify-items: center;
      min-height: 0;
      max-width: none;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .canvas :global(.excalidraw:not(.excalidraw--mobile) .App-toolbar .App-toolbar__divider) {
      width: 1.5rem;
      height: 1px;
      margin: 0.25rem auto;
    }

    .canvas :global(.excalidraw:not(.excalidraw--mobile) .App-toolbar .App-toolbar__extra-tools-dropdown) {
      top: auto;
      bottom: 0;
      left: auto;
      right: calc(100% + 6px);
      width: max-content;
      margin: 0;
    }

    .canvas :global(.excalidraw:not(.excalidraw--mobile) .App-toolbar .HintViewer) {
      top: 0;
      right: calc(100% + 6px);
      left: auto;
      width: max-content;
      max-width: 40cqw;
    }
  }
</style>
