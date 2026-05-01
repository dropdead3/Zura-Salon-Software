/**
 * HeroBackgroundEditor — section-level background media (image OR video) for
 * the hero. Used as the static background when no slides are configured, and
 * as the inherited fallback for slides whose background_type is 'inherit'.
 */
import { useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Image as ImageIcon, Layers, Sun, Moon, Crosshair } from 'lucide-react';
import type { HeroConfig } from '@/hooks/useSectionConfig';
import { MediaUploadInput } from './inputs/MediaUploadInput';
import { SliderInput } from './inputs/SliderInput';
import { EditorCard } from './EditorCard';
import { cn } from '@/lib/utils';

interface HeroBackgroundEditorProps {
  config: HeroConfig;
  onChange: (next: Partial<HeroConfig>) => void;
}

export function HeroBackgroundEditor({ config, onChange }: HeroBackgroundEditorProps) {
  const kind = config.background_type === 'video' ? 'video' : config.background_type === 'image' ? 'image' : '';
  const slideMediaCount = (config.slides ?? []).filter(
    (slide) => slide.background_type !== 'inherit' && !!slide.background_url,
  ).length;

  const focalX = config.background_focal_x ?? 50;
  const focalY = config.background_focal_y ?? 50;
  const overlayMode = config.overlay_mode ?? 'darken';

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
        onChange={({ url, posterUrl, kind: k }) =>
          onChange({
            background_url: url,
            background_poster_url: posterUrl,
            background_type: k === 'video' ? 'video' : k === 'image' ? 'image' : 'none',
          })
        }
        pathPrefix="hero"
      />

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

          {/* Focal point picker — only meaningful when there's a real URL */}
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
        </>
      )}
    </EditorCard>
  );
}

interface FocalPointPickerProps {
  imageUrl: string;
  isVideo: boolean;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  onReset: () => void;
}

/**
 * Click or drag on the preview to set the focal point. Stored as percentages
 * (0..100) and applied via CSS object-position on the rendered media.
 */
function FocalPointPicker({ imageUrl, isVideo, x, y, onChange, onReset }: FocalPointPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 100;
    const ny = ((clientY - rect.top) / rect.height) * 100;
    onChange(
      Math.round(Math.max(0, Math.min(100, nx))),
      Math.round(Math.max(0, Math.min(100, ny))),
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromEvent(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromEvent(e.clientX, e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs inline-flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5" />
          Focal Point
        </Label>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset to center
        </button>
      </div>
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-muted cursor-crosshair select-none touch-none"
        style={{ aspectRatio: '16 / 9' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            style={{ objectPosition: `${x}% ${y}%` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
            {isVideo ? 'Add a poster image to set the focal point' : ''}
          </div>
        )}
        {/* Crosshair marker */}
        <div
          className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Click or drag on the image to anchor the most important area — it stays in view as the section is cropped on different screens. ({x}%, {y}%)
      </p>
    </div>
  );
}
