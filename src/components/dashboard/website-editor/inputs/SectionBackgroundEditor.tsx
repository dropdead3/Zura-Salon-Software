/**
 * SectionBackgroundEditor — unified background + media + overlay editor reused
 * for BOTH the section's outer background AND the optional inner container
 * frame. Switches its persisted-key prefix via the `scope` prop so a single
 * component covers both surfaces.
 *
 * Layers (only rendered when relevant):
 *   1. Background type chips: None / Color / Gradient / Image / Video
 *   2. Type-specific input
 *   3. Media-only controls: Fit, Focal point (via MediaUploadInput overlay),
 *      Overlay mode + color + opacity, Grain, Vignette, Blur
 */
import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Video, Palette, Sparkles, X, Sun, Moon, Droplet } from 'lucide-react';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';
import { MediaUploadInput } from './MediaUploadInput';
import { ThemeAwareColorInput } from './ThemeAwareColorInput';
import { SectionBackgroundColorPicker } from './SectionBackgroundColorPicker';
import { SliderInput } from './SliderInput';

export type BackgroundEditorScope = 'section' | 'container';

type BgType = 'none' | 'color' | 'gradient' | 'image' | 'video';
type OverlayMode = 'none' | 'darken' | 'lighten' | 'color';

interface FieldKeys {
  type: keyof StyleOverrides;
  value: keyof StyleOverrides;
  poster: keyof StyleOverrides;
  fit: keyof StyleOverrides;
  focalX: keyof StyleOverrides;
  focalY: keyof StyleOverrides;
  overlayMode: keyof StyleOverrides;
  overlayColor: keyof StyleOverrides;
  overlayOpacity: keyof StyleOverrides;
  grain: keyof StyleOverrides;
  vignette: keyof StyleOverrides;
  blur: keyof StyleOverrides;
}

function keysFor(scope: BackgroundEditorScope): FieldKeys {
  if (scope === 'container') {
    return {
      type: 'container_background_type',
      value: 'container_background_value',
      poster: 'container_background_poster_url',
      fit: 'container_background_fit',
      focalX: 'container_background_focal_x',
      focalY: 'container_background_focal_y',
      overlayMode: 'container_overlay_mode',
      overlayColor: 'container_overlay_color',
      overlayOpacity: 'container_overlay_opacity',
      grain: 'container_grain_intensity',
      vignette: 'container_vignette_strength',
      blur: 'container_background_blur',
    };
  }
  return {
    type: 'background_type',
    value: 'background_value',
    poster: 'background_poster_url',
    fit: 'background_fit',
    focalX: 'background_focal_x',
    focalY: 'background_focal_y',
    overlayMode: 'overlay_mode',
    overlayColor: 'overlay_color',
    overlayOpacity: 'overlay_opacity',
    grain: 'grain_intensity',
    vignette: 'vignette_strength',
    blur: 'background_blur',
  };
}

const GRADIENT_PRESETS = [
  { label: 'Sunset', value: 'linear-gradient(135deg, #FFB088, #C75D5D)' },
  { label: 'Mist',   value: 'linear-gradient(180deg, #F4F1EC, #D8D2C7)' },
  { label: 'Ink',    value: 'linear-gradient(180deg, #1F1B18, #3A3633)' },
  { label: 'Sage',   value: 'linear-gradient(135deg, #E8EDE3, #A8B5A0)' },
  { label: 'Plum',   value: 'linear-gradient(135deg, #4A2C40, #1A1320)' },
  { label: 'Sand',   value: 'linear-gradient(180deg, #F8F4EC, #E8DFD0)' },
];

interface SectionBackgroundEditorProps {
  value: Partial<StyleOverrides>;
  onChange: (next: Partial<StyleOverrides>) => void;
  scope: BackgroundEditorScope;
  sectionId?: string;
  /** When true, includes the "video" option. Default true. */
  allowVideo?: boolean;
}

export function SectionBackgroundEditor({
  value,
  onChange,
  scope,
  sectionId,
  allowVideo = true,
}: SectionBackgroundEditorProps) {
  const k = keysFor(scope);
  const bgType = ((value[k.type] as BgType | undefined) ?? 'none') as BgType;
  const bgValue = (value[k.value] as string | undefined) ?? '';
  const posterValue = (value[k.poster] as string | undefined) ?? '';
  const fit = (value[k.fit] as 'cover' | 'contain' | undefined) ?? 'cover';
  const focalX = (value[k.focalX] as number | undefined) ?? 50;
  const focalY = (value[k.focalY] as number | undefined) ?? 50;
  const overlayMode = ((value[k.overlayMode] as OverlayMode | undefined) ?? 'none') as OverlayMode;
  const overlayColor = (value[k.overlayColor] as string | undefined) ?? '';
  const overlayOpacity = (value[k.overlayOpacity] as number | undefined) ?? 0.3;
  const grain = (value[k.grain] as number | undefined) ?? 0;
  const vignette = (value[k.vignette] as number | undefined) ?? 0;
  const blur = (value[k.blur] as number | undefined) ?? 0;

  const set = (key: keyof StyleOverrides, v: unknown) => onChange({ ...value, [key]: v });

  const setType = (next: BgType) => {
    // Switching type clears the value so the editor doesn't render stale URLs/hex.
    onChange({
      ...value,
      [k.type]: next,
      [k.value]: '',
      [k.poster]: '',
    });
  };

  const isMedia = bgType === 'image' || bgType === 'video';

  const types = useMemo<{ id: BgType; label: string; icon: typeof ImageIcon }[]>(
    () => {
      const base: { id: BgType; label: string; icon: typeof ImageIcon }[] = [
        { id: 'none',     label: 'None',     icon: X },
        { id: 'color',    label: 'Color',    icon: Palette },
        { id: 'gradient', label: 'Gradient', icon: Sparkles },
        { id: 'image',    label: 'Image',    icon: ImageIcon },
      ];
      if (allowVideo) base.push({ id: 'video', label: 'Video', icon: Video });
      return base;
    },
    [allowVideo],
  );

  return (
    <div className="space-y-4">
      {/* Type chips */}
      <div className="space-y-2">
        <Label className="text-xs">Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {types.map(({ id, label, icon: Icon }) => {
            const active = bgType === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card hover:bg-muted/60 text-muted-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color */}
      {bgType === 'color' && (
        <SectionBackgroundColorPicker
          value={bgValue}
          onChange={(v) => set(k.value, v)}
          label={scope === 'container' ? 'Container Color' : 'Background Color'}
        />
      )}

      {/* Gradient */}
      {bgType === 'gradient' && (
        <div className="space-y-2">
          <Label className="text-xs">Gradient</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {GRADIENT_PRESETS.map((p) => {
              const active = bgValue === p.value;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set(k.value, p.value)}
                  className={cn(
                    'h-12 rounded-lg border text-[10px] font-display uppercase tracking-wider text-white relative overflow-hidden',
                    active ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                  )}
                  style={{ background: p.value }}
                >
                  <span className="absolute inset-0 bg-black/20 flex items-end justify-center pb-1">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
          <Input
            value={bgValue}
            onChange={(e) => set(k.value, e.target.value)}
            placeholder="linear-gradient(135deg, #667eea, #764ba2)"
            className="h-8 text-xs font-mono"
          />
        </div>
      )}

      {/* Image / Video */}
      {isMedia && (
        <MediaUploadInput
          label={bgType === 'video' ? 'Video' : 'Image'}
          value={bgValue}
          posterValue={posterValue}
          kind={bgType === 'video' ? 'video' : 'image'}
          imageOnly={bgType === 'image'}
          pathPrefix={`sections/${sectionId ?? 'bg'}/${scope}`}
          focal={
            bgValue && fit === 'cover'
              ? {
                  x: focalX,
                  y: focalY,
                  onChange: (nx, ny) =>
                    onChange({ ...value, [k.focalX]: nx, [k.focalY]: ny }),
                  onReset: () =>
                    onChange({ ...value, [k.focalX]: 50, [k.focalY]: 50 }),
                  enabled: true,
                }
              : undefined
          }
          onChange={({ url, posterUrl, kind }) => {
            onChange({
              ...value,
              [k.value]: url,
              [k.poster]: posterUrl,
              [k.type]: kind === 'video' ? 'video' : kind === 'image' ? 'image' : 'none',
            });
          }}
        />
      )}

      {/* Media-only: fit toggle */}
      {isMedia && bgValue && (
        <div className="space-y-2">
          <Label className="text-xs">Fit</Label>
          <div className="flex gap-2">
            {(['cover', 'contain'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set(k.fit, opt)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-full text-xs border transition-colors',
                  fit === opt
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
                )}
              >
                {opt === 'cover' ? 'Cover' : 'Contain'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media-only: overlay controls */}
      {isMedia && bgValue && (
        <div className="space-y-3 pt-2 border-t border-border/40">
          <Label className="text-xs font-display uppercase tracking-wider text-muted-foreground">
            Overlay
          </Label>

          <div className="flex flex-wrap gap-1.5">
            {([
              { id: 'none',    label: 'None',    icon: X },
              { id: 'darken',  label: 'Darken',  icon: Moon },
              { id: 'lighten', label: 'Lighten', icon: Sun },
              { id: 'color',   label: 'Color',   icon: Droplet },
            ] as const).map(({ id, label, icon: Icon }) => {
              const active = overlayMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set(k.overlayMode, id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 h-7 text-[11px] transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card hover:bg-muted/60 text-muted-foreground',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              );
            })}
          </div>

          {overlayMode === 'color' && (
            <ThemeAwareColorInput
              label="Overlay Color"
              value={overlayColor}
              onChange={(next) => set(k.overlayColor, next ?? '')}
              placeholder="#000000"
            />
          )}

          {overlayMode !== 'none' && (
            <SliderInput
              label="Overlay Opacity"
              value={overlayOpacity}
              onChange={(v) => set(k.overlayOpacity, v)}
              min={0}
              max={1}
              step={0.05}
            />
          )}

          <SliderInput
            label="Grain"
            value={grain}
            onChange={(v) => set(k.grain, v)}
            min={0}
            max={1}
            step={0.05}
            description="Adds a film-grain texture across the media"
          />

          <SliderInput
            label="Vignette"
            value={vignette}
            onChange={(v) => set(k.vignette, v)}
            min={0}
            max={1}
            step={0.05}
            description="Darkens the edges to focus on the center"
          />

          <SliderInput
            label="Blur"
            value={blur}
            onChange={(v) => set(k.blur, v)}
            min={0}
            max={20}
            step={1}
            unit="px"
            description="Soft-focus the background media"
          />
        </div>
      )}
    </div>
  );
}
