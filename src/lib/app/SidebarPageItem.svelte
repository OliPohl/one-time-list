<!-- src/lib/app/SidebarPageItem.svelte -->
<!-- A page in the sidebar. Opens the page, deleting asks first. -->
<script>
  import { PAGE_TYPES } from '../pages/index.js';
  import { pages } from './pages.svelte.js';
  import { navigation } from './navigation.svelte.js';
  import SidebarRow from './SidebarRow.svelte';

  /**
   * @type {{
   *   page: import('../pages/types.js').Page,
   *   active: boolean,
   *   editing: boolean,
   *   onEditChange: (editing: boolean) => void
   * }}
   */
  let { page, active, editing, onEditChange } = $props();

  let pageType = $derived(PAGE_TYPES[page.type]);
  let ringing = $derived(pages.isRinging(page));
</script>

<SidebarRow
  kind="Page"
  icon={pageType.icon}
  name={page.name}
  title={ringing ? `${pageType.label}: ringing` : pageType.label}
  {active}
  {ringing}
  breakEnd={ringing && pages.isBreakEnd(page)}
  {editing}
  {onEditChange}
  onOpen={() => navigation.go({ kind: 'page', id: page.id })}
  onRename={(name) => pages.rename(page.id, name)}
  onDelete={() => navigation.deletePage(page.id)} />
