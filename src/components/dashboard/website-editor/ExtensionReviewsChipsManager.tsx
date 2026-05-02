import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, GripVertical, RotateCcw, Tags } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import {
  useExtensionReviewsConfig,
  type ExtensionReviewsConfig,
  DEFAULT_EXTENSION_REVIEWS,
} from '@/hooks/useSectionConfig';
import { ToggleInput } from './inputs/ToggleInput';
import { useDebounce } from '@/hooks/use-debounce';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { EditorCard } from './EditorCard';
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

interface SortableChipRowProps {
  id: string;
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  onDelete: (index: number) => void;
}

function SortableChipRow({ id, index, value, onChange, onDelete }: SortableChipRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border border-border/40 rounded-lg bg-background"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        maxLength={40}
        placeholder="Category name"
        className="flex-1"
      />
      <Button
        variant="ghost"
        size={tokens.button.inline}
        onClick={() => onDelete(index)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Delete category"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ExtensionReviewsChipsManager() {
  const __saveTelemetry = useSaveTelemetry('extension-reviews-chips-manager');
  const { data, isLoading, update } = useExtensionReviewsConfig();
  const [localConfig, setLocalConfig] = useState<ExtensionReviewsConfig>(DEFAULT_EXTENSION_REVIEWS);
  const debouncedConfig = useDebounce(localConfig, 300);

  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_extension_reviews', debouncedConfig);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Extension chips saved');
      clearPreviewOverride('section_extension_reviews', effectiveOrganization?.id ?? null);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateCategory = (index: number, value: string) => {
    const next = [...localConfig.extension_categories];
    next[index] = value;
    setLocalConfig((prev) => ({ ...prev, extension_categories: next }));
  };

  const deleteCategory = (index: number) => {
    const next = localConfig.extension_categories.filter((_, i) => i !== index);
    setLocalConfig((prev) => ({ ...prev, extension_categories: next }));
  };

  const addCategory = () => {
    setLocalConfig((prev) => ({
      ...prev,
      extension_categories: [...prev.extension_categories, ''],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).replace('chip-', ''), 10);
    const newIndex = parseInt(String(over.id).replace('chip-', ''), 10);
    setLocalConfig((prev) => ({
      ...prev,
      extension_categories: arrayMove(prev.extension_categories, oldIndex, newIndex),
    }));
  };

  const handleReset = () => {
    setLocalConfig((prev) => ({
      ...prev,
      extension_categories: [...DEFAULT_EXTENSION_REVIEWS.extension_categories],
      show_categories: DEFAULT_EXTENSION_REVIEWS.show_categories,
    }));
    toast.info('Reset to defaults — save to apply');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = localConfig.extension_categories.map((_, i) => `chip-${i}`);

  return (
    <EditorCard
      title="Extension Type Chips"
      icon={Tags}
      headerActions={
        <Button
          variant="ghost"
          size={tokens.button.inline}
          onClick={handleReset}
          className="text-muted-foreground gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      }
    >
      <ToggleInput
        label="Show Category Chips"
        value={localConfig.show_categories}
        onChange={(value) => setLocalConfig((prev) => ({ ...prev, show_categories: value }))}
        description="Display the row of extension-type pills below the reviews"
      />

      {localConfig.show_categories && (
        <div className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Drag to reorder. Keep labels short — they render as inline pills.
          </p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {localConfig.extension_categories.map((value, index) => (
                  <SortableChipRow
                    key={`chip-${index}`}
                    id={`chip-${index}`}
                    index={index}
                    value={value}
                    onChange={updateCategory}
                    onDelete={deleteCategory}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {localConfig.extension_categories.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No categories yet — add one below.
            </p>
          )}

          <Button variant="outline" size={tokens.button.card} onClick={addCategory} className="w-full gap-1.5">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      )}
    </EditorCard>
  );
}
