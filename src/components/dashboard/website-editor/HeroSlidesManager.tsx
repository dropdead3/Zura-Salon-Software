/**
 * HeroSlidesManager — sortable list of hero slides. Empty list = legacy
 * single-hero behavior. Each slide is a self-contained foreground+background
 * unit; the rotator cycles through them.
 */
import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Layers, Settings2 } from 'lucide-react';
import type { HeroConfig, HeroSlide } from '@/hooks/useSectionConfig';
import { MediaUploadInput } from './inputs/MediaUploadInput';
import { ToggleInput } from './inputs/ToggleInput';
import { SliderInput } from './inputs/SliderInput';
import { CharCountInput } from './inputs/CharCountInput';
import { UrlInput } from './inputs/UrlInput';
import { EditorCard } from './EditorCard';
import { HeroTextColorsEditor } from './HeroTextColorsEditor';
import { HeroScrimEditor } from './HeroScrimEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

const newSlide = (): HeroSlide => ({
  id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  background_type: 'inherit',
  background_url: '',
  background_poster_url: '',
  overlay_opacity: null,
  scrim_style: null,
  scrim_strength: null,
  background_focal_x: null,
  background_focal_y: null,
  overlay_mode: null,
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
});

interface SlideRowProps {
  slide: HeroSlide;
  index: number;
  onUpdate: (id: string, patch: Partial<HeroSlide>) => void;
  onDelete: (id: string) => void;
  /** Section-level scrim defaults; surfaced as the "inherit" preview values. */
  sectionScrimStyle?: HeroConfig['scrim_style'];
  sectionScrimStrength?: HeroConfig['scrim_strength'];
}

function SlideRow({ slide, index, onUpdate, onDelete, sectionScrimStyle, sectionScrimStrength }: SlideRowProps) {
  const [open, setOpen] = useState(index === 0);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const mediaKind = slide.background_type === 'video' ? 'video' : slide.background_type === 'image' ? 'image' : '';

  return (
    <div ref={setNodeRef} style={style} className="border border-border/50 rounded-lg bg-background overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 p-3 bg-muted/30">
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 flex-1 text-left">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="text-xs font-medium text-muted-foreground">Slide {index + 1}</span>
              <span className="text-sm truncate">{slide.headline_text || '(untitled)'}</span>
            </button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size={tokens.button.inline}
            onClick={() => onDelete(slide.id)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete slide"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <CollapsibleContent className="p-4 space-y-4 border-t border-border/40">
          {/* Background media */}
          <div className="space-y-2">
            <Label className="text-xs">Slide Background</Label>
            <div className="flex gap-2">
              {(['inherit', 'image', 'video'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => onUpdate(slide.id, { background_type: opt, ...(opt === 'inherit' ? { background_url: '', background_poster_url: '' } : {}) })}
                  className={`flex-1 px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                    slide.background_type === opt
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                  }`}
                >
                  {opt === 'inherit' ? 'Use Section BG' : opt === 'image' ? 'Image' : 'Video'}
                </button>
              ))}
            </div>
            {slide.background_type !== 'inherit' && (
              <MediaUploadInput
                label=""
                value={slide.background_url}
                posterValue={slide.background_poster_url}
                kind={mediaKind}
                imageOnly={slide.background_type === 'image'}
                onChange={({ url, posterUrl, kind }) =>
                  onUpdate(slide.id, {
                    background_url: url,
                    background_poster_url: posterUrl,
                    background_type: kind === 'video' ? 'video' : kind === 'image' ? 'image' : 'inherit',
                  })
                }
                pathPrefix="hero/slides"
              />
            )}
          </div>

          {/* Foreground text */}
          <ToggleInput
            label="Show Eyebrow"
            value={slide.show_eyebrow}
            onChange={(v) => onUpdate(slide.id, { show_eyebrow: v })}
          />
          {slide.show_eyebrow && (
            <CharCountInput
              label="Eyebrow"
              value={slide.eyebrow}
              onChange={(v) => onUpdate(slide.id, { eyebrow: v })}
              maxLength={40}
            />
          )}

          <CharCountInput
            label="Headline"
            value={slide.headline_text}
            onChange={(v) => onUpdate(slide.id, { headline_text: v })}
            maxLength={60}
          />

          <CharCountInput
            label="Subheadline Line 1"
            value={slide.subheadline_line1}
            onChange={(v) => onUpdate(slide.id, { subheadline_line1: v })}
            maxLength={80}
          />
          <CharCountInput
            label="Subheadline Line 2"
            value={slide.subheadline_line2}
            onChange={(v) => onUpdate(slide.id, { subheadline_line2: v })}
            maxLength={80}
          />

          {/* CTAs */}
          <div className="space-y-3 pt-3 border-t border-border/30">
            <CharCountInput
              label="Primary Button"
              value={slide.cta_new_client}
              onChange={(v) => onUpdate(slide.id, { cta_new_client: v })}
              maxLength={30}
            />
            <UrlInput
              label="Primary Button URL"
              value={slide.cta_new_client_url}
              onChange={(v) => onUpdate(slide.id, { cta_new_client_url: v })}
              placeholder="Leave empty to open consultation form"
            />
            <ToggleInput
              label="Show Secondary Button"
              value={slide.show_secondary_button}
              onChange={(v) => onUpdate(slide.id, { show_secondary_button: v })}
            />
            {slide.show_secondary_button && (
              <>
                <CharCountInput
                  label="Secondary Button"
                  value={slide.cta_returning_client}
                  onChange={(v) => onUpdate(slide.id, { cta_returning_client: v })}
                  maxLength={30}
                />
                <UrlInput
                  label="Secondary Button URL"
                  value={slide.cta_returning_client_url}
                  onChange={(v) => onUpdate(slide.id, { cta_returning_client_url: v })}
                  placeholder="/booking"
                />
              </>
            )}
          </div>

          {/* Per-slide overlay override */}
          <div className="space-y-2 pt-3 border-t border-border/30">
            <ToggleInput
              label="Override Overlay Darkness"
              value={slide.overlay_opacity !== null}
              onChange={(v) => onUpdate(slide.id, { overlay_opacity: v ? 0.4 : null })}
              description="Use a different overlay than the section default"
            />
            {slide.overlay_opacity !== null && (
              <SliderInput
                label="Slide Overlay"
                value={slide.overlay_opacity}
                onChange={(v) => onUpdate(slide.id, { overlay_opacity: v })}
                min={0}
                max={0.8}
                step={0.05}
              />
            )}
          </div>

          {/* Per-slide scrim style override — falls back to section-level
              when null. Critical for video slides whose luminance flickers. */}
          <div className="space-y-2 pt-3 border-t border-border/30">
            <HeroScrimEditor
              scrimStyle={slide.scrim_style ?? null}
              scrimStrength={slide.scrim_strength ?? null}
              inheritedStyle={sectionScrimStyle ?? 'gradient-bottom'}
              inheritedStrength={sectionScrimStrength ?? 0.55}
              allowInherit
              onChange={(patch) => onUpdate(slide.id, patch as Partial<HeroSlide>)}
              title="Slide Scrim"
              description="Override the section scrim for this slide. Useful when one video flashes brighter than others."
            />
          </div>

          {/* Per-slide text/button color overrides — empty fields inherit
              from the section-level Text & Buttons panel. */}
          <div className="space-y-2 pt-3 border-t border-border/30">
            <HeroTextColorsEditor
              value={slide.text_colors}
              onChange={(next) => onUpdate(slide.id, { text_colors: next })}
              compact
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface HeroSlidesManagerProps {
  config: HeroConfig;
  onChange: (next: Partial<HeroConfig>) => void;
}

export function HeroSlidesManager({ config, onChange }: HeroSlidesManagerProps) {
  const slides = config.slides ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateSlide = (id: string, patch: Partial<HeroSlide>) => {
    onChange({ slides: slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };
  const deleteSlide = (id: string) => {
    onChange({ slides: slides.filter((s) => s.id !== id) });
  };
  const addSlide = () => onChange({ slides: [...slides, newSlide()] });

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ slides: arrayMove(slides, oldIndex, newIndex) });
  };

  return (
    <EditorCard
      title="Hero Slides"
      icon={Layers}
      description="Add multiple slides to rotate through (Revolution-Slider style)"
    >
      {slides.length === 0 ? (
        <div className="text-center py-6 px-4 border-2 border-dashed border-border/40 rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            No slides yet. Without slides, the hero shows the default content above.
          </p>
          <Button variant="outline" size={tokens.button.card} onClick={addSlide} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add First Slide
          </Button>
        </div>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {slides.map((s, i) => (
                  <SlideRow
                    key={s.id}
                    slide={s}
                    index={i}
                    onUpdate={updateSlide}
                    onDelete={deleteSlide}
                    sectionScrimStyle={config.scrim_style}
                    sectionScrimStrength={config.scrim_strength}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button variant="outline" size={tokens.button.card} onClick={addSlide} className="w-full gap-1.5">
            <Plus className="h-4 w-4" />
            Add Slide
          </Button>
        </>
      )}

      {slides.length > 1 && (
        <div className="space-y-3 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Rotation Settings
          </div>
          <ToggleInput
            label="Auto-Rotate"
            value={config.auto_rotate}
            onChange={(v) => onChange({ auto_rotate: v })}
            description="Cycle through slides automatically"
          />
          {config.auto_rotate && (
            <SliderInput
              label="Slide Duration"
              value={(config.slide_interval_ms ?? 6000) / 1000}
              onChange={(v) => onChange({ slide_interval_ms: Math.round(v * 1000) })}
              min={3}
              max={15}
              step={0.5}
              unit="s"
            />
          )}
          <ToggleInput
            label="Pause on Hover"
            value={config.pause_on_hover}
            onChange={(v) => onChange({ pause_on_hover: v })}
          />
        </div>
      )}
    </EditorCard>
  );
}
