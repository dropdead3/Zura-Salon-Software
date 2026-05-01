/**
 * BackgroundResolvedPreview — small live-preview thumbnail showing the fully
 * resolved background stack (image/video + focal point + scrim style + tint
 * mode + strength) using the same `<HeroBackground />` the public site uses.
 * Lets operators see the lighten effect without leaving the editor.
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

export function BackgroundResolvedPreview(props: BackgroundResolvedPreviewProps) {
  if (props.type === 'none' || !props.url) return null;
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
      <p className="text-[11px] text-muted-foreground">
        Live preview of the final rendered background — focal point, scrim, and {props.overlayMode === 'lighten' ? 'lighten' : 'darken'} tint applied.
      </p>
    </div>
  );
}
