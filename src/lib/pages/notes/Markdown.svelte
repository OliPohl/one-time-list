<!-- src/lib/pages/notes/Markdown.svelte -->
<!-- A note shown formatted. Its task list checkboxes can be ticked. Used by the dashboard card of a Notes page. -->
<script>
  import { renderMarkdown } from './markdown.js';
  import './code-theme.css';

  /** @type {{text: string, onToggleTask: (index: number) => void, compact?: boolean}} */
  let { text, onToggleTask, compact = false } = $props();

  // Sanitized in `renderMarkdown`.
  let html = $derived(renderMarkdown(text));

  /** @param {MouseEvent} event */
  function handleClick(event) {
    const target = /** @type {HTMLElement} */ (event.target);
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    const container = /** @type {HTMLElement} */ (event.currentTarget);
    onToggleTask([...container.querySelectorAll('input[type="checkbox"]')].indexOf(target));
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="markdown" class:compact onclick={handleClick}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized with DOMPurify -->
  {@html html}
</div>


<style>
  .markdown {
    color: var(--text);
    font-family: "Roboto Slab", serif;
    font-size: 17px;
    line-height: 1.4;
    overflow-wrap: anywhere;
    /* A tab is as wide as the 4 spaces the Tab key types. */
    tab-size: 4;
    /* Widths of list signs in this font (Roboto Slab), measured. Lists are laid out with them exactly where their
       Markdown would be ("- ", "1. ", 4 spaces per level). */
    --dash: 0.3892em;
    --space: 0.2486em;
    --box: 0.798em;
    --box-checked: 1.1367em;
    --nest: 0.9942em;
  }

  .markdown > :global(:first-child) {
    margin-top: 0;
  }

  .markdown > :global(:last-child) {
    margin-bottom: 0;
  }

  /* The page title is the main heading in the primary color (accent), so headings start with the secondary
     (task) and tertiary (wave) colors, then go round again. Each level is a bit smaller. */
  /* In :where, so the first and last child rules above still remove the outer margins. */
  .markdown :global(:where(h1, h2, h3, h4, h5, h6)) {
    margin: 1.2em 0 0.4em;
  }

  .markdown :global(:where(h1, h2, h3, h4, h5, h6)) {
    font-family: "Stoke", serif;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  .markdown :global(h1) { font-size: 1.6em; color: var(--task); }
  .markdown :global(h2) { font-size: 1.4em; color: var(--wave); }
  .markdown :global(h3) { font-size: 1.25em; color: var(--accent); }
  .markdown :global(h4) { font-size: 1.12em; color: var(--task); }
  .markdown :global(h5) { font-size: 1.05em; color: var(--wave); }
  .markdown :global(h6) { font-size: 1em; color: var(--accent); }

  .markdown :global(p),
  .markdown :global(ul),
  .markdown :global(ol),
  .markdown :global(blockquote),
  .markdown :global(pre),
  .markdown :global(table) {
    margin: 0 0 0.4em;
  }

  /* Bullets and numbers sit where their Markdown is: "- " and "1. " at the start of the line, 4 spaces deeper per
     level. */
  .markdown :global(:is(ul, ol)) {
    padding-left: 0;
    list-style: none;
  }

  .markdown :global(li > :is(ul, ol)) {
    margin: 0;
    padding-left: var(--nest);
  }

  .markdown :global(ul > li::before) {
    content: '•';
    display: inline-block;
    width: var(--dash);
    margin-right: var(--space);
    text-align: center;
  }

  .markdown :global(ul ul > li::before) {
    content: '◦';
  }

  .markdown :global(ul ul ul > li::before) {
    content: '▪';
  }

  .markdown :global(ol > li::before) {
    content: counter(list-item) '. ';
    white-space: pre;
  }

  .markdown :global(li + li) {
    margin-top: 0;
  }

  /* Lists with blank lines between their items wrap them in paragraphs, they keep the spacing of other lists. */
  .markdown :global(li > p) {
    margin: 0;
    display: inline;
  }

  /* Task items: no bullet, its place stays empty ("- "), the checkbox takes the place of "[ ]". */
  .markdown :global(li:has(> input[type="checkbox"])::before),
  .markdown :global(li:has(> p > input[type="checkbox"])::before) {
    content: '';
  }

  /* A square as wide as "[ ]". In the text's font size, the em widths are the text's. */
  .markdown :global(input[type="checkbox"]) {
    box-sizing: border-box;
    width: var(--box);
    height: var(--box);
    margin: 0;
    font-size: inherit;
    vertical-align: -0.12em;
    accent-color: var(--accent);
    cursor: pointer;
  }

  /* "[x]" is wider than "[ ]": the rest of its width as space after the box. */
  .markdown :global(input[type="checkbox"]:checked) {
    margin-right: calc(var(--box-checked) - var(--box));
  }

  .markdown :global(a) {
    color: var(--accent);
    text-underline-offset: 0.15em;
  }

  .markdown :global(blockquote) {
    padding: 0.1em 0 0.1em 1em;
    border-left: 3px solid var(--task);
    color: var(--text-soft);
  }

  .markdown :global(blockquote > :last-child) {
    margin-bottom: 0;
  }

  .markdown :global(code) {
    padding: 0.1em 0.35em;
    border-radius: 6px;
    background-color: var(--surface-raised);
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.88em;
  }

  .markdown :global(pre) {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.88em;
    padding: 4px 12px;
    overflow-x: auto;
    border-radius: 10px;
    background-color: var(--surface-raised);
  }

  .markdown :global(pre code) {
    padding: 0;
    background: none;
    font-size: 1em;
  }

  .markdown :global(hr) {
    margin: 0.6em 0;
    border: none;
    border-top: 1.5px solid var(--line);
  }

  /* A "---" on its own takes one line, like its source: easy to click, nothing moves when it's edited. */
  .markdown > :global(hr:only-child) {
    margin: calc(0.7em - 0.75px) 0;
  }

  .markdown :global(table) {
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
  }

  .markdown :global(th),
  .markdown :global(td) {
    padding: 2px 10px;
    border: 1.5px solid var(--line);
  }

  .markdown :global(th) {
    background-color: var(--surface-raised);
  }

  .markdown :global(img) {
    max-width: 100%;
    border-radius: 12px;
  }

  .compact {
    font-size: 14px;
    line-height: 1.35;
  }

  /* Dashboard cards have the raised color already, code and table heads stand out with the plain surface. */
  .compact :global(code),
  .compact :global(pre),
  .compact :global(th) {
    background-color: var(--surface);
  }

  .compact :global(pre code) {
    background: none;
  }
</style>
