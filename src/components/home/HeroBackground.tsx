/**
 * HeroBackground — renders an image or muted/looping video behind hero text,
 * with a configurable scrim overlay (flat, gradient, vignette) tuned for
 * legibility against dark/light fluctuations in video or photography.
 *
 * Pure presentational; no editor coupling. Used by both single-slide and the
 * multi-slide rotator.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
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
  /**
   * When true, emit a `<link rel="preload" as="image">` for this background
   * so the browser starts the LCP fetch before React hydrates. Only the
   * first/active hero should set this — multiple preloads waste bandwidth.
   */
  preload?: boolean;
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
  preload = false,
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
  // TWO INDEPENDENT LAYERS:
  //   1. `overlayOpacity` — flat uniform wash. This is the operator-facing
  //      "Overlay Darkness/Lightness" slider. ALWAYS applied so dragging the
  //      slider has an immediate, visible effect regardless of scrim style.
  //   2. `scrimStyle` + `scrimStrength` — editorial shape (gradient/vignette)
  //      layered ON TOP of the wash for legibility in the text region.
  //
  // Previously these were fused into a single value, which made the
  // "Overlay Darkness" slider invisible whenever scrim_style was a gradient
  // (the bottom-only gradient hid all changes at the top of the hero).
  const flatWash = Math.max(0, Math.min(1, overlayOpacity ?? 0));
  const scrimShape: HeroScrimStyle = scrimStyle ?? 'flat';
  const scrimPeak = Math.max(0, Math.min(1, scrimStrength ?? 0));
  const fx = Math.max(0, Math.min(100, focalX));
  const fy = Math.max(0, Math.min(100, focalY));
  const objectPosition = `${fx}% ${fy}%`;

  return (
    // Extra bottom bleed helps when the site is rendered inside a scaled iframe
    // in the editor preview, where subpixel compositing can reveal the next
    // section by a pixel or two at the hero boundary.
    <div className="absolute inset-x-0 top-0 -bottom-3 z-0 overflow-hidden">
      {/* LCP preload — emit only for the active first hero so the browser
          starts the image fetch in parallel with the JS bundle. Helmet
          de-dupes if multiple HeroBackgrounds slip into the tree. */}
      {preload && type === 'image' && url && (
        <Helmet>
          {srcSet ? (
            <link
              rel="preload"
              as="image"
              href={url}
              imageSrcSet={srcSet}
              imageSizes={HERO_SIZES_ATTR}
              fetchPriority="high"
            />
          ) : (
            <link rel="preload" as="image" href={url} fetchPriority="high" />
          )}
        </Helmet>
      )}
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
          {...(srcSet ? { srcSet, sizes: HERO_SIZES_ATTR } : {})}
          alt=""
          className={`w-full h-full ${objectFit}`}
          style={{ objectPosition }}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      )}
      {/* Layer 1 — flat uniform wash driven by the operator's
          "Image Wash" slider. Always rendered when > 0. */}
      {flatWash > 0 && (
        <div
          data-hero-overlay="wash"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(${overlayMode === 'lighten' ? '255,255,255' : '0,0,0'},${flatWash.toFixed(3)})`,
          }}
        />
      )}
      {/* Layer 2 — editorial scrim shape (gradient/vignette) for legibility. */}
      {scrimShape !== 'none' && scrimPeak > 0 && (
        <div
          data-hero-overlay="scrim"
          className="absolute inset-0 pointer-events-none"
          style={{ background: buildScrimBackground(scrimShape, scrimPeak, overlayMode) }}
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
