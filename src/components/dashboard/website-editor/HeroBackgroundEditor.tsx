/**
 * HeroBackgroundEditor — section-level background media (image OR video) for
 * the hero. Used as the static background when no slides are configured, and
 * as the inherited fallback for slides whose background_type is 'inherit'.
 */
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Image as ImageIcon, Layers, Sun, Moon, Sparkles } from 'lucide-react';
import type { HeroConfig } from '@/hooks/useSectionConfig';
import { MediaUploadInput } from './inputs/MediaUploadInput';
import { SliderInput } from './inputs/SliderInput';
import { FocalPointPicker } from './inputs/FocalPointPicker';
import { EditorCard } from './EditorCard';
import { BackgroundResolvedPreview } from './BackgroundResolvedPreview';
import { useFocalPointSuggestion } from '@/hooks/useFocalPointSuggestion';
import { useIsKeyDirty } from '@/hooks/useDirtyDraftKey';
import { cn } from '@/lib/utils';

interface HeroBackgroundEditorProps {
  config: HeroConfig;
  onChange: (next: Partial<HeroConfig>) => void;
}

export function HeroBackgroundEditor({ config, onChange }: HeroBackgroundEditorProps) {
  const isDirty = useIsKeyDirty('section_hero');
  const kind = config.background_type === 'video' ? 'video' : config.background_type === 'image' ? 'image' : '';
  const slideMediaCount = (config.slides ?? []).filter(
    (slide) => slide.background_type !== 'inherit' && !!slide.background_url,
  ).length;

  const focalX = config.background_focal_x ?? 50;
  const focalY = config.background_focal_y ?? 50;
  const overlayMode = config.overlay_mode ?? 'darken';

  // Auto-suggest focal point when a new image is uploaded. Manual drags
  // always win — this only seeds the initial value, so we ONLY apply the
  // suggestion if the operator hasn't already moved the focal away from
  // dead-center (50/50). Without this guard, the async AI response races
  // ahead of the operator's Save click and silently re-dirties the editor
  // ("I just saved — why does it still say unsaved?!").
  const { suggest: suggestFocal, pending: focalPending } = useFocalPointSuggestion(({ x, y }) => {
    const currentX = config.background_focal_x ?? 50;
    const currentY = config.background_focal_y ?? 50;
    const isAtDefault = currentX === 50 && currentY === 50;
    if (!isAtDefault) return;
    onChange({ background_focal_x: x, background_focal_y: y });
  });

  const clearSlideMedia = () => {
    onChange({
      slides: (config.slides ?? []).map((slide) =>
        slide.background_type === 'inherit'
          ? slide
          : {
              ...slide,
              background_type: 'inherit',
              background_url: '',
              background_poster_url: '',
            },
      ),
    });
  };

  return (
    <EditorCard
      title="Background Media"
      icon={ImageIcon}
      description="Optional image or short video shown behind the hero text"
    >
      {slideMediaCount > 0 && (
        <Alert className="border-border/60 bg-muted/30">
          <Layers className="h-4 w-4" />
          <AlertTitle>Preview is using slide media</AlertTitle>
          <AlertDescription>
            <div className="space-y-3">
              <p>
                {slideMediaCount === 1
                  ? 'One hero slide has its own background, so the preview can still show media even when the section background is empty.'
                  : `${slideMediaCount} hero slides have their own backgrounds, so the preview can still show media even when the section background is empty.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size={tokens.button.inline} onClick={clearSlideMedia}>
                  Clear slide media
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <MediaUploadInput
        label="Section Background"
        value={config.background_url}
        posterValue={config.background_poster_url}
        kind={kind}
        qualityProfile="hero"
        meta={
          config.media_width
            ? {
                width: config.media_width,
                height: config.media_height,
                sizeBytes: config.media_size_bytes,
                format: config.media_format,
                optimizedWithProfile: config.media_optimized_with_profile,
              }
            : null
        }
        isDirtyDraft={isDirty}
        onChange={({ url, posterUrl, kind: k, meta, analysisDataUrl }) => {
          const wasNewImage = k === 'image' && url && url !== config.background_url;
          onChange({
            background_url: url,
            background_poster_url: posterUrl,
            background_type: k === 'video' ? 'video' : k === 'image' ? 'image' : 'none',
            // Capture upload-time metadata so the editor renders the
            // resolution caption + the public srcSet caps at the master width.
            media_width: meta?.width ?? (url ? config.media_width ?? null : null),
            media_height: meta?.height ?? (url ? config.media_height ?? null : null),
            media_size_bytes: meta?.sizeBytes ?? (url ? config.media_size_bytes ?? null : null),
            media_format: meta?.format ?? (url ? config.media_format ?? null : null),
            media_optimized_with_profile:
              meta?.optimizedWithProfile ??
              (url ? config.media_optimized_with_profile ?? null : null),
          });
          if (wasNewImage) suggestFocal(url, { analysisDataUrl });
        }}
        pathPrefix="hero"
      />

      {focalPending && (
        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Analyzing image to set focal point…
        </p>
      )}

      {config.background_type !== 'none' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Fit</Label>
            <div className="flex gap-2">
              {(['cover', 'contain'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => onChange({ background_fit: opt })}
                  className={`flex-1 px-3 py-2 rounded-full text-xs border transition-colors ${
                    config.background_fit === opt
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                  }`}
                >
                  {opt === 'cover' ? 'Cover' : 'Contain'}
                </button>
              ))}
            </div>
          </div>

          {/* Focal point picker — only meaningful when there's a real URL and fit is cover */}
          {!!config.background_url && config.background_fit === 'cover' && (
            <FocalPointPicker
              imageUrl={
                config.background_type === 'video'
                  ? config.background_poster_url || ''
                  : config.background_url
              }
              isVideo={config.background_type === 'video'}
              x={focalX}
              y={focalY}
              onChange={(nx, ny) =>
                onChange({ background_focal_x: nx, background_focal_y: ny })
              }
              onReset={() =>
                onChange({ background_focal_x: 50, background_focal_y: 50 })
              }
            />
          )}

          {/* Overlay mode — mutually exclusive Darken vs Lighten */}
          <div className="space-y-2">
            <Label className="text-xs">Overlay Type</Label>
            <div className="flex gap-2">
              {([
                { id: 'darken', label: 'Darken', icon: Moon },
                { id: 'lighten', label: 'Lighten', icon: Sun },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onChange({ overlay_mode: id })}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs border transition-colors',
                    overlayMode === id
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Choose one — darken deepens the media for light text, lighten washes it for dark text.
            </p>
          </div>

          <SliderInput
            label={overlayMode === 'lighten' ? 'Overlay Lightness' : 'Overlay Darkness'}
            value={config.overlay_opacity}
            onChange={(v) => onChange({ overlay_opacity: v })}
            min={0}
            max={0.8}
            step={0.05}
            description={
              overlayMode === 'lighten'
                ? 'Brightens the media to keep dark text legible'
                : 'Darkens the media to keep light text legible'
            }
          />

          {/* Live preview showing the resolved scrim + focal stack */}
          <BackgroundResolvedPreview
            type={config.background_type}
            url={config.background_url}
            posterUrl={config.background_poster_url}
            fit={config.background_fit}
            focalX={focalX}
            focalY={focalY}
            overlayMode={overlayMode}
            overlayOpacity={config.overlay_opacity}
            scrimStyle={config.scrim_style}
            scrimStrength={config.scrim_strength}
          />
        </>
      )}
    </EditorCard>
  );
}
