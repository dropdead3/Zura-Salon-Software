import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { applyIntensityToDocument, getStoredIntensity, type AnimationIntensity } from '@/hooks/useAnimationIntensity';

/**
 * AnimationIntensityInitializer
 * Mirrors the ThemeInitializer pattern. Applies the cached preference on
 * boot, refreshes from user_preferences after auth resolves, and resets
 * to default on sign-out.
 */
export function AnimationIntensityInitializer() {
  // Synchronously apply localStorage value on mount to avoid a flash.
  useEffect(() => {
    applyIntensityToDocument(getStoredIntensity());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFromServer = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data, error } = await supabase
          .from('user_preferences')
          .select('animation_intensity')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error || cancelled) return;
        const value = (data as { animation_intensity?: string } | null)?.animation_intensity;
        if (value === 'calm' || value === 'standard' || value === 'off') {
          applyIntensityToDocument(value as AnimationIntensity);
        }
      } catch {
        /* ignore */
      }
    };

    loadFromServer();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadFromServer();
      } else if (event === 'SIGNED_OUT') {
        applyIntensityToDocument('standard');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
