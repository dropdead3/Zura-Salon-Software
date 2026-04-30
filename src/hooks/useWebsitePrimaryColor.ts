/**
 * useWebsitePrimaryColor
 *
 * Resolves the *public site*'s effective primary color so dashboard surfaces
 * (e.g., the popup editor's preview swatches) can render WYSIWYG against the
 * theme visitors will actually see — not the dashboard theme the operator
 * happens to be using.
 *
 * Resolution order:
 *   1. `site_settings.website_design_overrides.primary_hsl` (operator override)
 *   2. Falls back to `hsl(var(--primary))` so consumers can pass it straight
 *      to inline styles even when no override exists.
 */

import { useSiteSettings } from '@/hooks/useSiteSettings';
import type { DesignOverrides } from '@/components/dashboard/website-editor/SiteDesignPanel';

export function useWebsitePrimaryColor(): string {
  const { data } = useSiteSettings<DesignOverrides>('website_design_overrides');
  const hsl = data?.primary_hsl;
  if (hsl && hsl.trim()) {
    // Stored as raw "H S% L%" triplet for shadcn `hsl(var(--primary))` consumers.
    return `hsl(${hsl})`;
  }
  return 'hsl(var(--primary))';
}
