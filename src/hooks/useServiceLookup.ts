import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ContainerType = 'bowl' | 'bottle';

export interface ServiceLookupEntry {
  name: string;
  category: string | null;
  duration_minutes: number;
  price: number | null;
  container_types: ContainerType[];
}

/**
 * Fetches all active services from phorest_services and returns a Map keyed by service name.
 * Used for render-time category resolution on appointment cards (multi-service banding).
 */
export function useServiceLookup() {
  return useQuery({
    queryKey: ['service-lookup-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_all_services' as any)
        .select('name, category, duration_minutes, price, container_types');

      if (error) throw error;

      const map = new Map<string, ServiceLookupEntry>();
      for (const s of ((data || []) as any[])) {
        // Normalize: trim whitespace from service names so consumers always hit a
        // normalized key, even when upstream POS rows contain trailing/leading spaces
        // (e.g. "Haircut (Add On)  "). Without this, render-time lookups miss and
        // prices/durations render blank.
        const cleanName = (s.name ?? '').trim();
        if (!cleanName) continue;
        const existing = map.get(cleanName);
        if (!existing || s.duration_minutes > existing.duration_minutes) {
          map.set(cleanName, {
            name: cleanName,
            category: s.category,
            duration_minutes: s.duration_minutes,
            price: s.price,
            container_types: (s.container_types as ContainerType[] | null) || ['bowl'],
          });
        }
      }
      return map;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
