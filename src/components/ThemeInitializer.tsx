import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRouteZone } from '@/lib/route-utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

const CLEAR_CUSTOM_THEME_EVENT = 'dashboard-theme:clear-custom-overrides';

/**
 * Helper: strip all non-platform custom CSS vars from documentElement.
 * Preserves --platform-* vars so platform theme isn't nuked.
 */
function clearOrgThemeVars() {
  const style = document.documentElement.style;
  const propsToRemove: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop.startsWith('--') && !prop.startsWith('--platform-')) {
      propsToRemove.push(prop);
    }
  }
  propsToRemove.forEach(prop => style.removeProperty(prop));
}

/**
 * ThemeInitializer
 *
 * Theme Governance canon:
 * - Custom hex theme + typography overrides are ORGANIZATION-scoped
 *   (site_settings rows: `org_custom_theme`, `org_custom_typography`).
 * - This component reads them from the active org and applies as inline
 *   CSS variables, replacing the previous user-scoped behavior that
 *   leaked palettes between users and across orgs.
 * - On org switch and on sign-out, applied vars are cleared first so
 *   the next org's theme paints cleanly with no flash of the previous
 *   org's brand.
 */
export function ThemeInitializer() {
  const zone = useRouteZone();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const appliedVarsRef = useRef<string[]>([]);
  const loadTokenRef = useRef(0);

  const clearAppliedVars = useCallback(() => {
    if (appliedVarsRef.current.length === 0) return;

    appliedVarsRef.current.forEach((key) => {
      document.documentElement.style.removeProperty(`--${key}`);
    });
    appliedVarsRef.current = [];
  }, []);

  const loadCustomTheme = useCallback(async () => {
    const loadToken = ++loadTokenRef.current;

    if (zone !== 'org-dashboard' || !orgId) {
      clearAppliedVars();
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        clearAppliedVars();
        return;
      }

      // Org-scoped theme overrides (Theme Governance canon)
      const { data: rows, error } = await supabase
        .from('site_settings')
        .select('id, value')
        .eq('organization_id', orgId)
        .in('id', ['org_custom_theme', 'org_custom_typography']);

      if (error) {
        console.error('Error loading org custom theme:', error);
        return;
      }

      if (loadToken !== loadTokenRef.current) {
        return;
      }

      // Always reset before applying so a removed token doesn't linger
      clearAppliedVars();

      const themeRow = rows?.find(r => r.id === 'org_custom_theme');
      const typographyRow = rows?.find(r => r.id === 'org_custom_typography');

      const applied: string[] = [];

      const themeTokens = (themeRow?.value as { tokens?: Record<string, string> } | null)?.tokens;
      if (themeTokens && typeof themeTokens === 'object') {
        Object.entries(themeTokens).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            document.documentElement.style.setProperty(`--${key}`, value);
            applied.push(key);
          }
        });
      }

      const typographyTokens = (typographyRow?.value as { tokens?: Record<string, string> } | null)?.tokens;
      if (typographyTokens && typeof typographyTokens === 'object') {
        Object.entries(typographyTokens).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            document.documentElement.style.setProperty(`--${key}`, value);
            applied.push(key);
          }
        });
      }

      appliedVarsRef.current = applied;
    } catch (error) {
      console.error('Error initializing custom theme:', error);
    }
  }, [clearAppliedVars, zone, orgId]);

  // Reload whenever route zone, active org, or auth state changes.
  useEffect(() => {
    loadCustomTheme();
  }, [loadCustomTheme]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadCustomTheme();
      } else if (event === 'SIGNED_OUT') {
        loadTokenRef.current += 1;
        clearOrgThemeVars();
        appliedVarsRef.current = [];
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadCustomTheme]);

  useEffect(() => {
    const handleClearCustomTheme = () => {
      loadTokenRef.current += 1;
      clearAppliedVars();
    };

    window.addEventListener(CLEAR_CUSTOM_THEME_EVENT, handleClearCustomTheme);

    return () => {
      window.removeEventListener(CLEAR_CUSTOM_THEME_EVENT, handleClearCustomTheme);
    };
  }, [clearAppliedVars]);

  return null;
}
