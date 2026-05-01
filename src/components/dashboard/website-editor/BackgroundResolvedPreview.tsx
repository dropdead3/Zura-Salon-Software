/**
 * BackgroundResolvedPreview — small live-preview thumbnail showing the fully
 * resolved background stack (image/video + focal point + image wash + scrim
 * shape + scrim strength) using the same `<HeroBackground />` the public site
 * uses. Surfaces a per-layer contribution caption so operators can see exactly
 * which layer is contributing what to the final composite, instead of guessing
 * why a slider drag "did nothing".
 */
import { HeroBackground } from '@/components/home/HeroBackground';
import { Label } from '@/components/ui/label';
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
}

const SCRIM_LABEL: Record<HeroScrimStyle, string> = {
  'flat': 'flat',
  'gradient-bottom': 'gradient-bottom',
  'gradient-radial': 'gradient-radial',
  'vignette': 'vignette',
  'none': 'none',
};

export function BackgroundResolvedPreview(props: BackgroundResolvedPreviewProps) {
  if (props.type === 'none' || !props.url) return null;

  const wash = Math.round((props.overlayOpacity ?? 0) * 100);
  const scrim = Math.round((props.scrimStrength ?? 0) * 100);
  const scrimShape = props.scrimStyle ?? 'flat';
  const tintWord = props.overlayMode === 'lighten' ? 'lighten' : 'darken';

  const layers: string[] = [];
  if (wash > 0) layers.push(`${tintWord} wash ${wash}%`);
  if (scrim > 0 && scrimShape !== 'none') layers.push(`${SCRIM_LABEL[scrimShape]} ${scrim}%`);
  const composite = layers.length ? layers.join(' + ') : 'no overlay layers active';

  return (
    <div className="space-y-2">
      <Label className="text-xs">Resolved Preview</Label>
      <div
        className="relative w-full overflow-hidden rounded-lg border border-border bg-muted"
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
          overlayOpacity={props.overlayOpacity}
          scrimStyle={props.scrimStyle}
          scrimStrength={props.scrimStrength}
        />
      </div>
      <p
        className="text-[11px] text-muted-foreground font-mono"
        title="Each overlay layer rendered onto the background, in stacking order"
      >
        {composite}
      </p>
    </div>
  );
}
