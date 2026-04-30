/**
 * DesignOverridesApplier — applies global Site Design overrides to the public site.
 *
 * Mounted inside the public site shell (and inside the editor iframe).
 *   - On mount: reads `website_design_overrides` from site_settings and applies.
 *   - In editor: also listens for `PREVIEW_DESIGN_OVERRIDES` postMessage so the
 *     user sees changes the moment they drag a slider, before they hit Save.
 *
 * Applies values as CSS custom properties on document.documentElement so they
 * cascade through every shadcn token consumer (button, card, etc.).
 */

import { useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { FONT_STACKS, type DesignOverrides } from '@/components/dashboard/website-editor/SiteDesignPanel';

const DENSITY_SCALE: Record<string, string> = {
  compact: '0.85',
  comfy: '1',
  spacious: '1.2',
};

const BUTTON_RADIUS: Record<string, string> = {
  square: '0.125rem',
  rounded: '0.5rem',
  pill: '9999px',
};

function apply(overrides: DesignOverrides | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Colors → shadcn HSL var triplets. Only set when provided so theme defaults survive.
  if (overrides?.primary_hsl) root.style.setProperty('--primary', overrides.primary_hsl);
  else root.style.removeProperty('--primary');

  if (overrides?.secondary_hsl) root.style.setProperty('--secondary', overrides.secondary_hsl);
  else root.style.removeProperty('--secondary');

  if (overrides?.accent_hsl) root.style.setProperty('--accent', overrides.accent_hsl);
  else root.style.removeProperty('--accent');

  if (overrides?.background_hsl) root.style.setProperty('--background', overrides.background_hsl);
  else root.style.removeProperty('--background');

  // Fonts → CSS vars. Components that use --font-display / --font-body via
  // tailwind theme will inherit; otherwise set on body.
  if (overrides?.heading_font && FONT_STACKS[overrides.heading_font]) {
    root.style.setProperty('--font-display', FONT_STACKS[overrides.heading_font]);
  } else {
    root.style.removeProperty('--font-display');
  }
  if (overrides?.body_font && FONT_STACKS[overrides.body_font]) {
    root.style.setProperty('--font-sans', FONT_STACKS[overrides.body_font]);
    document.body.style.fontFamily = FONT_STACKS[overrides.body_font];
  } else {
    root.style.removeProperty('--font-sans');
    document.body.style.removeProperty('font-family');
  }

  // Density: scales the global radius & spacing var consumers can reference.
  const density = overrides?.density ?? 'comfy';
  root.style.setProperty('--zura-density-scale', DENSITY_SCALE[density] ?? '1');

  // Button shape via shared --radius (shadcn already uses this).
  const shape = overrides?.button_shape ?? 'rounded';
  root.style.setProperty('--zura-button-radius', BUTTON_RADIUS[shape] ?? '0.5rem');

  // Hero overlay (consumed by HeroSection via var(--zura-hero-overlay)).
  const heroOverlay = (overrides?.hero_overlay_opacity ?? 40) / 100;
  root.style.setProperty('--zura-hero-overlay', heroOverlay.toString());

  // Subtle section tint (consumed by even-indexed section wrappers if they opt in).
  const sectionTint = (overrides?.section_tint_opacity ?? 0) / 100;
  root.style.setProperty('--zura-section-tint', sectionTint.toString());
}

export function DesignOverridesApplier() {
  const { data: persisted } = useSiteSettings<DesignOverrides>('website_design_overrides');

  // Apply persisted overrides on hydrate/change.
  useEffect(() => {
    apply(persisted ?? null);
  }, [persisted]);

  // Live preview channel — only fires inside the editor iframe.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'PREVIEW_DESIGN_OVERRIDES') return;
      apply(msg.overrides ?? null);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return null;
}
