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
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DraftReview>) => void;
  onRemove: (id: string) => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StarRow({
  rating,
  onChange,
  size = 'sm',
}: {
  rating: number;
  onChange?: (n: number) => void;
  size?: 'sm' | 'md';
}) {
  const starClass = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        const Cmp = onChange ? 'button' : 'span';
        return (
          <Cmp
            key={star}
            type={onChange ? 'button' : undefined}
            onClick={onChange ? () => onChange(star) : undefined}
            className={cn(onChange && 'p-0.5 hover:scale-110 transition-transform')}
            aria-label={onChange ? `Set rating to ${star}` : undefined}
          >
            <Star
              className={cn(
                starClass,
                'transition-colors',
                filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
              )}
            />
          </Cmp>
        );
      })}
    </div>
  );
}

function SortableReview({
  item,
  index,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: SortableReviewProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const displayTitle = item.title.trim() || `Review ${index + 1}`;
  const displayAuthor = item.author.trim() || 'Unnamed reviewer';
  const previewBody = item.body.trim();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-2xl border border-border/40 bg-card/60 transition-all overflow-hidden',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        !item.enabled && 'opacity-60',
        expanded && 'border-border/70 bg-card/80 shadow-sm',
      )}
    >
      {/* Summary row (always visible) */}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground transition-colors p-1.5 -ml-1.5 mt-0.5"
          {...attributes}
          {...listeners}
          aria-label="Reorder"
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Avatar bubble */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center mt-0.5">
          <span className="font-sans text-sm text-muted-foreground">
            {initialsOf(item.author)}
          </span>
        </div>

        {/* Identity + snippet — full flexible column */}
        <button
          type="button"
          onClick={() => onToggleExpand(item.id)}
          className="flex-1 min-w-0 text-left py-0.5"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-sans text-sm text-foreground truncate flex-1 min-w-0">
              {displayAuthor}
            </span>
            <StarRow rating={item.rating} />
          </div>
          <p className="font-sans text-xs text-muted-foreground truncate mt-1.5">
            {previewBody ? (
              `"${previewBody}"`
            ) : (
              <em className="text-muted-foreground/60 not-italic">No review text yet</em>
            )}
          </p>
        </button>

        {/* Right-side controls — clearly separated */}
        <div className="flex items-center gap-1 shrink-0 -mr-1">
          <button
            type="button"
            onClick={() => onUpdate(item.id, { enabled: !item.enabled })}
            className={cn(
              'p-2 rounded-lg transition-colors',
              item.enabled
                ? 'text-foreground hover:bg-muted'
                : 'text-muted-foreground/60 hover:bg-muted',
            )}
            aria-label={item.enabled ? 'Hide review' : 'Show review'}
            title={item.enabled ? 'Visible on site' : 'Hidden from site'}
          >
            {item.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </button>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Remove review"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded form — single column for breathing room */}
      {expanded && (
        <div className="px-5 pb-6 pt-2 sm:px-6 space-y-5 border-t border-border/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5">
            <div className="space-y-2">
              <Label className="text-xs font-sans text-muted-foreground">Author</Label>
              <Input
                value={item.author}
                onChange={(e) => onUpdate(item.id, { author: e.target.value })}
                placeholder="Jane D."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-sans text-muted-foreground">Headline</Label>
              <Input
                value={item.title}
                onChange={(e) => onUpdate(item.id, { title: e.target.value })}
                placeholder="Amazing experience!"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-sans text-muted-foreground">Review</Label>
            <Textarea
              value={item.body}
              onChange={(e) => onUpdate(item.id, { body: e.target.value })}
              placeholder="What did they say about your salon?"
              rows={5}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-sans text-muted-foreground">Rating</Label>
            <div className="flex items-center gap-3 pt-1">
              <StarRow
                rating={item.rating}
                onChange={(n) => onUpdate(item.id, { rating: n })}
                size="md"
              />
              <span className="font-sans text-xs text-muted-foreground">
                {item.rating} of 5
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-sans text-muted-foreground">
              Source URL <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              value={item.source_url ?? ''}
              onChange={(e) =>
                onUpdate(item.id, { source_url: e.target.value || null })
              }
              placeholder="https://g.page/..."
            />
            <p className="font-sans text-xs text-muted-foreground/70">
              Link visitors to the original review on Google, Yelp, or Instagram.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 mt-2 border-t border-border/30">
            <div className="flex items-center gap-3">
              <Switch
                checked={item.enabled}
                onCheckedChange={(v) => onUpdate(item.id, { enabled: v })}
                id={`visible-${item.id}`}
              />
              <Label
                htmlFor={`visible-${item.id}`}
                className="text-sm font-sans text-foreground cursor-pointer"
              >
                {item.enabled ? 'Visible on site' : 'Hidden from site'}
              </Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpand(item.id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Collapse
            </Button>
          </div>
        </div>
      )}
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = () => setExpandedIds(new Set(items.map((i) => i.id)));
  const collapseAll = () => setExpandedIds(new Set());

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
    const newId = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id: newId,
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
    setExpandedIds((prev) => new Set(prev).add(newId));
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

      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          Manage customer reviews shown on the{' '}
          {surface === 'extensions' ? 'Extensions page' : 'homepage'}. Drag to
          reorder. Hidden items stay in your library but are not shown to visitors.
        </p>
        {items.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={expandedIds.size === items.length ? collapseAll : expandAll}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              {expandedIds.size === items.length ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 text-xs font-sans text-muted-foreground">
          <span>
            <span className="text-foreground font-medium">{items.filter((i) => i.enabled).length}</span> visible
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="text-foreground font-medium">{items.length}</span> total
          </span>
        </div>
      )}

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
                  expanded={expandedIds.has(item.id)}
                  onToggleExpand={toggleExpand}
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
