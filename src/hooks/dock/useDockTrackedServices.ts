/**
 * useDockTrackedServices — Fetches backroom-tracked service names for filtering.
 * Returns a Set<string> of lowercase service names, or null if none configured (use regex fallback).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDockTrackedServices(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['dock-tracked-services', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('name')
        .eq('organization_id', organizationId!)
        .eq('is_backroom_tracked', true)
        .eq('is_active', true);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return new Set(data.map((s) => s.name.toLowerCase().trim()));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
