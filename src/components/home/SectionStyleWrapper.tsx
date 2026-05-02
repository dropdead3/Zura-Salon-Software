import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { grainDataUri, vignetteGradient, resolveOverlayBackground } from '@/lib/sectionOverlayLayers';

export interface StyleOverrides {
  // ─── Section background ────────────────────────────────────────────────
  background_type: 'none' | 'color' | 'gradient' | 'image' | 'video';
  background_value: string;
  background_poster_url?: string;
  background_fit?: 'cover' | 'contain';
  background_focal_x?: number;        // 0..100
  background_focal_y?: number;        // 0..100

  // ─── Section media overlays (apply over image/video bg) ────────────────
  overlay_mode?: 'none' | 'darken' | 'lighten' | 'color';
  overlay_color?: string;
  overlay_opacity?: number;           // 0..1
  grain_intensity?: number;           // 0..1
  vignette_strength?: number;         // 0..1
  background_blur?: number;           // 0..20 px

  // ─── Layout ────────────────────────────────────────────────────────────
  padding_top: number;
  padding_bottom: number;
  max_width: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  text_color_override: string;
  border_radius: number;
  heading_scale?: 'sm' | 'md' | 'lg' | 'xl';
  eyebrow_visible?: boolean;

  // ─── Container (inset content frame) ───────────────────────────────────
  container_enabled?: boolean;
  container_background_type?: 'none' | 'color' | 'gradient' | 'image' | 'video';
  container_background_value?: string;
  container_background_poster_url?: string;
  container_background_fit?: 'cover' | 'contain';
  container_background_focal_x?: number;
  container_background_focal_y?: number;
  container_overlay_mode?: 'none' | 'darken' | 'lighten' | 'color';
  container_overlay_color?: string;
  container_overlay_opacity?: number;
  container_grain_intensity?: number;
  container_vignette_strength?: number;
  container_background_blur?: number;
  container_padding?: number;         // 0..96 px
  container_radius?: number;          // 0..48 px
  container_max_width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const DEFAULT_STYLE_OVERRIDES: StyleOverrides = {
  background_type: 'none',
  background_value: '',
  padding_top: 0,
  padding_bottom: 0,
  max_width: 'full',
  text_color_override: '',
  border_radius: 0,
  heading_scale: 'md',
  eyebrow_visible: true,
};

const HEADING_SCALE_VALUES: Record<NonNullable<StyleOverrides['heading_scale']>, number> = {
  sm: 0.85,
  md: 1,
  lg: 1.18,
  xl: 1.4,
};

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'w-full',
};

interface SectionStyleWrapperProps {
  styleOverrides?: Partial<StyleOverrides>;
  children: ReactNode;
  className?: string;
}

/**
 * Renders a layered background stack:
 *   <section [solid bg]>
 *     [media layer (image/video) with focal + fit + blur]
 *     [scrim layer (darken/lighten/color × opacity)]
 *     [grain layer]
 *     [vignette layer]
 *     <max-width container>
 *       [optional container frame with its OWN media + overlay stack]
 *         {children}
 *     </container>
 *   </section>
 *
 * All overlay layers are absolute-positioned and `pointer-events-none` so
 * children remain interactive. Z-order: media → scrim → grain → vignette →
 * content.
 */
export function SectionStyleWrapper({ styleOverrides, children, className }: SectionStyleWrapperProps) {
  const merged = { ...DEFAULT_STYLE_OVERRIDES, ...styleOverrides };

  const outerStyle: CSSProperties = {};

  // Solid color / gradient as the base section background. Image/video are
  // rendered as a separate absolute layer so we can stack scrim/grain/vignette
  // on top without nesting backgrounds.
  if (merged.background_type === 'color' && merged.background_value) {
    outerStyle.backgroundColor = merged.background_value;
  } else if (merged.background_type === 'gradient' && merged.background_value) {
    outerStyle.background = merged.background_value;
  }

  if (merged.padding_top > 0) outerStyle.paddingTop = `${merged.padding_top}px`;
  if (merged.padding_bottom > 0) outerStyle.paddingBottom = `${merged.padding_bottom}px`;

  if (merged.text_color_override) outerStyle.color = merged.text_color_override;

  if (merged.border_radius > 0) {
    outerStyle.borderRadius = `${merged.border_radius}px`;
    outerStyle.overflow = 'clip';
  }

  const scale = HEADING_SCALE_VALUES[merged.heading_scale ?? 'md'] ?? 1;
  (outerStyle as CSSProperties & { ['--section-heading-scale']?: string })[
    '--section-heading-scale'
  ] = String(scale);

  const maxWidthClass = merged.max_width !== 'full' ? MAX_WIDTH_CLASSES[merged.max_width] : '';
  const eyebrowAttr = merged.eyebrow_visible === false ? 'off' : 'on';

  // Always relative so absolutely-positioned overlay layers anchor to the section.
  return (
    <div
      style={outerStyle}
      data-eyebrow={eyebrowAttr}
      className={cn('relative isolate', className)}
    >
      <BackgroundLayers
        type={merged.background_type}
        value={merged.background_value}
        posterUrl={merged.background_poster_url}
        fit={merged.background_fit ?? 'cover'}
        focalX={merged.background_focal_x ?? 50}
        focalY={merged.background_focal_y ?? 50}
        overlayMode={merged.overlay_mode}
        overlayColor={merged.overlay_color}
        overlayOpacity={merged.overlay_opacity ?? 0}
        grain={merged.grain_intensity ?? 0}
        vignette={merged.vignette_strength ?? 0}
        blur={merged.background_blur ?? 0}
      />

      <div className={cn('relative', maxWidthClass, maxWidthClass && 'mx-auto')}>
        {merged.container_enabled ? (
          <ContainerFrame overrides={merged}>{children}</ContainerFrame>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/* ─── Internal: Background layers ─────────────────────────────────────────── */

interface BackgroundLayersProps {
  type: StyleOverrides['background_type'];
  value: string;
  posterUrl?: string;
  fit: 'cover' | 'contain';
  focalX: number;
  focalY: number;
  overlayMode?: StyleOverrides['overlay_mode'];
  overlayColor?: string;
  overlayOpacity: number;
  grain: number;
  vignette: number;
  blur: number;
}

function BackgroundLayers({
  type, value, posterUrl, fit, focalX, focalY,
  overlayMode, overlayColor, overlayOpacity, grain, vignette, blur,
}: BackgroundLayersProps) {
  const isMedia = (type === 'image' || type === 'video') && !!value;
  if (!isMedia) return null;

  const objectFit = fit === 'contain' ? 'contain' : 'cover';
  const objectPosition = `${focalX}% ${focalY}%`;
  const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;

  const scrimBg = resolveOverlayBackground(overlayMode, overlayColor, overlayOpacity);
  const grainBg = grainDataUri(grain);
  const vignetteBg = vignetteGradient(vignette);

  return (
    <>
      {/* Media layer */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {type === 'video' ? (
          <video
            src={value}
            poster={posterUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full"
            style={{ objectFit, objectPosition, filter: filterStyle }}
          />
        ) : (
          <img
            src={value}
            alt=""
            className="w-full h-full"
            style={{ objectFit, objectPosition, filter: filterStyle }}
          />
        )}
      </div>

      {/* Scrim */}
      {scrimBg && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: scrimBg }}
        />
      )}

      {/* Grain */}
      {grainBg && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: grainBg }}
        />
      )}

      {/* Vignette */}
      {vignetteBg && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: vignetteBg }}
        />
      )}
    </>
  );
}

/* ─── Internal: Container frame ───────────────────────────────────────────── */

function ContainerFrame({
  overrides, children,
}: {
  overrides: StyleOverrides;
  children: ReactNode;
}) {
  const containerStyle: CSSProperties = { position: 'relative' };
  const padding = overrides.container_padding ?? 32;
  const radius = overrides.container_radius ?? 16;
  containerStyle.padding = `${padding}px`;
  containerStyle.borderRadius = `${radius}px`;
  containerStyle.overflow = 'hidden';
  containerStyle.isolation = 'isolate';

  if (overrides.container_background_type === 'color' && overrides.container_background_value) {
    containerStyle.backgroundColor = overrides.container_background_value;
  } else if (overrides.container_background_type === 'gradient' && overrides.container_background_value) {
    containerStyle.background = overrides.container_background_value;
  }

  const containerMaxWidthClass =
    overrides.container_max_width && overrides.container_max_width !== 'full'
      ? MAX_WIDTH_CLASSES[overrides.container_max_width]
      : '';

  return (
    <div className={cn(containerMaxWidthClass, containerMaxWidthClass && 'mx-auto')}>
      <div style={containerStyle}>
        <BackgroundLayers
          type={overrides.container_background_type ?? 'none'}
          value={overrides.container_background_value ?? ''}
          posterUrl={overrides.container_background_poster_url}
          fit={overrides.container_background_fit ?? 'cover'}
          focalX={overrides.container_background_focal_x ?? 50}
          focalY={overrides.container_background_focal_y ?? 50}
          overlayMode={overrides.container_overlay_mode}
          overlayColor={overrides.container_overlay_color}
          overlayOpacity={overrides.container_overlay_opacity ?? 0}
          grain={overrides.container_grain_intensity ?? 0}
          vignette={overrides.container_vignette_strength ?? 0}
          blur={overrides.container_background_blur ?? 0}
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
