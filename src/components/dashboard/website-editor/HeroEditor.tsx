import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RotateCcw,
  ArrowLeft,
  Image as ImageIcon,
  Palette,
  Layers,
  Settings2,
  AlignJustify,
  Plus,
} from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useEditorDiscardAction } from '@/hooks/useEditorDiscardAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useHeroConfig, type HeroConfig, type HeroSlide, DEFAULT_HERO } from '@/hooks/useSectionConfig';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

import { HeroTextColorsEditor } from './HeroTextColorsEditor';
import { HeroScrimEditor } from './HeroScrimEditor';
import { EditorCard } from './EditorCard';
import { HeroEditorHubCard } from './hero/HeroEditorHubCard';
import { HeroAdvancedEditor } from './hero/HeroAdvancedEditor';
import { HeroAlignmentEditor } from './hero/HeroAlignmentEditor';
import { HeroRotatorEditor } from './hero/HeroRotatorEditor';
import { HeroSharedContentEditor } from './hero/HeroSharedContentEditor';

import { HeroSlideListCard } from './hero/HeroSlideListCard';
import { HeroSlideEditor } from './hero/HeroSlideEditor';

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

type GlobalView = 'colors' | 'scrim' | 'alignment' | 'rotator' | 'advanced' | 'shared_content';
type HeroView =
  | { kind: 'hub' }
  | { kind: 'global'; id: GlobalView }
  | { kind: 'slide'; id: string };

const GLOBAL_LABELS: Record<GlobalView, string> = {
  colors: 'Text & Buttons Color',
  scrim: 'Text-area Scrim',
  alignment: 'Content Alignment',
  rotator: 'Slides Rotator',
  advanced: 'Advanced',
  shared_content: 'Shared Hero Content',
};

function viewStorageKey(orgId: string | undefined | null): string {
  return `zura.heroEditor.view.v2.${orgId ?? 'anon'}`;
}

function readPersistedView(orgId: string | undefined | null): HeroView {
  if (typeof window === 'undefined') return { kind: 'hub' };
  try {
    const raw = window.localStorage.getItem(viewStorageKey(orgId));
    if (raw) return JSON.parse(raw) as HeroView;
  } catch {
    /* ignore */
  }
  return { kind: 'hub' };
}

function writePersistedView(orgId: string | undefined | null, view: HeroView): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(viewStorageKey(orgId), JSON.stringify(view));
  } catch {
    /* ignore */
  }
}

/* ─── Status summary helpers ─── */

function summarizeColors(c: HeroConfig): string {
  const t = c.text_colors ?? {};
  const overrides = Object.values(t).filter(Boolean).length;
  return overrides === 0 ? 'Auto-contrast' : `${overrides} color${overrides === 1 ? '' : 's'} customized`;
}

function summarizeScrim(c: HeroConfig): string {
  const style = c.scrim_style ?? 'gradient-bottom';
  const strength = Math.round((c.scrim_strength ?? 0.55) * 100);
  return `${style.replace(/-/g, ' ')} · ${strength}%`;
}

function summarizeAlignment(c: HeroConfig): string {
  const align = c.content_alignment ?? 'center';
  const scroll = c.show_scroll_indicator ? 'scroll cue on' : 'scroll cue off';
  const notes = c.show_consultation_notes ? 'notes on' : 'notes off';
  return `${align[0].toUpperCase()}${align.slice(1)} aligned · ${scroll} · ${notes}`;
}

function summarizeRotator(c: HeroConfig): string {
  const n = c.slides?.length ?? 0;
  if (n < 2) return 'Single slide · rotator inactive';
  if (!c.auto_rotate) return `${n} slides · manual`;
  const seconds = Math.round((c.slide_interval_ms ?? 6000) / 100) / 10;
  return `${n} slides · auto · ${seconds}s`;
}


function summarizeAdvanced(c: HeroConfig): string {
  return `${c.animation_start_delay}s start delay`;
}

/* ─── Migration: synthesize Slide 1 from legacy section-level fields ─── */

function newSlideId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateLegacyToFirstSlide(c: HeroConfig): HeroConfig {
  if ((c.slides?.length ?? 0) > 0) return c;
  const hasLegacyContent =
    !!c.background_url || !!c.headline_text || !!c.cta_new_client;
  if (!hasLegacyContent) {
    // No content at all — seed an empty starter slide so the operator has
    // something to click into.
    return {
      ...c,
      slides: [makeEmptySlide()],
    };
  }
  const slide: HeroSlide = {
    id: newSlideId(),
    background_type: c.background_type === 'none' ? 'inherit' : c.background_type,
    background_url: c.background_url,
    background_poster_url: c.background_poster_url,
    overlay_opacity: null,
    scrim_style: null,
    scrim_strength: null,
    background_focal_x: null,
    background_focal_y: null,
    overlay_mode: null,
    background_fit: null,
    eyebrow: c.eyebrow,
    show_eyebrow: c.show_eyebrow,
    headline_text: c.headline_text,
    subheadline_line1: c.subheadline_line1,
    subheadline_line2: c.subheadline_line2,
    cta_new_client: c.cta_new_client,
    cta_new_client_url: c.cta_new_client_url,
    cta_returning_client: c.cta_returning_client,
    cta_returning_client_url: c.cta_returning_client_url,
    show_secondary_button: c.show_secondary_button,
    text_colors: undefined,
    media_width: c.media_width ?? null,
    media_height: c.media_height ?? null,
    media_size_bytes: c.media_size_bytes ?? null,
    media_format: c.media_format ?? null,
    media_optimized_with_profile: c.media_optimized_with_profile ?? null,
    content_alignment: null,
  };
  return { ...c, slides: [slide] };
}

function makeEmptySlide(): HeroSlide {
  return {
    id: newSlideId(),
    background_type: 'inherit',
    background_url: '',
    background_poster_url: '',
    overlay_opacity: null,
    scrim_style: null,
    scrim_strength: null,
    background_focal_x: null,
    background_focal_y: null,
    overlay_mode: null,
    background_fit: null,
    eyebrow: '',
    show_eyebrow: false,
    headline_text: '',
    subheadline_line1: '',
    subheadline_line2: '',
    cta_new_client: 'Get Started',
    cta_new_client_url: '',
    cta_returning_client: 'Learn More',
    cta_returning_client_url: '/booking',
    show_secondary_button: true,
    media_width: null,
    media_height: null,
    media_size_bytes: null,
    media_format: null,
    media_optimized_with_profile: null,
    content_alignment: null,
  };
}

/* ─── Sortable wrapper for the slide list ─── */

function SortableSlideRow({
  slide,
  index,
  isFirst,
  section,
  rotatorMode,
  variant = 'row',
  onClick,
  onDelete,
  onToggleActive,
}: {
  slide: HeroSlide;
  index: number;
  isFirst: boolean;
  section: HeroConfig;
  rotatorMode: 'multi_slide' | 'background_only';
  variant?: 'row' | 'tile';
  onClick: () => void;
  onDelete: () => void;
  onToggleActive: (next: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <HeroSlideListCard
        slide={slide}
        index={index}
        isFirst={isFirst}
        sectionBgUrl={section.background_url}
        sectionBgPoster={section.background_poster_url}
        sectionBgType={section.background_type}
        rotatorMode={rotatorMode}
        variant={variant}
        onClick={onClick}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function HeroEditor() {
  const __saveTelemetry = useSaveTelemetry('hero-editor');
  const { data, isLoading, update } = useHeroConfig();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;

  const [localConfig, setLocalConfig] = useState<HeroConfig>(DEFAULT_HERO);
  const [view, setView] = useState<HeroView>(() => readPersistedView(orgId));
  const migratedRef = useRef(false);

  // Canonical dirty-state hook (key-order-stable structural compare).
  useDirtyState(localConfig, data, 'hero');

  // Live-edit bridge: stream in-memory edits into the preview iframe.
  usePreviewBridge('section_hero', localConfig);

  useEffect(() => {
    if (data && !isLoading) {
      // One-time migration on first load: synthesize a Slide 1 from legacy
      // section-level fields if no slides exist. Idempotent — only runs once
      // per editor mount.
      if (!migratedRef.current) {
        setLocalConfig(migrateLegacyToFirstSlide(data));
        migratedRef.current = true;
      } else {
        setLocalConfig(data);
      }
    }
  }, [data, isLoading]);

  // Re-read persisted view when org context changes (per-tenant view memory).
  useEffect(() => {
    setView(readPersistedView(orgId));
    migratedRef.current = false;
  }, [orgId]);

  useEffect(() => {
    writePersistedView(orgId, view);
  }, [orgId, view]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Hero section saved');
      clearPreviewOverride('section_hero', orgId);
      __saveTelemetry.event('save-success');
      triggerPreviewRefresh();
      __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, orgId]);

  useEditorSaveAction(handleSave);

  // Discard: revert local edits back to last-saved server config.
  useEditorDiscardAction(useCallback(() => {
    if (data) {
      setLocalConfig(data);
      clearPreviewOverride('section_hero', orgId);
    }
  }, [data, orgId]));

  const updateField = useCallback(
    <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => {
      setLocalConfig((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateSlide = useCallback((id: string, patch: Partial<HeroSlide>) => {
    setLocalConfig((prev) => ({
      ...prev,
      slides: (prev.slides ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const deleteSlide = useCallback((id: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      slides: (prev.slides ?? []).filter((s) => s.id !== id),
    }));
  }, []);

  const addSlide = useCallback(() => {
    const slide = makeEmptySlide();
    setLocalConfig((prev) => ({ ...prev, slides: [...(prev.slides ?? []), slide] }));
    setView({ kind: 'slide', id: slide.id });
  }, []);

  /**
   * Background-Only mode: append a slide that's pre-configured as a rotating
   * background contributor. Pre-sets `background_type: 'image'` so the new
   * tile lands ready to upload, and stays on the hub view (no jump into the
   * full slide editor — copy fields aren't relevant in this mode anyway).
   */
  const addBackgroundSlide = useCallback(() => {
    const slide: HeroSlide = { ...makeEmptySlide(), background_type: 'image' };
    setLocalConfig((prev) => ({ ...prev, slides: [...(prev.slides ?? []), slide] }));
    // Open the slide editor so the user can immediately upload media.
    setView({ kind: 'slide', id: slide.id });
  }, []);

  const handleReset = () => {
    setLocalConfig(DEFAULT_HERO);
    toast.info('Reset to defaults — save to apply');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLocalConfig((prev) => {
      const slides = prev.slides ?? [];
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, slides: arrayMove(slides, oldIndex, newIndex) };
    });
  };

  const rotatorMode = localConfig.rotator_mode ?? 'multi_slide';
  const sharedContentSummary = (() => {
    const h = (localConfig.headline_text ?? '').trim();
    return h ? `“${h.length > 32 ? h.slice(0, 30) + '…' : h}”` : 'No shared headline yet';
  })();

  const globalCards = useMemo(
    () => {
      const cards: Array<{ id: GlobalView; title: string; icon: typeof AlignJustify; summary: string }> = [];
      if (rotatorMode === 'background_only') {
        cards.push({ id: 'shared_content', title: 'Shared Hero Content', icon: ImageIcon, summary: sharedContentSummary });
      }
      cards.push(
        { id: 'alignment', title: 'Content Alignment', icon: AlignJustify, summary: summarizeAlignment(localConfig) },
        { id: 'colors', title: 'Text & Buttons Color', icon: Palette, summary: summarizeColors(localConfig) },
        { id: 'scrim', title: 'Text-area Scrim', icon: Layers, summary: summarizeScrim(localConfig) },
        { id: 'rotator', title: 'Slides Rotator', icon: Settings2, summary: summarizeRotator(localConfig) },
        { id: 'advanced', title: 'Advanced', icon: Settings2, summary: summarizeAdvanced(localConfig) },
      );
      return cards;
    },
    [localConfig, rotatorMode, sharedContentSummary],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const slides = localConfig.slides ?? [];

  /* ─── Hub view: two grouped sections (Slides + Global Settings) ─── */
  if (view.kind === 'hub') {
    return (
      <div className="space-y-6">
        <EditorCard title="Hero Section" icon={ImageIcon}>
          <p className="text-sm text-muted-foreground -mt-1">
            {rotatorMode === 'background_only'
              ? 'Each slide owns its own background. Headline, subheadline & buttons are shared across all slides.'
              : 'Each slide owns its own background and copy. Layout settings below apply to every slide.'}
          </p>

          {/* Rotator mode picker — segmented control style, compact and visual. */}
          <div className="space-y-2 pt-2">
            <h3 className="font-display text-[11px] tracking-wider text-muted-foreground uppercase">
              Rotator Mode
            </h3>
            <div className="flex p-1 gap-1 rounded-full border border-border/60 bg-muted/30">
              {([
                {
                  id: 'multi_slide' as const,
                  label: 'Multi-Slide',
                  hint: 'Per-slide copy',
                  icon: Layers,
                },
                {
                  id: 'background_only' as const,
                  label: 'Background-Only',
                  hint: 'Shared copy',
                  icon: ImageIcon,
                },
              ]).map(({ id, label, hint, icon: Icon }) => {
                const active = rotatorMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateField('rotator_mode', id)}
                    title={hint}
                    aria-pressed={active}
                    className={cn(
                      'flex-1 inline-flex items-center justify-center gap-2 px-3 h-9 rounded-full text-[12px] font-sans font-medium transition-all',
                      active
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground pl-1">
              {rotatorMode === 'background_only'
                ? 'One shared headline & buttons. Only backgrounds rotate.'
                : 'Each slide has its own headline, copy & buttons.'}
            </p>
          </div>

          {/* SLIDES group — render shape diverges by rotator mode:
              - Multi-Slide: vertical list of full slide rows.
              - Background-Only: master row (slide 1) on top, then a square
                gallery of background tiles for slides[1..]. The gallery
                mirrors the data model — one slide owns the copy, the rest
                contribute rotating backgrounds. */}
          <div className="space-y-2 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[11px] tracking-wider text-muted-foreground uppercase">
                {rotatorMode === 'background_only' ? 'Master Slide' : 'Slides'}
              </h3>
              <span className="text-[11px] text-muted-foreground font-sans">
                {rotatorMode === 'background_only'
                  ? `${Math.max(slides.length - 1, 0)} background${slides.length - 1 === 1 ? '' : 's'}`
                  : `${slides.length} slide${slides.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {slides.length === 0 ? (
              <div className="text-center py-6 px-4 border-2 border-dashed border-border/40 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  No slides yet. Add one to start editing.
                </p>
                <Button variant="outline" size={tokens.button.card} onClick={addSlide} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add First Slide
                </Button>
              </div>
            ) : rotatorMode === 'background_only' ? (
              <>
                {/* Master slide row — full editor access, not draggable.
                    Rendered outside any DndContext so the drag handle is
                    suppressed by `variant`'s isMaster branch in HeroSlideListCard. */}
                <SortableSlideRow
                  slide={slides[0]}
                  index={0}
                  isFirst
                  section={localConfig}
                  rotatorMode={rotatorMode}
                  variant="row"
                  onClick={() => setView({ kind: 'slide', id: slides[0].id })}
                  onDelete={() => deleteSlide(slides[0].id)}
                  onToggleActive={(next) => updateSlide(slides[0].id, { active: next })}
                />

                {/* Background gallery */}
                <div className="pt-3">
                  <div className="flex items-center justify-between pb-2">
                    <h4 className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                      Rotating Backgrounds
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-sans">
                      Click a tile to upload or edit
                    </span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={slides.slice(1).map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {slides.slice(1).map((s, i) => (
                          <SortableSlideRow
                            key={s.id}
                            slide={s}
                            index={i + 1}
                            isFirst={false}
                            section={localConfig}
                            rotatorMode={rotatorMode}
                            variant="tile"
                            onClick={() => setView({ kind: 'slide', id: s.id })}
                            onDelete={() => deleteSlide(s.id)}
                            onToggleActive={(next) => updateSlide(s.id, { active: next })}
                          />
                        ))}
                        {/* "Add Background" tile — completes the grid as a peer */}
                        <button
                          type="button"
                          onClick={addBackgroundSlide}
                          className="aspect-square rounded-xl border-2 border-dashed border-border/60 hover:border-foreground/40 bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Add rotating background"
                        >
                          <Plus className="h-5 w-5" />
                          <span className="text-[10px] font-display tracking-wider uppercase">Add</span>
                        </button>
                      </div>
                    </SortableContext>
                  </DndContext>
                  {slides.length === 1 && (
                    <p className="text-[11px] text-muted-foreground mt-2 pl-1">
                      Add a second background to start the rotator. The headline above stays the same on every rotation.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {slides.map((s, i) => (
                        <SortableSlideRow
                          key={s.id}
                          slide={s}
                          index={i}
                          isFirst={i === 0}
                          section={localConfig}
                          rotatorMode={rotatorMode}
                          onClick={() => setView({ kind: 'slide', id: s.id })}
                          onDelete={() => deleteSlide(s.id)}
                          onToggleActive={(next) => updateSlide(s.id, { active: next })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  onClick={addSlide}
                  className="w-full gap-1.5 mt-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Slide
                </Button>
              </>
            )}
          </div>

          {/* GLOBAL SETTINGS group */}
          <div className="space-y-2 pt-4 border-t border-border/40">
            <h3 className="font-display text-[11px] tracking-wider text-muted-foreground uppercase">
              Global Hero Settings
            </h3>
            <div className="flex flex-col gap-3">
              {globalCards.map((card) => (
                <HeroEditorHubCard
                  key={card.id}
                  title={card.title}
                  icon={card.icon}
                  summary={card.summary}
                  onClick={() => setView({ kind: 'global', id: card.id })}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset hero to defaults
            </Button>
          </div>
        </EditorCard>
      </div>
    );
  }

  /* ─── Sub-view (slide or global setting) ─── */
  const breadcrumbLabel =
    view.kind === 'global'
      ? GLOBAL_LABELS[view.id]
      : (() => {
          const idx = slides.findIndex((s) => s.id === view.id);
          return idx >= 0 ? `Slide ${idx + 1}` : 'Slide';
        })();

  return (
    <div className="space-y-4">
      {/* Breadcrumb back-bar */}
      <button
        type="button"
        onClick={() => setView({ kind: 'hub' })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="font-sans">
          Hero
          <span className="mx-1.5 text-border">/</span>
          <span className="text-foreground">{breadcrumbLabel}</span>
        </span>
      </button>

      {view.kind === 'global' && view.id === 'colors' && (
        <EditorCard title="Text & Buttons Color" icon={Palette}>
          <p className="text-xs text-muted-foreground -mt-1">
            Pick exact colors for the headline, subheadline, and CTA buttons. Leave any
            field empty to auto-contrast against your background.
          </p>
          <HeroTextColorsEditor
            value={localConfig.text_colors}
            onChange={(next) => updateField('text_colors', next)}
          />
        </EditorCard>
      )}

      {view.kind === 'global' && view.id === 'scrim' && (
        <EditorCard title="Text-area Scrim" icon={Layers}>
          <p className="text-xs text-muted-foreground -mt-1">
            Editorial gradient/vignette layered on top of the Image Wash. Strongest
            where headline text lives — transparent everywhere else.
          </p>
          <HeroScrimEditor
            scrimStyle={localConfig.scrim_style ?? 'gradient-bottom'}
            scrimStrength={localConfig.scrim_strength ?? 0.55}
            bgType={localConfig.background_type}
            onChange={(patch) => {
              if (patch.scrim_style !== undefined) updateField('scrim_style', patch.scrim_style ?? undefined);
              if (patch.scrim_strength !== undefined) updateField('scrim_strength', patch.scrim_strength ?? undefined);
            }}
          />
        </EditorCard>
      )}

      {view.kind === 'global' && view.id === 'alignment' && (
        <HeroAlignmentEditor config={localConfig} onChange={updateField} />
      )}

      {view.kind === 'global' && view.id === 'rotator' && (
        <HeroRotatorEditor config={localConfig} onChange={updateField} />
      )}

      {view.kind === 'global' && view.id === 'shared_content' && (
        <HeroSharedContentEditor config={localConfig} onChange={updateField} />
      )}

      {view.kind === 'global' && view.id === 'advanced' && (
        <HeroAdvancedEditor config={localConfig} onChange={updateField} />
      )}

      {view.kind === 'slide' && (() => {
        const idx = slides.findIndex((s) => s.id === view.id);
        if (idx < 0) {
          // Slide was deleted while open — bounce back to hub.
          return (
            <div className="text-sm text-muted-foreground p-4 text-center">
              This slide no longer exists. <button className="underline" onClick={() => setView({ kind: 'hub' })}>Return to hub</button>.
            </div>
          );
        }
        return (
          <HeroSlideEditor
            slide={slides[idx]}
            index={idx}
            section={localConfig}
            rotatorMode={rotatorMode}
            onUpdate={(patch) => updateSlide(view.id, patch)}
            onUpdateSection={updateField}
          />
        );
      })()}
    </div>
  );
}
