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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Plus, Trash2, Loader2, Sparkles, Edit2, Check, X } from 'lucide-react';
import {
  useAllSpecialtyOptions,
  useAddSpecialtyOption,
  useUpdateSpecialtyOption,
  useDeleteSpecialtyOption,
  useReorderSpecialtyOptions,
  type SpecialtyOption,
} from '@/hooks/useSpecialtyOptions';
import { cn } from '@/lib/utils';
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

interface SortableSpecialtyItemProps {
  option: SpecialtyOption;
  onUpdate: (id: string, updates: Partial<SpecialtyOption>) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}

function SortableSpecialtyItem({ option, onUpdate, onDelete, isUpdating }: SortableSpecialtyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(option.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveName = () => {
    if (editName.trim() && editName.trim().toUpperCase() !== option.name) {
      onUpdate(option.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(option.name);
    setIsEditing(false);
  };

  const isExtensions = option.name.toLowerCase().includes('extension');
  const displayName = option.name;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center gap-1.5 px-2.5 py-1.5 bg-background border rounded-md transition-all",
          isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
          !option.is_active && "opacity-50"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-0.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {isEditing ? (
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <Input
              value={editName}
              onChange={(e) => {
                const value = e.target.value.split(' ').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                setEditName(value);
              }}
              className="h-7 text-xs min-w-0 flex-1 rounded-md px-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <button onClick={handleSaveName} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-foreground" />
            </button>
            <button onClick={handleCancelEdit} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted flex-shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center gap-1 min-w-0">
              {isExtensions && <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />}
              <span className={cn("text-xs font-sans truncate min-w-0", !option.is_active && "text-muted-foreground")}>{displayName}</span>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit2 className="w-3 h-3 text-muted-foreground" />
            </button>

            <div className="flex-shrink-0 scale-[0.8] origin-center">
              <Switch
                checked={option.is_active}
                onCheckedChange={(checked) => onUpdate(option.id, { is_active: checked })}
                disabled={isUpdating}
              />
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isUpdating}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Specialty</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{option.name}"? This will not remove it from existing stylist profiles, but it will no longer appear as an option.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(option.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SpecialtyOptionsManager() {
  const [newSpecialty, setNewSpecialty] = useState('');
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  const { data: options = [], isLoading } = useAllSpecialtyOptions();
  const addOption = useAddSpecialtyOption();
  const updateOption = useUpdateSpecialtyOption();
  const deleteOption = useDeleteSpecialtyOption();
  const reorderOptions = useReorderSpecialtyOptions();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const displayOptions = orderedIds
    ? orderedIds.map(id => options.find(o => o.id === id)).filter(Boolean) as SpecialtyOption[]
    : options;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentOrder = orderedIds || options.map(o => o.id);
      const oldIndex = currentOrder.findIndex((id) => id === active.id);
      const newIndex = currentOrder.findIndex((id) => id === over.id);
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
      setOrderedIds(newOrder);
    }
  };

  const handleSaveOrder = () => {
    if (orderedIds) {
      reorderOptions.mutate(orderedIds, {
        onSuccess: () => setOrderedIds(null),
      });
    }
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.trim()) {
      addOption.mutate({ name: newSpecialty.trim() }, {
        onSuccess: () => setNewSpecialty(''),
      });
    }
  };

  const hasOrderChanges = orderedIds !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Specialty Options
        </CardTitle>
        <CardDescription>
          Manage the specialty options that stylists can select in their profiles and that appear as filters on the homepage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Specialty */}
        <div className="flex gap-2">
          <Input
            placeholder="Add new specialty..."
            value={newSpecialty}
            onChange={(e) => {
              const value = e.target.value.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
              setNewSpecialty(value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSpecialty()}
          />
          <Button
            onClick={handleAddSpecialty}
            disabled={!newSpecialty.trim() || addOption.isPending}
          >
            {addOption.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Order Save Bar */}
        {hasOrderChanges && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg animate-fade-in">
            <p className="text-sm text-muted-foreground">
              Unsaved order changes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size={tokens.button.card}
                onClick={() => setOrderedIds(null)}
                disabled={reorderOptions.isPending}
              >
                Reset
              </Button>
              <Button
                size={tokens.button.card}
                onClick={handleSaveOrder}
                disabled={reorderOptions.isPending}
              >
                {reorderOptions.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Save Order
              </Button>
            </div>
          </div>
        )}

        {/* Specialty List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : options.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No specialty options yet. Add one above.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayOptions.map(o => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {(() => {
                const categories = [...new Set(displayOptions.map(o => o.category))];
                return categories.map(category => (
                  <div key={category} className="space-y-2 mb-4">
                    <p className="text-xs font-display tracking-wide text-muted-foreground uppercase">{category}</p>
                    <div className="space-y-1">
                      {displayOptions.filter(o => o.category === category).map((option) => (
                        <SortableSpecialtyItem
                          key={option.id}
                          option={option}
                          onUpdate={(id, updates) => updateOption.mutate({ id, ...updates })}
                          onDelete={(id) => deleteOption.mutate(id)}
                          isUpdating={updateOption.isPending || deleteOption.isPending}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </SortableContext>
          </DndContext>
        )}

        <p className="text-xs text-muted-foreground">
          Drag to reorder. The order here determines the order of filters on the homepage.
          Toggle visibility to hide options from selection without deleting them.
        </p>
      </CardContent>
    </Card>
  );
}
