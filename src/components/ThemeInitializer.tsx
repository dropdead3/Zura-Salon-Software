import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRouteZone } from '@/lib/route-utils';

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
 * ThemeInitializer component
 * Loads and applies custom theme (colors + typography) overrides from user_preferences on app load.
 * Actively cleans up org theme vars when navigating away from org dashboard routes.
 */
export function ThemeInitializer() {
  const zone = useRouteZone();
  const appliedVarsRef = useRef<string[]>([]);

  // Core loader — fetches user prefs and sets CSS vars
  const loadCustomTheme = async () => {
    if (zone !== 'org-dashboard') {
      // If we're not on an org dashboard route, clear any lingering org vars
      if (appliedVarsRef.current.length > 0) {
        appliedVarsRef.current.forEach(key =>
          document.documentElement.style.removeProperty(`--${key}`)
        );
        appliedVarsRef.current = [];
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('custom_theme, custom_typography')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading custom theme:', error);
        return;
      }

      const applied: string[] = [];

      // Apply color theme overrides
      if (data?.custom_theme && typeof data.custom_theme === 'object') {
        const theme = data.custom_theme as Record<string, string>;
        Object.entries(theme).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            document.documentElement.style.setProperty(`--${key}`, value);
            applied.push(key);
          }
        });
      }

      // Apply typography overrides
      if (data?.custom_typography && typeof data.custom_typography === 'object') {
        const typography = data.custom_typography as Record<string, string>;
        Object.entries(typography).forEach(([key, value]) => {
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
  };

  // Re-run on every route zone change so vars are applied/cleaned on navigation
  useEffect(() => {
    loadCustomTheme();
  }, [zone]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadCustomTheme();
      } else if (event === 'SIGNED_OUT') {
        clearOrgThemeVars();
        appliedVarsRef.current = [];
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
