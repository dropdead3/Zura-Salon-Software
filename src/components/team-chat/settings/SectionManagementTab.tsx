import { useState } from 'react';
import { useChatSections, type CreateSectionData } from '@/hooks/team-chat/useChatSections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, GripVertical, Folder, Edit2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface SortableSectionItemProps {
  section: { id: string; name: string; icon: string; is_system: boolean };
  onEdit: () => void;
  onDelete: () => void;
}

function SortableSectionItem({ section, onEdit, onDelete }: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Folder className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 font-medium">{section.name}</span>
      {section.is_system && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">System</span>
      )}
      {!section.is_system && (
        <>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function SectionManagementTab() {
  const {
    sections,
    isLoading,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    isCreating,
    isDeleting,
  } = useChatSections();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<{ id: string; name: string } | null>(null);
  const [deletingSection, setDeletingSection] = useState<{ id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    const newOrder = arrayMove(sections, oldIndex, newIndex);
    reorderSections(newOrder.map(s => s.id));
  };

  const handleCreate = () => {
    if (!newSectionName.trim()) return;
    createSection({ name: newSectionName.trim() });
    setNewSectionName('');
    setIsCreateOpen(false);
  };

  const handleUpdate = () => {
    if (!editingSection || !editingSection.name.trim()) return;
    updateSection({ id: editingSection.id, name: editingSection.name.trim() });
    setEditingSection(null);
  };

  const handleDelete = () => {
    if (!deletingSection) return;
    deleteSection(deletingSection.id);
    setDeletingSection(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Channel Sections</CardTitle>
            <CardDescription>
              Create custom sections to organize channels in the sidebar
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size={tokens.button.card}>
                <Plus className="h-4 w-4 mr-2" />
                New Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Section</DialogTitle>
                <DialogDescription>
                  Add a new section to organize your channels
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="section-name">Section Name</Label>
                  <Input
                    id="section-name"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="e.g., Projects, Teams, Departments"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !newSectionName.trim()}>
                  Create Section
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No custom sections yet</p>
            <p className="text-sm">Create sections to organize your channels</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((section) => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    onEdit={() => setEditingSection({ id: section.id, name: section.name })}
                    onDelete={() => setDeletingSection({ id: section.id, name: section.name })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-section-name">Section Name</Label>
              <Input
                id="edit-section-name"
                value={editingSection?.name || ''}
                onChange={(e) =>
                  setEditingSection((prev) => (prev ? { ...prev, name: e.target.value } : null))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSection} onOpenChange={(open) => !open && setDeletingSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the "{deletingSection?.name}" section. Channels in this section will be
              moved to the default view. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
