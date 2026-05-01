/**
 * HeroBackground — renders an image or muted/looping video behind hero text,
 * with a configurable scrim overlay (flat, gradient, vignette) tuned for
 * legibility against dark/light fluctuations in video or photography.
 *
 * Pure presentational; no editor coupling. Used by both single-slide and the
 * multi-slide rotator.
 */
import { useEffect, useRef } from 'react';
import type { HeroScrimStyle } from '@/hooks/useSectionConfig';

interface HeroBackgroundProps {
  type: 'none' | 'image' | 'video';
  url: string;
  posterUrl?: string;
  fit?: 'cover' | 'contain';
  /**
   * 0..0.8 — back-compat strength. Used as `scrimStrength` fallback when
   * `scrimStrength` is not provided. Renders the same visual as `flat` style
   * if `scrimStyle` is not provided either.
   */
  overlayOpacity?: number;
  /** Scrim shape. Defaults to `gradient-bottom` for media legibility. */
  scrimStyle?: HeroScrimStyle;
  /** Scrim peak opacity (0..1). Defaults to overlayOpacity, then 0.55. */
  scrimStrength?: number;
}

export function HeroBackground({
  type,
  url,
  posterUrl,
  fit = 'cover',
  overlayOpacity = 0.4,
  scrimStyle,
  scrimStrength,
}: HeroBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Force a load() when the source URL changes so swapped videos restart cleanly.
  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {/* autoplay may be blocked; poster will show */});
      }
    }
  }, [type, url]);

  if (type === 'none' || !url) return null;

  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover';
  // Resolve scrim style/strength with sensible fallbacks.
  const style: HeroScrimStyle = scrimStyle ?? 'flat';
  const strengthRaw = scrimStrength ?? overlayOpacity ?? 0.4;
  const strength = Math.max(0, Math.min(1, strengthRaw));

  return (
    // `-bottom-1.5` (6px bleed) prevents subpixel gaps where the next section's
    // background would otherwise show through at the hero's bottom edge.
    <div className="absolute inset-x-0 top-0 -bottom-1.5 z-0 overflow-hidden">
      {type === 'video' ? (
        <video
          ref={videoRef}
          className={`w-full h-full ${objectFit}`}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={posterUrl || undefined}
        >
          <source src={url} />
        </video>
      ) : (
        <img
          src={url}
          alt=""
          className={`w-full h-full ${objectFit}`}
          loading="eager"
          decoding="async"
        />
      )}
      {style !== 'none' && strength > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: buildScrimBackground(style, strength) }}
        />
      )}
    </div>
  );
}

/**
 * Build the CSS `background` value for a scrim. Each style is tuned so that
 * `strength` represents the *peak* black opacity at the most opaque region,
 * letting operators dial intensity without changing shape.
 */
function buildScrimBackground(style: HeroScrimStyle, strength: number): string {
  const peak = strength.toFixed(3);
  // Mid-region intensity for smoother falloff (≈ 60% of peak).
  const mid = (strength * 0.6).toFixed(3);
  // Edge intensity for vignettes (≈ 30% of peak).
  const edge = (strength * 0.3).toFixed(3);

  switch (style) {
    case 'flat':
      return `rgba(0,0,0,${peak})`;

    case 'gradient-bottom':
      // Darker at the bottom 60% (where most heroes anchor text), fades up.
      return `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${edge}) 35%, rgba(0,0,0,${mid}) 60%, rgba(0,0,0,${peak}) 100%)`;

    case 'gradient-radial':
      // Darker toward the center where headlines typically render.
      return `radial-gradient(ellipse at 50% 55%, rgba(0,0,0,${peak}) 0%, rgba(0,0,0,${mid}) 45%, rgba(0,0,0,${edge}) 75%, rgba(0,0,0,0) 100%)`;

    case 'vignette':
      // Darker at all edges, lighter in the middle (preserves subject focus).
      return `radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,${mid}) 75%, rgba(0,0,0,${peak}) 100%)`;

    case 'none':
    default:
      return 'transparent';
  }
}
