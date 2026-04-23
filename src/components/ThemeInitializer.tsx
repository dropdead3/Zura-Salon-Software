import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRouteZone } from '@/lib/route-utils';
import { ALL_CUSTOM_THEME_KEYS } from '@/hooks/useCustomTheme';
import { ALL_TYPOGRAPHY_KEYS } from '@/hooks/useTypographyTheme';

/**
 * Canonical registry of every CSS variable that ThemeInitializer is allowed to
 * write inline on <html>. Used to clear stale overrides on each reconcile so
 * old inline tokens (e.g. bone-like --background) cannot survive a theme change
 * and outrank class-based theme tokens.
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
 * ThemeInitializer component
 * Loads and applies custom theme (colors + typography) overrides from
 * user_preferences on app load. Owns the inline-CSS-variable layer on <html>.
 *
 * Reconcile contract:
 *   1. Always clear managed inline overrides BEFORE applying anything new.
 *   2. Apply server-provided overrides, if any.
 *   3. If the backend returns nothing, leave the stylesheet defaults to win.
 *
 * This guarantees stale bone-like inline tokens cannot survive a theme change
 * and outrank class-based theme tokens (.theme-jade, .theme-matrix, etc.).
 */
export function ThemeInitializer() {
  const zone = useRouteZone();
  const appliedVarsRef = useRef<string[]>([]);

  const loadCustomTheme = useCallback(async () => {
    if (zone !== 'org-dashboard') {
      // Outside the org dashboard: ensure no managed inline overrides leak.
      clearManagedOrgOverrideVars();
      appliedVarsRef.current = [];
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        clearManagedOrgOverrideVars();
        appliedVarsRef.current = [];
        return;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('custom_theme, custom_typography')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading custom theme:', error);
        return;
      }

      // Step 1: always reconcile by clearing previously managed overrides.
      // This is the fix — without it, stale bone-like inline tokens stick to
      // <html> and outrank the active theme class.
      clearManagedOrgOverrideVars();

      const applied: string[] = [];

      // Step 2: apply current server overrides (if any).
      if (data?.custom_theme && typeof data.custom_theme === 'object') {
        const theme = data.custom_theme as Record<string, string>;
        Object.entries(theme).forEach(([key, value]) => {
          if (value && typeof value === 'string' && MANAGED_ORG_OVERRIDE_KEYS.includes(key)) {
            document.documentElement.style.setProperty(`--${key}`, value);
            applied.push(key);
          }
        });
      }

      if (data?.custom_typography && typeof data.custom_typography === 'object') {
        const typography = data.custom_typography as Record<string, string>;
        Object.entries(typography).forEach(([key, value]) => {
          if (value && typeof value === 'string' && MANAGED_ORG_OVERRIDE_KEYS.includes(key)) {
            document.documentElement.style.setProperty(`--${key}`, value);
            applied.push(key);
          }
        });
      }

      appliedVarsRef.current = applied;
    } catch (error) {
      console.error('Error initializing custom theme:', error);
    }
  }, [zone]);

  useEffect(() => {
    loadCustomTheme();
  }, [loadCustomTheme]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadCustomTheme();
      } else if (event === 'SIGNED_OUT') {
        clearManagedOrgOverrideVars();
        appliedVarsRef.current = [];
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadCustomTheme]);

  return null;
}
