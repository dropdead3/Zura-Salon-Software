import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditorCard } from '../EditorCard';
import { MenuItemNode } from './MenuItemNode';
import { AddMenuItemDialog } from './AddMenuItemDialog';
import { useReorderMenuItems, type MenuItem, buildMenuTree } from '@/hooks/useWebsiteMenus';
import type { WebsitePagesConfig } from '@/hooks/useWebsitePages';
import { tokens } from '@/lib/design-tokens';

interface MenuTreeEditorProps {
  menuId: string;
  items: MenuItem[];
  isLoading: boolean;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  pagesConfig: WebsitePagesConfig | null | undefined;
}

export function MenuTreeEditor({
  menuId,
  items,
  isLoading,
  selectedItemId,
  onSelectItem,
  pagesConfig,
}: MenuTreeEditorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const reorder = useReorderMenuItems();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tree = buildMenuTree(items);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = items.find(i => i.id === active.id);
    const overItem = items.find(i => i.id === over.id);
    if (!activeItem || !overItem) return;

    // Cross-parent move support (max depth = 2, enforced by RPC):
    // - Dropping onto a sibling (same parent_id) reorders within the group.
    // - Dropping onto a different item adopts that item's parent_id (or, if
    //   the target is a root-level item with no children of the active item
    //   creating depth>2, becomes a sibling of the target at root). The
    //   server RPC rejects any move that would exceed depth=2.
    const activeWouldBeParent = items.some(i => i.parent_id === activeItem.id);
    const targetIsChild = overItem.parent_id !== null;

    // If we're moving a parent (has children) under another parent, that
    // would create depth=3 — block at the client to avoid a server round-trip.
    if (activeWouldBeParent && targetIsChild) return;

    const newParentId = overItem.parent_id;

    // Build the new sibling list at the destination parent.
    const destSiblings = items
      .filter(i => i.parent_id === newParentId && i.id !== activeItem.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    const overIndex = destSiblings.findIndex(i => i.id === overItem.id);
    const insertAt = overIndex === -1 ? destSiblings.length : overIndex;
    const movedItem: MenuItem = { ...activeItem, parent_id: newParentId };
    const newDest = [
      ...destSiblings.slice(0, insertAt),
      movedItem,
      ...destSiblings.slice(insertAt),
    ];

    // Re-sequence: destination siblings get fresh sort_order; if the active
    // item changed parent, also re-sequence the source siblings.
    const updates: { id: string; sort_order: number; parent_id: string | null }[] = newDest.map(
      (item, idx) => ({ id: item.id, sort_order: idx, parent_id: newParentId }),
    );

    if (activeItem.parent_id !== newParentId) {
      const sourceSiblings = items
        .filter(i => i.parent_id === activeItem.parent_id && i.id !== activeItem.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      sourceSiblings.forEach((item, idx) => {
        updates.push({ id: item.id, sort_order: idx, parent_id: activeItem.parent_id });
      });
    }

    reorder.mutate({ items: updates, menuId });
  };

  if (isLoading) {
    return (
      <EditorCard title="Menu Items">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </EditorCard>
    );
  }

  return (
    <EditorCard
      title="Menu Items"
      description={`${items.length} item${items.length !== 1 ? 's' : ''}`}
      headerActions={
        <Button
          variant="outline"
          size={tokens.button.inline}
          className="h-7 text-xs"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      }
    >
      {tree.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-muted-foreground">No menu items yet</p>
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add First Item
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {tree.map(item => (
                <MenuItemNode
                  key={item.id}
                  item={item}
                  depth={0}
                  isSelected={selectedItemId === item.id}
                  selectedItemId={selectedItemId}
                  onSelect={onSelectItem}
                  pagesConfig={pagesConfig}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddMenuItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        menuId={menuId}
        pagesConfig={pagesConfig}
        existingItemCount={items.length}
        menuItems={items}
      />
    </EditorCard>
  );
}
