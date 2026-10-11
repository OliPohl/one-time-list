<!-- src/lib/app/SidebarFolder.svelte -->
<!-- A folder in the sidebar. Clicking it collapses or expands it, deleting it keeps its pages. -->
<script>
  import { pages } from './pages.svelte.js';
  import { folders } from './folders.svelte.js';
  import SidebarRow from './SidebarRow.svelte';
  import FolderStyle from './FolderStyle.svelte';

  /**
   * @type {{
   *   folder: import('./folders.svelte.js').FolderEntry,
   *   activePageId: string | null,
   *   editing: boolean,
   *   onEditChange: (editing: boolean) => void
   * }}
   */
  let { folder, activePageId, editing, onEditChange } = $props();

  let folderPages = $derived(folder.pageIds.map((id) => pages.get(id)).filter((page) => page !== undefined));
  // Collapsed, the folder stands in for its pages: it shows the open page and blinks for a ringing one.
  let ringingPages = $derived(folder.collapsed ? folderPages.filter((page) => pages.isRinging(page)) : []);
  let active = $derived(folder.collapsed && activePageId !== null && folder.pageIds.includes(activePageId));
  let count = $derived(folderPages.length === 1 ? '1 page' : `${folderPages.length} pages`);
  // The plain folder icon opens and closes with the folder, a picked icon stays.
  let icon = $derived(!folder.icon || folder.icon === 'folder' ? (folder.collapsed ? 'folder' : 'folder_open') : folder.icon);
</script>

<SidebarRow
  kind="Folder"
  {icon}
  iconColor={folder.color ? `var(--${folder.color})` : undefined}
  name={folder.name}
  title={ringingPages.length > 0 ? `${count}: ringing` : count}
  {active}
  ringing={ringingPages.length > 0}
  breakEnd={ringingPages.length > 0 && ringingPages.every((page) => pages.isBreakEnd(page))}
  {editing}
  {onEditChange}
  onOpen={() => folders.toggle(folder.id)}
  onRename={(name) => folders.rename(folder.id, name)}
  onDelete={() => (folders.remove(folder.id), true)}>
  {#snippet extra()}
    <FolderStyle
      compact
      icon={folder.icon ?? 'folder'}
      color={folder.color ?? ''}
      onIconChange={(icon) => folders.setStyle(folder.id, { icon })}
      onColorChange={(color) => folders.setStyle(folder.id, { color })} />
  {/snippet}
</SidebarRow>
