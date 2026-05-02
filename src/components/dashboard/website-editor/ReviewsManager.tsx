/**
 * Reviews Manager — shared drag-orderable list of testimonial rows backed by
 * the website_testimonials table. One component, two surfaces ('general' and
 * 'extensions') selected via the `surface` prop or surface tabs.
 *
 * Edit model mirrors FAQItemsManager:
 *   - Loads the org's items for the active surface into a local working array.
 *   - All edits stay in local state and stream into the preview iframe via
 *     usePreviewBridge under a synthetic section key
 *     (`testimonial_items:general` / `testimonial_items:extensions`).
 *   - "Save items" diffs local vs server and runs insert/update/delete +
 *     inline reorder. clearPreviewOverride lets the iframe fall back to DB.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Star,
  Save,
  Quote,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  useTestimonials,
  useCreateTestimonial,
  useUpdateTestimonial,
  useDeleteTestimonial,
  type Testimonial,
  type TestimonialSurface,
} from '@/hooks/useTestimonials';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
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

interface DraftReview {
  id: string;
  title: string;
  author: string;
  body: string;
  rating: number;
  source_url: string | null;
  enabled: boolean;
  sort_order: number;
  _isNew?: boolean;
}

const previewKeyFor = (surface: TestimonialSurface) =>
  `testimonial_items:${surface}`;

interface SortableReviewProps {
  item: DraftReview;
  index: number;
  onUpdate: (id: string, updates: Partial<DraftReview>) => void;
  onRemove: (id: string) => void;
}

function SortableReview({ item, index, onUpdate, onRemove }: SortableReviewProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
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
          <Label className="text-xs text-muted-foreground">Review {index + 1}</Label>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={item.title}
              onChange={(e) => onUpdate(item.id, { title: e.target.value })}
              placeholder="Amazing experience!"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Author</Label>
            <Input
              value={item.author}
              onChange={(e) => onUpdate(item.id, { author: e.target.value })}
              placeholder="Jane D."
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Review Text</Label>
          <Textarea
            value={item.body}
            onChange={(e) => onUpdate(item.id, { body: e.target.value })}
            placeholder="What did they say?"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rating</Label>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onUpdate(item.id, { rating: star })}
                  className="p-0.5"
                  aria-label={`Set rating to ${star}`}
                >
                  <Star
                    className={cn(
                      'w-4 h-4 transition-colors',
                      star <= item.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Source URL (optional)</Label>
            <Input
              value={item.source_url ?? ''}
              onChange={(e) =>
                onUpdate(item.id, { source_url: e.target.value || null })
              }
              placeholder="https://g.page/..."
              className="h-9"
            />
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
        aria-label="Remove review"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ReviewsManagerProps {
  /**
   * If provided, the manager is locked to a single surface and the surface
   * tabs are hidden. If omitted, the manager renders both surfaces with a
   * tab switcher (used in the standalone admin page).
   */
  surface?: TestimonialSurface;
  title?: string;
}

export function ReviewsManager({ surface: lockedSurface, title }: ReviewsManagerProps) {
  const __saveTelemetry = useSaveTelemetry('reviews-manager');
  const [activeSurface, setActiveSurface] = useState<TestimonialSurface>(
    lockedSurface ?? 'general',
  );
  const surface = lockedSurface ?? activeSurface;

  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;

  const { data, isLoading } = useTestimonials(surface);
  const createMut = useCreateTestimonial();
  const updateMut = useUpdateTestimonial();
  const deleteMut = useDeleteTestimonial();

  const [items, setItems] = useState<DraftReview[]>([]);
  const [initializedSurface, setInitializedSurface] =
    useState<TestimonialSurface | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  // Re-initialize local state whenever the surface changes or fresh data arrives.
  useEffect(() => {
    if (data && initializedSurface !== surface) {
      setItems(
        data.map((d) => ({
          id: d.id,
          title: d.title,
          author: d.author,
          body: d.body,
          rating: d.rating,
          source_url: d.source_url,
          enabled: d.enabled,
          sort_order: d.sort_order,
        })),
      );
      setPendingDeletes([]);
      setInitializedSurface(surface);
    }
  }, [data, surface, initializedSurface]);

  const visibleForPreview = useMemo(
    () =>
      items
        .filter((i) => i.enabled && i.title.trim() && i.body.trim())
        .map((i, idx) => ({
          id: i.id,
          title: i.title,
          author: i.author,
          body: i.body,
          rating: i.rating,
          source_url: i.source_url,
          sort_order: idx,
        })),
    [items],
  );
  usePreviewBridge(previewKeyFor(surface), visibleForPreview);

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
        title: '',
        author: '',
        body: '',
        rating: 5,
        source_url: null,
        enabled: true,
        sort_order: prev.length,
        _isNew: true,
      },
    ]);
  };

  const handleUpdate = (id: string, updates: Partial<DraftReview>) => {
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
      const valid = items.filter((i) => i.title.trim() && i.body.trim());

      for (const id of pendingDeletes) {
        await deleteMut.mutateAsync(id);
      }

      for (let idx = 0; idx < valid.length; idx++) {
        const item = valid[idx];
        if (item._isNew) {
          await createMut.mutateAsync({
            surface,
            title: item.title,
            author: item.author,
            body: item.body,
            rating: item.rating,
            source_url: item.source_url,
            enabled: item.enabled,
            sort_order: idx,
          });
        }
      }

      const serverById = new Map(data?.map((d) => [d.id, d]) ?? []);
      for (let idx = 0; idx < valid.length; idx++) {
        const item = valid[idx];
        if (item._isNew) continue;
        const server = serverById.get(item.id);
        if (!server) continue;
        const dirty =
          server.title !== item.title ||
          server.author !== item.author ||
          server.body !== item.body ||
          server.rating !== item.rating ||
          server.source_url !== item.source_url ||
          server.enabled !== item.enabled ||
          server.sort_order !== idx;
        if (dirty) {
          await updateMut.mutateAsync({
            id: item.id,
            title: item.title,
            author: item.author,
            body: item.body,
            rating: item.rating,
            source_url: item.source_url,
            enabled: item.enabled,
            sort_order: idx,
          });
        }
      }

      // Force re-init from refetched data
      setInitializedSurface(null);
      setPendingDeletes([]);

      toast.success('Reviews saved');
      clearPreviewOverride(previewKeyFor(surface), orgId);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch (e) {
      toast.error('Failed to save reviews');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }, [items, pendingDeletes, data, orgId, surface, createMut, updateMut, deleteMut]);

  return (
    <EditorCard
      title={title ?? (lockedSurface === 'extensions' ? 'Extension Reviews' : 'Testimonials')}
      icon={Quote}
      headerActions={
        <Button
          type="button"
          size={tokens.button.card}
          onClick={handleSave}
          disabled={isSaving}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Reviews
        </Button>
      }
    >
      {!lockedSurface && (
        <Tabs
          value={activeSurface}
          onValueChange={(v) => setActiveSurface(v as TestimonialSurface)}
        >
          <TabsList>
            <TabsTrigger value="general">Homepage</TabsTrigger>
            <TabsTrigger value="extensions">Extensions Page</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <p className="text-sm text-muted-foreground">
        Manage customer reviews shown on the{' '}
        {surface === 'extensions' ? 'Extensions page' : 'homepage'}. Drag to
        reorder. Hidden items stay in your library but are not shown to visitors.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-xl">
          <Quote className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No reviews yet</p>
          <Button onClick={handleAdd} variant="outline" size={tokens.button.card}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Review
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <SortableReview
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
          Add Review
        </Button>
      )}
    </EditorCard>
  );
}
