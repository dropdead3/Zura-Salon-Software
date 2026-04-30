/**
 * FAQ Items Manager — drag-orderable list of FAQ Q&A rows backed by
 * the website_faq_items table. Lives inside the FAQ editor screen below
 * the chrome (rotating words, intro paragraphs, CTAs, search).
 *
 * Edit model:
 *   - Loads the org's items into a local working array.
 *   - All edits (text, enabled, reorder, add, remove) stay in local state
 *     and stream into the preview iframe via usePreviewBridge under the
 *     synthetic section key `faq_items` (visible-only filtered downstream).
 *   - "Save items" diffs local vs server and runs insert/update/delete +
 *     batch reorder. clearPreviewOverride lets the iframe fall back to DB.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, GripVertical, MessageSquare, Save } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  useFAQItems,
  useCreateFAQItem,
  useUpdateFAQItem,
  useDeleteFAQItem,
  useReorderFAQItems,
  type FAQItem,
} from '@/hooks/useFAQItems';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { EditorCard } from './EditorCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Local working item — `id` may be a temp UUID for unsaved rows; `_isNew`
// marks them so save() routes them to insert vs. update.
interface DraftItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  enabled: boolean;
  sort_order: number;
  _isNew?: boolean;
}

interface SortableItemProps {
  item: DraftItem;
  index: number;
  onUpdate: (id: string, updates: Partial<DraftItem>) => void;
  onRemove: (id: string) => void;
}

function SortableItem({ item, index, onUpdate, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border border-border/40 bg-card/60 transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        !item.enabled && 'opacity-60',
      )}
    >
      <button
        className="mt-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
        type="button"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-muted-foreground">Item {index + 1}</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {item.enabled ? 'Visible' : 'Hidden'}
            </span>
            <Switch
              checked={item.enabled}
              onCheckedChange={(v) => onUpdate(item.id, { enabled: v })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Question</Label>
          <Input
            value={item.question}
            onChange={(e) => onUpdate(item.id, { question: e.target.value })}
            placeholder="What's your cancellation policy?"
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Answer</Label>
          <Textarea
            value={item.answer}
            onChange={(e) => onUpdate(item.id, { answer: e.target.value })}
            placeholder="We require 48 hours notice…"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Category (optional)</Label>
          <Input
            value={item.category ?? ''}
            onChange={(e) => onUpdate(item.id, { category: e.target.value || null })}
            placeholder="e.g. Booking, Policies, Services"
            className="h-9"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
        aria-label="Remove FAQ"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FAQItemsManager() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;
  const { data, isLoading } = useFAQItems();
  const createMut = useCreateFAQItem();
  const updateMut = useUpdateFAQItem();
  const deleteMut = useDeleteFAQItem();
  const reorderMut = useReorderFAQItems();

  const [items, setItems] = useState<DraftItem[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // IDs of items present on the server but removed locally — saved on commit.
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  // Initialize local items from server once data arrives.
  useEffect(() => {
    if (data && !hasInitialized) {
      setItems(
        data.map((d) => ({
          id: d.id,
          question: d.question,
          answer: d.answer,
          category: d.category,
          enabled: d.enabled,
          sort_order: d.sort_order,
        })),
      );
      setHasInitialized(true);
    }
  }, [data, hasInitialized]);

  // Stream the visible items into the preview iframe so the public
  // FAQSection re-renders unsaved edits.
  const visibleForPreview = useMemo(
    () =>
      items
        .filter((i) => i.enabled && i.question.trim() && i.answer.trim())
        .map((i, idx) => ({
          id: i.id,
          question: i.question,
          answer: i.answer,
          category: i.category,
          sort_order: idx,
        })),
    [items],
  );
  usePreviewBridge('faq_items', visibleForPreview);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((b) => b.id === active.id);
      const newIndex = items.findIndex((b) => b.id === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question: '',
        answer: '',
        category: null,
        enabled: true,
        sort_order: prev.length,
        _isNew: true,
      },
    ]);
  };

  const handleUpdate = (id: string, updates: Partial<DraftItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (data?.some((d) => d.id === id)) {
      setPendingDeletes((prev) => [...prev, id]);
    }
  };

  const handleSave = useCallback(async () => {
    if (!orgId) {
      toast.error('No organization context');
      return;
    }
    setIsSaving(true);
    try {
      // 1. Validate — drop blank rows silently rather than blocking save.
      const valid = items.filter((i) => i.question.trim() && i.answer.trim());

      // 2. Process deletes
      for (const id of pendingDeletes) {
        await deleteMut.mutateAsync(id);
      }

      // 3. Inserts
      const inserted: { tempId: string; realId: string }[] = [];
      for (let idx = 0; idx < valid.length; idx++) {
        const item = valid[idx];
        if (item._isNew) {
          const created = await createMut.mutateAsync({
            question: item.question,
            answer: item.answer,
            category: item.category,
            enabled: item.enabled,
            sort_order: idx,
          });
          inserted.push({ tempId: item.id, realId: created.id });
        }
      }

      // 4. Updates (existing rows whose values may have changed)
      const serverById = new Map(data?.map((d) => [d.id, d]) ?? []);
      for (let idx = 0; idx < valid.length; idx++) {
        const item = valid[idx];
        if (item._isNew) continue;
        const server = serverById.get(item.id);
        if (!server) continue;
        const dirty =
          server.question !== item.question ||
          server.answer !== item.answer ||
          server.category !== item.category ||
          server.enabled !== item.enabled ||
          server.sort_order !== idx;
        if (dirty) {
          await updateMut.mutateAsync({
            id: item.id,
            question: item.question,
            answer: item.answer,
            category: item.category,
            enabled: item.enabled,
            sort_order: idx,
          });
        }
      }

      // 5. Reset local state — re-init from refetched data
      setHasInitialized(false);
      setPendingDeletes([]);

      toast.success('FAQ items saved');
      clearPreviewOverride('faq_items', orgId);
      triggerPreviewRefresh();
    } catch (e) {
      toast.error('Failed to save FAQ items');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }, [items, pendingDeletes, data, orgId, createMut, updateMut, deleteMut]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorCard
      title="FAQ Questions"
      icon={MessageSquare}
      headerActions={
        <Button
          type="button"
          size={tokens.button.card}
          onClick={handleSave}
          disabled={isSaving}
          className="gap-1.5"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Items
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Manage the question/answer items shown in the FAQ accordion. Drag to reorder.
        Hidden items stay in your library but are not shown to visitors.
      </p>

      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-xl">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No FAQ items yet</p>
          <Button onClick={handleAdd} variant="outline" size={tokens.button.card}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Question
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={idx}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {items.length > 0 && (
        <Button onClick={handleAdd} variant="outline" className="w-full" size={tokens.button.card}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      )}
    </EditorCard>
  );
}
