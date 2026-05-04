/**
 * useCanActOnLocation — Pre-flight check for the `user_can_act_on_location`
 * SQL gate. Used by reply UIs (and any per-location mutation surface) to
 * suppress action buttons the current user can't actually use.
 *
 * Stylist Privacy Contract: a stylist at Location B must not see "Reply"
 * affordances on a Location A review even though the org shares one OAuth
 * token. The SQL function is the single source of truth — this hook is a
 * cached, fail-closed wrapper.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCanActOnLocation(locationId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['can-act-on-location', user?.id, locationId],
    enabled: !!user?.id && !!locationId,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('user_can_act_on_location', {
        _user_id: user!.id,
        _location_id: locationId!,
      });
      if (error) {
        console.warn('user_can_act_on_location failed', error);
        return false; // Fail-closed.
      }
      return data === true;
    },
  });
}
