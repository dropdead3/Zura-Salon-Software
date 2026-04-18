import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AnimationIntensity = 'calm' | 'standard' | 'off';

const STORAGE_KEY = 'animation-intensity';
const HTML_CLASS_PREFIX = 'animations-';
const ALL_CLASSES: AnimationIntensity[] = ['calm', 'standard', 'off'];

export function getStoredIntensity(): AnimationIntensity {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'calm' || v === 'standard' || v === 'off') return v;
  } catch { /* ignore */ }
  return 'standard';
}

export function applyIntensityToDocument(intensity: AnimationIntensity) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  ALL_CLASSES.forEach(c => root.classList.remove(`${HTML_CLASS_PREFIX}${c}`));
  root.classList.add(`${HTML_CLASS_PREFIX}${intensity}`);
  const multiplier = intensity === 'off' ? '0' : intensity === 'calm' ? '1.5' : '1';
  root.style.setProperty('--animation-intensity-multiplier', multiplier);
  try { localStorage.setItem(STORAGE_KEY, intensity); } catch { /* ignore */ }
}

/**
 * Reads / writes animation intensity preference from user_preferences.
 * Synchronously applies the cached value to <html> on mount via
 * `AnimationIntensityInitializer`.
 */
export function useAnimationIntensity() {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<AnimationIntensity | null>(null);

  const query = useQuery({
    queryKey: ['animation-intensity'],
    queryFn: async (): Promise<AnimationIntensity> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return getStoredIntensity();
      const { data, error } = await supabase
        .from('user_preferences')
        .select('animation_intensity')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        // Column may not exist yet on stale schema — fall back silently.
        return getStoredIntensity();
      }
      const value = (data as { animation_intensity?: string } | null)?.animation_intensity;
      if (value === 'calm' || value === 'standard' || value === 'off') return value;
      return getStoredIntensity();
    },
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (intensity: AnimationIntensity) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        applyIntensityToDocument(intensity);
        return intensity;
      }
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, animation_intensity: intensity, updated_at: new Date().toISOString() } as never,
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      applyIntensityToDocument(intensity);
      return intensity;
    },
    onMutate: (intensity) => {
      setOptimistic(intensity);
      applyIntensityToDocument(intensity);
    },
    onSuccess: (intensity) => {
      setOptimistic(null);
      queryClient.setQueryData(['animation-intensity'], intensity);
    },
    onError: () => {
      setOptimistic(null);
    },
  });

  // Apply server value when it loads (don't fight active mutations)
  useEffect(() => {
    if (query.data && !mutation.isPending && !optimistic) {
      applyIntensityToDocument(query.data);
    }
  }, [query.data, mutation.isPending, optimistic]);

  const intensity: AnimationIntensity = optimistic ?? query.data ?? getStoredIntensity();

  const setIntensity = useCallback((value: AnimationIntensity) => {
    mutation.mutate(value);
  }, [mutation]);

  return {
    intensity,
    setIntensity,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
  };
}

/**
 * Lightweight read-only hook for components that need to know if animations
 * are disabled (e.g., counter components that should snap-to-value when off).
 * Reads from the <html> class — no DB call.
 */
export function useIsAnimationsOff(): boolean {
  const [off, setOff] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('animations-off');
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setOff(root.classList.contains('animations-off'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return off;
}
