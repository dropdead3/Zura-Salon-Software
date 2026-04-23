import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRouteZone } from '@/lib/route-utils';
import { useLocation } from 'react-router-dom';
import { ALL_CUSTOM_THEME_KEYS } from '@/hooks/useCustomTheme';
import { ALL_TYPOGRAPHY_KEYS } from '@/hooks/useTypographyTheme';

/**
 * Canonical registry of every CSS variable that the org-level theme/typography
 * editor pipeline is allowed to write inline on <html>. Used here exclusively
 * for CLEANUP — ThemeInitializer never authors overrides on production
 * dashboard routes.
 */
const MANAGED_ORG_OVERRIDE_KEYS: string[] = [
  ...ALL_CUSTOM_THEME_KEYS,
  ...ALL_TYPOGRAPHY_KEYS,
];

function clearManagedOrgOverrideVars() {
  const style = document.documentElement.style;
  MANAGED_ORG_OVERRIDE_KEYS.forEach((key) => {
    style.removeProperty(`--${key}`);
  });
}

/**
 * Allowlist of routes where the editor hooks (useCustomTheme /
 * useTypographyTheme) are mounted and own the inline CSS variable layer.
 * Outside these routes, ThemeInitializer aggressively strips managed inline
 * overrides so class-based built-in themes (.theme-jade, .theme-matrix, etc.)
 * always win.
 */
function isEditorAuthoringRoute(pathname: string): boolean {
  // Design System / theme editor surfaces. Currently scoped to the platform
  // design-system page and any explicit theme-editor sub-routes. The editor
  // hooks themselves apply their saved overrides on mount; this gate only
  // determines whether ThemeInitializer should leave those overrides alone.
  return (
    pathname.includes('/design-system') ||
    pathname.includes('/theme-editor') ||
    pathname.includes('/typography-editor')
  );
}

/**
 * ThemeInitializer — single-responsibility cleanup reconciler.
 *
 * Doctrine:
 *   • Built-in dashboard themes are class-owned by useColorTheme.
 *   • Editor preview overrides are inline-owned by useCustomTheme /
 *     useTypographyTheme and only mounted inside the Design System editor.
 *   • ThemeInitializer never globally applies saved custom_theme /
 *     custom_typography to production dashboard surfaces. Doing so allowed
 *     editor-authoring data to outrank built-in theme classes via CSS
 *     precedence (inline > class), which made themes like Matrix / Jade /
 *     Orchid render Bone-like surfaces.
 *
 * Behavior:
 *   • Outside editor-authoring routes: clear all managed inline overrides on
 *     mount, on route change, and on auth state change.
 *   • Inside editor-authoring routes: no-op — let the editor hooks own
 *     <html> inline vars for live preview.
 */
export function ThemeInitializer() {
  const zone = useRouteZone();
  const location = useLocation();
  const lastClearedPathRef = useRef<string | null>(null);

  const reconcile = useCallback(() => {
    // Editor preview routes: hands off. The editor hooks own inline vars.
    if (isEditorAuthoringRoute(location.pathname)) {
      return;
    }

    // Everywhere else: ensure no stale or globally-leaked editor overrides
    // survive on <html>. Built-in theme classes must be the source of truth.
    clearManagedOrgOverrideVars();
    lastClearedPathRef.current = location.pathname;
  }, [location.pathname]);

  // Reconcile on every route change and on initial mount.
  useEffect(() => {
    reconcile();
  }, [reconcile, zone]);

  // Reconcile on auth transitions so a fresh session never inherits a stale
  // inline override layer from the previous user.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (!isEditorAuthoringRoute(window.location.pathname)) {
          clearManagedOrgOverrideVars();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
