/**
 * HeroBackground — renders an image or muted/looping video behind hero text,
 * with a configurable scrim overlay (flat, gradient, vignette) tuned for
 * legibility against dark/light fluctuations in video or photography.
 *
 * Pure presentational; no editor coupling. Used by both single-slide and the
 * multi-slide rotator.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { HeroScrimStyle } from '@/hooks/useSectionConfig';
import { buildSupabaseSrcSet, HERO_SRCSET_WIDTHS } from '@/lib/image-utils';

interface HeroBackgroundProps {
  type: 'none' | 'image' | 'video';
  url: string;
  posterUrl?: string;
  fit?: 'cover' | 'contain';
  /** Focal point 0..100 (CSS object-position percentages). Defaults 50/50. */
  focalX?: number;
  focalY?: number;
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
  /** Overlay tint: darken = black, lighten = white. Mutually exclusive. */
  overlayMode?: 'darken' | 'lighten';
  /**
   * Natural pixel width of the source image, when known. Caps the responsive
   * srcSet so we don't ask Storage for variants larger than the master upload.
   */
  mediaWidth?: number | null;
}

export function HeroBackground({
  type,
  url,
  posterUrl,
  fit = 'cover',
  focalX = 50,
  focalY = 50,
  overlayOpacity = 0.4,
  scrimStyle,
  scrimStrength,
  overlayMode = 'darken',
  mediaWidth,
}: HeroBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Build responsive srcSet for Supabase-hosted images. Returns null for
  // external URLs / blob: previews — caller falls back to plain `src`.
  const srcSet = useMemo(
    () => (type === 'image' ? buildSupabaseSrcSet(url, HERO_SRCSET_WIDTHS, mediaWidth ?? null) : null),
    [type, url, mediaWidth],
  );

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
  // overlayOpacity is the operator-facing control ("Overlay Darkness/Lightness").
  // scrimStrength is a legacy fallback used only when overlayOpacity isn't supplied.
  const strengthRaw = overlayOpacity ?? scrimStrength ?? 0.4;
  const strength = Math.max(0, Math.min(1, strengthRaw));
  const fx = Math.max(0, Math.min(100, focalX));
  const fy = Math.max(0, Math.min(100, focalY));
  const objectPosition = `${fx}% ${fy}%`;

  return (
    // Extra bottom bleed helps when the site is rendered inside a scaled iframe
    // in the editor preview, where subpixel compositing can reveal the next
    // section by a pixel or two at the hero boundary.
    <div className="absolute inset-x-0 top-0 -bottom-3 z-0 overflow-hidden">
      {type === 'video' ? (
        <video
          ref={videoRef}
          className={`w-full h-full ${objectFit}`}
          style={{ objectPosition }}
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
          style={{ objectPosition }}
          loading="eager"
          decoding="async"
        />
      )}
      {style !== 'none' && strength > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: buildScrimBackground(style, strength, overlayMode) }}
        />
      )}
    </div>
  );
}

/**
 * Build the CSS `background` value for a scrim. Each style is tuned so that
 * `strength` represents the *peak* tint opacity at the most opaque region,
 * letting operators dial intensity without changing shape. `mode` selects
 * the tint color: black for darken, white for lighten.
 */
function buildScrimBackground(
  style: HeroScrimStyle,
  strength: number,
  mode: 'darken' | 'lighten' = 'darken',
): string {
  const rgb = mode === 'lighten' ? '255,255,255' : '0,0,0';
  const peak = strength.toFixed(3);
  // Mid-region intensity for smoother falloff (≈ 60% of peak).
  const mid = (strength * 0.6).toFixed(3);
  // Edge intensity for vignettes (≈ 30% of peak).
  const edge = (strength * 0.3).toFixed(3);

  switch (style) {
    case 'flat':
      return `rgba(${rgb},${peak})`;

    case 'gradient-bottom':
      return `linear-gradient(to bottom, rgba(${rgb},0) 0%, rgba(${rgb},${edge}) 35%, rgba(${rgb},${mid}) 60%, rgba(${rgb},${peak}) 100%)`;

    case 'gradient-radial':
      return `radial-gradient(ellipse at 50% 55%, rgba(${rgb},${peak}) 0%, rgba(${rgb},${mid}) 45%, rgba(${rgb},${edge}) 75%, rgba(${rgb},0) 100%)`;

    case 'vignette':
      return `radial-gradient(ellipse at center, rgba(${rgb},0) 40%, rgba(${rgb},${mid}) 75%, rgba(${rgb},${peak}) 100%)`;

    case 'none':
    default:
      return 'transparent';
  }
}
