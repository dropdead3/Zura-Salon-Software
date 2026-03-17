import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * ThemeInitializer component
 * Loads and applies custom theme (colors + typography) overrides from user_preferences on app load.
 * Should be placed inside AuthProvider to have access to the authenticated user.
 */
export function ThemeInitializer() {
  useEffect(() => {
    const loadCustomTheme = async () => {
      // Skip theme customization on public routes and platform routes
      // Platform manages its own theme via PlatformThemeContext + usePlatformBrandingEffect
      if (!window.location.pathname.startsWith('/dashboard') 
          || window.location.pathname.startsWith('/dashboard/platform')) {
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
        
        // Apply color theme overrides
        if (data?.custom_theme && typeof data.custom_theme === 'object') {
          const theme = data.custom_theme as Record<string, string>;
          Object.entries(theme).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
              document.documentElement.style.setProperty(`--${key}`, value);
            }
          });
        }
        
        // Apply typography overrides
        if (data?.custom_typography && typeof data.custom_typography === 'object') {
          const typography = data.custom_typography as Record<string, string>;
          Object.entries(typography).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
              document.documentElement.style.setProperty(`--${key}`, value);
            }
          });
        }
      } catch (error) {
        console.error('Error initializing custom theme:', error);
      }
    };
    
    loadCustomTheme();
    
    // Also listen for auth state changes to reload theme when user logs in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadCustomTheme();
      } else if (event === 'SIGNED_OUT') {
        // Clear custom CSS variables on sign out, but preserve platform-* vars
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
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}
