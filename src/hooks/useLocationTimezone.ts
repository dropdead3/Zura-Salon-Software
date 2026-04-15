import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the timezone override for a specific location.
 * Returns the location's timezone if set, otherwise null (inherit from org default).
 */
export function useLocationTimezone(locationId?: string | null) {
  const { data: locationTimezone = null } = useQuery({
    queryKey: ['location-timezone', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('timezone')
        .eq('id', locationId!)
        .single();
      if (error) throw error;
      return (data?.timezone as string) ?? null;
    },
    enabled: !!locationId,
    staleTime: 2 * 60 * 1000,
  });

  return locationTimezone;
}
