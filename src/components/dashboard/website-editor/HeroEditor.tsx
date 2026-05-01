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
  Repeat,
} from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useHeroConfig, type HeroConfig, type HeroSlide, DEFAULT_HERO } from '@/hooks/useSectionConfig';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { tokens } from '@/lib/design-tokens';

import { HeroTextColorsEditor } from './HeroTextColorsEditor';
import { HeroScrimEditor } from './HeroScrimEditor';
import { EditorCard } from './EditorCard';
import { HeroEditorHubCard } from './hero/HeroEditorHubCard';
import { HeroAdvancedEditor } from './hero/HeroAdvancedEditor';
import { HeroAlignmentEditor } from './hero/HeroAlignmentEditor';
import { HeroRotatorEditor } from './hero/HeroRotatorEditor';
import { HeroRotatingWordsEditor } from './hero/HeroRotatingWordsEditor';
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

type GlobalView = 'colors' | 'scrim' | 'alignment' | 'rotator' | 'advanced';
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
  const words = c.show_rotating_words ? 'words on' : 'words off';
  const notes = c.show_consultation_notes ? 'notes on' : 'notes off';
  return `${align[0].toUpperCase()}${align.slice(1)} aligned · ${scroll} · ${words} · ${notes}`;
}

function summarizeRotator(c: HeroConfig): string {
  const n = c.slides?.length ?? 0;
  if (n < 2) return 'Single slide · rotator inactive';
  if (!c.auto_rotate) return `${n} slides · manual`;
  const seconds = Math.round((c.slide_interval_ms ?? 6000) / 100) / 10;
  return `${n} slides · auto · ${seconds}s`;
}

function summarizeAdvanced(c: HeroConfig): string {
  return `${c.word_rotation_interval}s word rotation · ${c.animation_start_delay}s start delay`;
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
    headline_text: 'New Slide',
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
  onClick,
  onDelete,
}: {
  slide: HeroSlide;
  index: number;
  isFirst: boolean;
  section: HeroConfig;
  onClick: () => void;
  onDelete: () => void;
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
        onClick={onClick}
        onDelete={onDelete}
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

  const globalCards = useMemo(
    () => [
      { id: 'alignment' as const, title: 'Content Alignment', icon: AlignJustify, summary: summarizeAlignment(localConfig) },
      { id: 'colors' as const, title: 'Text & Buttons Color', icon: Palette, summary: summarizeColors(localConfig) },
      { id: 'scrim' as const, title: 'Text-area Scrim', icon: Layers, summary: summarizeScrim(localConfig) },
      { id: 'rotator' as const, title: 'Slides Rotator', icon: Settings2, summary: summarizeRotator(localConfig) },
      { id: 'advanced' as const, title: 'Advanced', icon: Settings2, summary: summarizeAdvanced(localConfig) },
    ],
    [localConfig],
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
            Each slide owns its own background and copy. Layout settings below
            apply to every slide.
          </p>

          {/* SLIDES group */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[11px] tracking-wider text-muted-foreground uppercase">
                Slides
              </h3>
              <span className="text-[11px] text-muted-foreground font-sans">
                {slides.length} slide{slides.length === 1 ? '' : 's'}
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
            ) : (
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
                        onClick={() => setView({ kind: 'slide', id: s.id })}
                        onDelete={() => deleteSlide(s.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {slides.length > 0 && (
              <Button
                variant="outline"
                size={tokens.button.card}
                onClick={addSlide}
                className="w-full gap-1.5 mt-1"
              >
                <Plus className="h-4 w-4" />
                Add Slide
              </Button>
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
            onUpdate={(patch) => updateSlide(view.id, patch)}
          />
        );
      })()}
    </div>
  );
}
