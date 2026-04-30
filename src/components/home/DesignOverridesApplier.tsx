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

// Module-scoped set of CSS vars THIS applier has set on the document. We only
// ever clear vars we set ourselves — never vars baked in by the active theme.
// Without this guard the first paint nukes the theme's --primary, --font-display, etc.
const ownedVars = new Set<string>();

function setVar(root: HTMLElement, name: string, value: string | null) {
  if (value === null) {
    if (ownedVars.has(name)) {
      root.style.removeProperty(name);
      ownedVars.delete(name);
    }
    return;
  }
  root.style.setProperty(name, value);
  ownedVars.add(name);
}

function apply(overrides: DesignOverrides | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Colors → shadcn HSL var triplets. Only set when provided so theme defaults survive.
  setVar(root, '--primary', overrides?.primary_hsl ?? null);
  setVar(root, '--secondary', overrides?.secondary_hsl ?? null);
  setVar(root, '--accent', overrides?.accent_hsl ?? null);
  setVar(root, '--background', overrides?.background_hsl ?? null);

  // Fonts → CSS vars.
  if (overrides?.heading_font && FONT_STACKS[overrides.heading_font]) {
    setVar(root, '--font-display', FONT_STACKS[overrides.heading_font]);
  } else {
    setVar(root, '--font-display', null);
  }
  if (overrides?.body_font && FONT_STACKS[overrides.body_font]) {
    setVar(root, '--font-sans', FONT_STACKS[overrides.body_font]);
    document.body.style.fontFamily = FONT_STACKS[overrides.body_font];
  } else {
    setVar(root, '--font-sans', null);
    document.body.style.removeProperty('font-family');
  }

  // Density / button shape / hero overlay / section tint always have a sensible
  // default — these are safe to set unconditionally because the public site
  // doesn't pre-define them.
  const density = overrides?.density ?? 'comfy';
  setVar(root, '--zura-density-scale', DENSITY_SCALE[density] ?? '1');

  const shape = overrides?.button_shape ?? 'rounded';
  setVar(root, '--zura-button-radius', BUTTON_RADIUS[shape] ?? '0.5rem');

  const heroOverlay = (overrides?.hero_overlay_opacity ?? 40) / 100;
  setVar(root, '--zura-hero-overlay', heroOverlay.toString());

  const sectionTint = (overrides?.section_tint_opacity ?? 0) / 100;
  setVar(root, '--zura-section-tint', sectionTint.toString());
}

export function DesignOverridesApplier() {
  const { data: persisted, isLoading } = useSiteSettings<DesignOverrides>('website_design_overrides');

  // Apply persisted overrides on hydrate/change. Skip while loading so we don't
  // momentarily strip the active theme's --primary/--font-display before the
  // server-stored overrides arrive.
  useEffect(() => {
    if (isLoading) return;
    apply(persisted ?? null);
  }, [persisted, isLoading]);

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
