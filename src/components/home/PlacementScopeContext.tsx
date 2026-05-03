/**
 * Placement scope for page-level surfaces (testimonials, etc.).
 *
 * Inferred from the page slug at the DynamicPage / Index level so any
 * scope-aware section (currently TestimonialSection) can serve curated
 * reviews targeted at that surface via `useVisibleTestimonials(surface, scope)`.
 *
 * Default is `'homepage'` — preserves legacy behavior for any consumer
 * mounted outside a provider (marketing site, embeds, etc.).
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { PlacementScope } from '@/hooks/useTestimonials';

const PlacementScopeContext = createContext<PlacementScope>('homepage');

export function PlacementScopeProvider({
  scope,
  children,
}: {
  scope: PlacementScope;
  children: ReactNode;
}) {
  return (
    <PlacementScopeContext.Provider value={scope}>
      {children}
    </PlacementScopeContext.Provider>
  );
}

export function usePlacementScope(): PlacementScope {
  return useContext(PlacementScopeContext);
}

/**
 * Derive a placement scope from a page slug. Heuristic — keeps the
 * scope contract page-driven without requiring a new column on
 * `website_pages`.
 *
 * `services` / `menu` / `pricing` → 'service'
 * `team` / `stylists` / `about` (when it lists staff) → 'stylist'
 * everything else (incl. home) → 'homepage'
 */
export function inferPlacementScopeFromSlug(slug: string | undefined | null): PlacementScope {
  if (!slug) return 'homepage';
  const s = slug.toLowerCase();
  if (s === 'services' || s === 'menu' || s === 'pricing' || s.startsWith('services/')) {
    return 'service';
  }
  if (s === 'team' || s === 'stylists' || s === 'staff' || s.startsWith('team/') || s.startsWith('stylists/')) {
    return 'stylist';
  }
  return 'homepage';
}
