/**
 * BackgroundResolvedPreview — small live-preview thumbnail showing the fully
 * resolved background stack (image/video + focal point + image wash + scrim
 * shape + scrim strength) using the same `<HeroBackground />` the public site
 * uses.
 *
 * Surfaces a per-layer contribution caption so operators can see exactly which
 * layer is contributing what to the final composite. Each layer chip is
 * CLICKABLE — toggling it disables that layer in the preview only (no DB
 * writes), so operators can A/B which layer is doing the heavy lifting
 * without dragging sliders to zero and back.
 */
import { useState } from 'react';
import { HeroBackground } from '@/components/home/HeroBackground';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { HeroScrimStyle } from '@/hooks/useSectionConfig';

interface BackgroundResolvedPreviewProps {
  type: 'none' | 'image' | 'video';
  url: string;
  posterUrl?: string;
  fit?: 'cover' | 'contain';
  focalX: number;
  focalY: number;
  overlayMode: 'darken' | 'lighten';
  overlayOpacity: number;
  scrimStyle?: HeroScrimStyle;
  scrimStrength?: number;
  /** When true, captions the preview as inherited (not a per-slide media). */
  inherited?: boolean;
}

const SCRIM_LABEL: Record<HeroScrimStyle, string> = {
  'flat': 'flat',
  'gradient-bottom': 'gradient-bottom',
  'gradient-radial': 'gradient-radial',
  'vignette': 'vignette',
  'none': 'none',
};

export function BackgroundResolvedPreview(props: BackgroundResolvedPreviewProps) {
  // Preview-only mutes. Persist nothing — these reset on remount and never
  // touch site_settings. Operators get an instant A/B without losing config.
  const [washMuted, setWashMuted] = useState(false);
  const [scrimMuted, setScrimMuted] = useState(false);

  if (props.type === 'none' || !props.url) return null;

  const wash = Math.round((props.overlayOpacity ?? 0) * 100);
  const scrim = Math.round((props.scrimStrength ?? 0) * 100);
  const scrimShape = props.scrimStyle ?? 'flat';
  const tintWord = props.overlayMode === 'lighten' ? 'lighten' : 'darken';

  const washActive = wash > 0;
  const scrimActive = scrim > 0 && scrimShape !== 'none';

  // Effective values fed into the live HeroBackground after applying mutes.
  const effOverlayOpacity = washMuted ? 0 : props.overlayOpacity;
  const effScrimStrength = scrimMuted ? 0 : props.scrimStrength;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Resolved Preview</Label>
        {props.inherited && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            inherited from section
          </span>
        )}
      </div>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border bg-muted',
          props.inherited ? 'border-dashed border-border/60' : 'border-border',
        )}
        style={{ aspectRatio: '16 / 9' }}
      >
        <HeroBackground
          type={props.type}
          url={props.url}
          posterUrl={props.posterUrl}
          fit={props.fit}
          focalX={props.focalX}
          focalY={props.focalY}
          overlayMode={props.overlayMode}
          overlayOpacity={effOverlayOpacity}
          scrimStyle={props.scrimStyle}
          scrimStrength={effScrimStrength}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
        {!washActive && !scrimActive && (
          <span className="text-muted-foreground">no overlay layers active</span>
        )}
        {washActive && (
          <LayerChip
            label={`${tintWord} wash ${wash}%`}
            muted={washMuted}
            onToggle={() => setWashMuted((m) => !m)}
            title="Click to toggle this layer in the preview only — no save."
          />
        )}
        {washActive && scrimActive && <span className="text-muted-foreground">+</span>}
        {scrimActive && (
          <LayerChip
            label={`${SCRIM_LABEL[scrimShape]} ${scrim}%`}
            muted={scrimMuted}
            onToggle={() => setScrimMuted((m) => !m)}
            title="Click to toggle this layer in the preview only — no save."
          />
        )}
        {(washMuted || scrimMuted) && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-amber-500">
            preview only
          </span>
        )}
      </div>
    </div>
  );
}

function LayerChip({
  label,
  muted,
  onToggle,
  title,
}: {
  label: string;
  muted: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      aria-pressed={!muted}
      className={cn(
        'rounded-full border px-2 py-0.5 transition-colors',
        muted
          ? 'border-border/40 bg-background text-muted-foreground/50 line-through'
          : 'border-border bg-muted text-foreground hover:bg-muted/70',
      )}
    >
      {label}
    </button>
  );
}
