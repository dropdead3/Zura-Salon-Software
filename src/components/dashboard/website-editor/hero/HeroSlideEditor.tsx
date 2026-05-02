import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Sparkles, Sun, Moon, ChevronDown, ChevronRight as ChevronRightIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import type { HeroConfig, HeroSlide } from '@/hooks/useSectionConfig';
import { EditorCard } from '../EditorCard';
import { MediaUploadInput } from '../inputs/MediaUploadInput';
import { ToggleInput } from '../inputs/ToggleInput';
import { SliderInput } from '../inputs/SliderInput';
import { CharCountInput } from '../inputs/CharCountInput';
import { UrlInput } from '../inputs/UrlInput';
import { DynamicArrayInput } from '../inputs/DynamicArrayInput';

import { HeroTextColorsEditor } from '../HeroTextColorsEditor';
import { HeroScrimEditor } from '../HeroScrimEditor';
import { BackgroundResolvedPreview } from '../BackgroundResolvedPreview';
import { useFocalPointSuggestion } from '@/hooks/useFocalPointSuggestion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  SLIDE_BG_TYPE_OPTIONS,
  SLIDE_BG_TYPE_LABELS,
  SLIDE_BG_TYPE_TOOLTIPS,
} from './slideBackgroundOptions';

interface HeroSlideEditorProps {
  slide: HeroSlide;
  index: number;
  /** Section-level config — used to resolve "inherit" + show defaults. */
  section: HeroConfig;
  /** Whether the rotator runs in multi-slide or background-only mode. */
  rotatorMode?: 'multi_slide' | 'background_only';
  onUpdate: (patch: Partial<HeroSlide>) => void;
  /** Section-level updater for global fields surfaced inline (e.g. rotating words). */
  onUpdateSection: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
  /**
   * Optional file to immediately upload into this slide's background slot
   * on mount. Set when the user picked a file via the +Add background tile
   * — the editor opens with the upload already in flight.
   */
  pendingInitialFile?: File | null;
  /** Called after `pendingInitialFile` has been consumed by MediaUploadInput. */
  onPendingInitialFileConsumed?: () => void;
}

/**
 * Focused per-slide editor. Surfaces only what legitimately varies per
 * slide: background media, copy, CTAs. Layout-level concerns (alignment,
 * scrim, colors, animation) are edited globally via the hub.
 *
 * Per-slide overrides for those global settings are tucked under a
 * collapsed "Advanced overrides" section — present for power users but
 * never the first thing operators see.
 *
 * In `background_only` rotator mode the per-slide Copy and Buttons cards
 * are hidden — those fields are edited once at the section level via the
 * Shared Hero Content card on the hub.
 */
export function HeroSlideEditor({ slide, index, section, rotatorMode = 'multi_slide', onUpdate, onUpdateSection, pendingInitialFile = null, onPendingInitialFileConsumed }: HeroSlideEditorProps) {
  const [overridesOpen, setOverridesOpen] = useState(false);
  const backgroundOnly = rotatorMode === 'background_only';

  const mediaKind = slide.background_type === 'video' ? 'video' : slide.background_type === 'image' ? 'image' : '';

  // Resolve effective background for the slide (per-slide media or inherited).
  const resolvedBgType = slide.background_type === 'inherit' ? section.background_type : slide.background_type;
  const resolvedBgUrl = slide.background_type === 'inherit' ? section.background_url : slide.background_url;
  const resolvedBgPoster = slide.background_type === 'inherit' ? section.background_poster_url : slide.background_poster_url;
  const fitOverridden = slide.background_fit != null;
  const sectionFit = section.background_fit;
  const resolvedFit: 'cover' | 'contain' = fitOverridden ? (slide.background_fit as 'cover' | 'contain') : sectionFit;
  const focalOverridden = slide.background_focal_x != null && slide.background_focal_y != null;
  const sectionFocalX = section.background_focal_x ?? 50;
  const sectionFocalY = section.background_focal_y ?? 50;
  const resolvedFocalX = focalOverridden ? (slide.background_focal_x as number) : sectionFocalX;
  const resolvedFocalY = focalOverridden ? (slide.background_focal_y as number) : sectionFocalY;
  const sectionOverlayMode: 'darken' | 'lighten' = section.overlay_mode ?? 'darken';
  const sectionOverlayOpacity = section.overlay_opacity ?? 0.4;
  const resolvedOverlayMode: 'darken' | 'lighten' = slide.overlay_mode ?? sectionOverlayMode;
  const resolvedOverlayOpacity = slide.overlay_opacity ?? sectionOverlayOpacity;
  const { style: resolvedScrimStyle, strength: resolvedScrimStrength } = resolveScrim({
    slideStyle: slide.scrim_style,
    slideStrength: slide.scrim_strength,
    sectionStyle: section.scrim_style,
    sectionStrength: section.scrim_strength,
  });
  const focalImageUrl = resolvedBgType === 'video' ? resolvedBgPoster : resolvedBgUrl;

  const { suggest: suggestFocal, pending: focalPending } = useFocalPointSuggestion(({ x, y }) => {
    onUpdate({ background_focal_x: x, background_focal_y: y });
  });

  return (
    <div className="space-y-4">
      {/* Inert-field banner — non-master slides in background_only mode have
          no live copy fields. The Copy/Buttons cards are gated below, but a
          deep-link (?slide=N) lands the user here with no explanation; this
          banner closes that loop and points them at the right surface. */}
      {backgroundOnly && index > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[12px] text-foreground/90 font-sans flex items-start gap-3">
          <div className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 inline-flex items-center justify-center flex-shrink-0 font-display text-[10px] tracking-wider">
            i
          </div>
          <div className="space-y-0.5">
            <div className="font-medium">Background-Only mode · this slide contributes its background only</div>
            <div className="text-muted-foreground text-[11px] leading-relaxed">
              Headline, subheadline & buttons are shared across every slide and edited under{' '}
              <span className="text-foreground">Shared Hero Content</span> on the hub. Switch the
              rotator to <span className="text-foreground">Multi-Slide</span> if you want this
              slide to carry its own copy.
            </div>
          </div>
        </div>
      )}
      {/* Background media */}
      <EditorCard title={`Slide ${index + 1} · Background`} icon={ImageIcon}>
        <p className="text-xs text-muted-foreground -mt-1">
          The image or video shown behind this slide. Leave on "None"
          to inherit the hero's default background.
        </p>

        <div className="space-y-2">
          <Label className="text-xs">Slide Background</Label>
          <div className="flex gap-2">
            {SLIDE_BG_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                title={SLIDE_BG_TYPE_TOOLTIPS[opt]}
                onClick={() =>
                  onUpdate({
                    background_type: opt,
                    ...(opt === 'inherit' ? { background_url: '', background_poster_url: '' } : {}),
                  })
                }
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-full text-[11px] border transition-colors',
                  slide.background_type === opt
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
                )}
              >
                {SLIDE_BG_TYPE_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>

        {slide.background_type !== 'inherit' && (
          <>
            <MediaUploadInput
              label=""
              value={slide.background_url}
              posterValue={slide.background_poster_url}
              kind={mediaKind}
              imageOnly={slide.background_type === 'image'}
              qualityProfile="hero"
              meta={
                slide.media_width
                  ? {
                      width: slide.media_width,
                      height: slide.media_height,
                      sizeBytes: slide.media_size_bytes,
                      format: slide.media_format,
                      optimizedWithProfile: slide.media_optimized_with_profile,
                    }
                  : null
              }
              focal={
                focalImageUrl
                  ? {
                      x: resolvedFocalX,
                      y: resolvedFocalY,
                      onChange: (nx, ny) => onUpdate({ background_focal_x: nx, background_focal_y: ny }),
                      onReset: () => onUpdate({ background_focal_x: 50, background_focal_y: 50 }),
                      enabled: focalOverridden && resolvedFit !== 'contain',
                    }
                  : undefined
              }
              onChange={({ url, posterUrl, kind, meta, analysisDataUrl }) => {
                const wasNewImage = kind === 'image' && url && url !== slide.background_url;
                onUpdate({
                  background_url: url,
                  background_poster_url: posterUrl,
                  background_type: kind === 'video' ? 'video' : kind === 'image' ? 'image' : 'inherit',
                  media_width: meta?.width ?? (url ? slide.media_width ?? null : null),
                  media_height: meta?.height ?? (url ? slide.media_height ?? null : null),
                  media_size_bytes: meta?.sizeBytes ?? (url ? slide.media_size_bytes ?? null : null),
                  media_format: meta?.format ?? (url ? slide.media_format ?? null : null),
                  media_optimized_with_profile:
                    meta?.optimizedWithProfile ?? (url ? slide.media_optimized_with_profile ?? null : null),
                });
                if (wasNewImage) suggestFocal(url, { analysisDataUrl });
              }}
              pathPrefix="hero/slides"
              pendingInitialFile={pendingInitialFile}
              onPendingInitialFileConsumed={onPendingInitialFileConsumed}
            />
            {focalPending && (
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Analyzing image to set focal point…
              </p>
            )}

            {/* Per-slide fit override */}
            <div className="space-y-2 pt-2">
              <ToggleInput
                label="Override Fit"
                value={fitOverridden}
                onChange={(v) => onUpdate({ background_fit: v ? sectionFit : null })}
                description="Crop differently than the section default"
              />
              {fitOverridden && (
                <div className="flex gap-2">
                  {(['cover', 'contain'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onUpdate({ background_fit: opt })}
                      className={cn(
                        'flex-1 px-3 py-1.5 rounded-full text-[11px] border transition-colors',
                        resolvedFit === opt
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
                      )}
                    >
                      {opt === 'cover' ? 'Cover' : 'Contain'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Per-slide focal point — toggle only; the picker itself lives
                inside the upload tile above (consolidated, no duplicate image). */}
            {!!focalImageUrl && resolvedFit !== 'contain' && (
              <div className="space-y-2 pt-3 border-t border-border/30">
                <ToggleInput
                  label="Override Focal Point"
                  value={focalOverridden}
                  onChange={(v) =>
                    onUpdate({
                      background_focal_x: v ? sectionFocalX : null,
                      background_focal_y: v ? sectionFocalY : null,
                    })
                  }
                  description="Drag the crosshair on the image above to anchor a different region for this slide"
                />
              </div>
            )}
          </>
        )}

        {/* Live preview */}
        {resolvedBgType !== 'none' && !!resolvedBgUrl && (
          <div className="pt-3 border-t border-border/30">
            <BackgroundResolvedPreview
              type={resolvedBgType}
              url={resolvedBgUrl}
              posterUrl={resolvedBgPoster}
              fit={resolvedFit}
              focalX={resolvedFocalX}
              focalY={resolvedFocalY}
              overlayMode={resolvedOverlayMode}
              overlayOpacity={resolvedOverlayOpacity}
              scrimStyle={resolvedScrimStyle}
              scrimStrength={resolvedScrimStrength}
              inherited={slide.background_type === 'inherit'}
            />
          </div>
        )}
      </EditorCard>

      {/* Per-slide content alignment — slides own this; the section-level
          value is the default fallback when a slide leaves it on "Inherit". */}
      <EditorCard title={`Slide ${index + 1} · Alignment`} icon={AlignJustify}>
        <p className="text-xs text-muted-foreground -mt-1">
          Horizontal placement of headline, subheadline, and CTA buttons for this slide.
          Defaults to the section-level alignment.
        </p>
        <div className="space-y-2">
          <Label className="text-xs">Content Alignment</Label>
          <div className="flex gap-2">
            {([
              { id: 'left', label: 'Left', Icon: AlignLeft },
              { id: 'center', label: 'Center', Icon: AlignCenter },
              { id: 'right', label: 'Right', Icon: AlignRight },
            ] as const).map(({ id, label, Icon }) => {
              const effective = slide.content_alignment ?? section.content_alignment ?? 'center';
              const active = effective === id;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onUpdate({ content_alignment: id })}
                  title={`Align ${label.toLowerCase()}`}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] border transition-colors',
                    active
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Per-slide content column width — punchy single-line headlines can
            flex wider than copy-heavy slides. Inherits the section default
            when unset (mirrors content_alignment inheritance behavior). */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs">Content Width</Label>
          <div className="flex gap-2">
            {([
              { id: 'narrow', label: 'Narrow', hint: 'Tight column for copy-heavy slides' },
              { id: 'default', label: 'Default', hint: 'Balanced 896px column' },
              { id: 'wide', label: 'Wide', hint: 'Flex wider for punchy headlines' },
            ] as const).map(({ id, label, hint }) => {
              const effective = slide.content_width ?? section.content_width ?? 'default';
              const active = effective === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdate({ content_width: id })}
                  title={hint}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center px-3 py-2 rounded-full text-[11px] border transition-colors',
                    active
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Wide is best for short, single-line headlines; narrow tightens copy-heavy slides.
          </p>
        </div>
      </EditorCard>

      {!backgroundOnly && (<>
      {/* Copy */}
      <EditorCard title={`Slide ${index + 1} · Copy`} icon={ImageIcon}>
        <ToggleInput
          label="Show Eyebrow"
          value={slide.show_eyebrow}
          onChange={(v) => onUpdate({ show_eyebrow: v })}
        />
        {slide.show_eyebrow && (
          <CharCountInput
            label="Eyebrow"
            value={slide.eyebrow}
            onChange={(v) => onUpdate({ eyebrow: v })}
            maxLength={40}
          />
        )}
        <CharCountInput
          label="Headline"
          value={slide.headline_text}
          onChange={(v) => onUpdate({ headline_text: v })}
          maxLength={60}
        />

        {/* Rotating word — section-level global, surfaced inline because it
            visually lives inside the headline. Editing here updates every slide. */}
        <div className="space-y-3 pl-3 border-l-2 border-border/40">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Rotating Word in Headline</p>
              <p className="text-[11px] text-muted-foreground">
                Shared across all slides — animates inside every headline.
              </p>
            </div>
          </div>

          <ToggleInput
            label="Show Rotating Word"
            value={section.show_rotating_words ?? false}
            onChange={(v) => onUpdateSection('show_rotating_words', v)}
          />

          {(section.show_rotating_words ?? false) && (
            <>
              <DynamicArrayInput
                label="Word List"
                items={section.rotating_words ?? []}
                onChange={(next) => onUpdateSection('rotating_words', next)}
                placeholder="Add a word..."
                maxItems={12}
                minItems={0}
                description="Each word appears in turn. 2–6 works best."
              />
              <SliderInput
                label="Rotation Interval"
                value={section.word_rotation_interval}
                onChange={(v) => onUpdateSection('word_rotation_interval', v)}
                min={2}
                max={10}
                step={0.5}
                unit="s"
                description="How long each word stays on screen"
              />
            </>
          )}
        </div>
        <CharCountInput
          label="Subheadline Line 1"
          value={slide.subheadline_line1}
          onChange={(v) => onUpdate({ subheadline_line1: v })}
          maxLength={80}
        />
        <CharCountInput
          label="Subheadline Line 2"
          value={slide.subheadline_line2}
          onChange={(v) => onUpdate({ subheadline_line2: v })}
          maxLength={80}
        />

        {/* Consultation notes — section-level global, surfaced inline because
            they visually live directly under the CTA buttons on every slide.
            Same pattern as the rotating-word block above. */}
        <div className="space-y-3 pl-3 border-l-2 border-border/40">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Notes Under Buttons</p>
            <p className="text-[11px] text-muted-foreground">
              Shared across all slides — appears below the CTA buttons.
            </p>
          </div>

          <ToggleInput
            label="Show Notes"
            value={section.show_consultation_notes ?? false}
            onChange={(v) => onUpdateSection('show_consultation_notes', v)}
          />

          {(section.show_consultation_notes ?? false) && (
            <>
              <CharCountInput
                label="Note Line 1"
                value={section.consultation_note_line1 ?? ''}
                onChange={(v) => onUpdateSection('consultation_note_line1', v)}
                maxLength={80}
              />
              <CharCountInput
                label="Note Line 2"
                value={section.consultation_note_line2 ?? ''}
                onChange={(v) => onUpdateSection('consultation_note_line2', v)}
                maxLength={80}
              />
            </>
          )}
        </div>
      </EditorCard>

      {/* CTAs */}
      <EditorCard title={`Slide ${index + 1} · Buttons`} icon={ImageIcon}>
        <CharCountInput
          label="Primary Button"
          value={slide.cta_new_client}
          onChange={(v) => onUpdate({ cta_new_client: v })}
          maxLength={30}
        />
        <UrlInput
          label="Primary Button URL"
          value={slide.cta_new_client_url}
          onChange={(v) => onUpdate({ cta_new_client_url: v })}
          placeholder="Leave empty to open consultation form"
        />
        <ToggleInput
          label="Show Secondary Button"
          value={slide.show_secondary_button}
          onChange={(v) => onUpdate({ show_secondary_button: v })}
        />
        {slide.show_secondary_button && (
          <>
            <CharCountInput
              label="Secondary Button"
              value={slide.cta_returning_client}
              onChange={(v) => onUpdate({ cta_returning_client: v })}
              maxLength={30}
            />
            <UrlInput
              label="Secondary Button URL"
              value={slide.cta_returning_client_url}
              onChange={(v) => onUpdate({ cta_returning_client_url: v })}
              placeholder="/booking"
            />
          </>
        )}
      </EditorCard>
      </>)}

      {/* Master-slide hint — shown on slide 1 in background-only mode where
          there's no inert-field banner above. Non-master slides already get
          the amber banner at the top of the editor and don't need a second
          mention here. */}
      {backgroundOnly && index === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 px-4 py-3 text-[11px] text-muted-foreground font-sans">
          Headline, subheadline & buttons are shared across all slides in
          Background-Only mode. Edit them under{' '}
          <span className="text-foreground font-medium">Shared Hero Content</span> on the hub.
        </div>
      )}

      {/* Advanced overrides — collapsed by default */}
      <Collapsible open={overridesOpen} onOpenChange={setOverridesOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/50 hover:border-foreground/30 transition-colors text-left"
          >
            {overridesOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
            <div className="flex-1">
              <div className="font-display text-[11px] tracking-wider text-foreground">
                ADVANCED OVERRIDES
              </div>
              <div className="text-[11px] text-muted-foreground font-sans mt-0.5">
                Override the section's scrim, overlay, or text colors for just this slide.
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4">
          {/* Overlay override */}
          <EditorCard title="Overlay Override" icon={Moon}>
            <ToggleInput
              label="Override Overlay"
              value={slide.overlay_opacity !== null || slide.overlay_mode != null}
              onChange={(v) =>
                onUpdate({
                  overlay_opacity: v ? sectionOverlayOpacity : null,
                  overlay_mode: v ? sectionOverlayMode : null,
                })
              }
              description="Use a different overlay tint or strength than the section default"
            />
            {(slide.overlay_opacity !== null || slide.overlay_mode != null) && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Slide Overlay Type</Label>
                  <div className="flex gap-2">
                    {([
                      { id: 'darken', label: 'Darken', icon: Moon },
                      { id: 'lighten', label: 'Lighten', icon: Sun },
                    ] as const).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onUpdate({ overlay_mode: id })}
                        className={cn(
                          'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border transition-colors',
                          (slide.overlay_mode ?? sectionOverlayMode) === id
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <SliderInput
                  label={(slide.overlay_mode ?? sectionOverlayMode) === 'lighten' ? 'Slide Overlay Lightness' : 'Slide Overlay Darkness'}
                  value={slide.overlay_opacity ?? sectionOverlayOpacity}
                  onChange={(v) => onUpdate({ overlay_opacity: v })}
                  min={0}
                  max={0.8}
                  step={0.05}
                />
              </>
            )}
          </EditorCard>

          {/* Scrim override */}
          <EditorCard title="Scrim Override" icon={Moon}>
            <HeroScrimEditor
              scrimStyle={slide.scrim_style ?? null}
              scrimStrength={slide.scrim_strength ?? null}
              inheritedStyle={section.scrim_style ?? 'gradient-bottom'}
              inheritedStrength={section.scrim_strength ?? 0.55}
              allowInherit
              onChange={(patch) => onUpdate(patch as Partial<HeroSlide>)}
              title="Slide Scrim"
              description="Override the section scrim for this slide. Useful when one video flashes brighter than others."
            />
          </EditorCard>

          {/* Text color override */}
          <EditorCard title="Text Color Override" icon={Moon}>
            <HeroTextColorsEditor
              value={slide.text_colors}
              onChange={(next) => onUpdate({ text_colors: next })}
              compact
            />
          </EditorCard>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
