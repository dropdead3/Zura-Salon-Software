import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientInspirationPhotos } from './useClientInspirationPhotos';

/**
 * Returns the count of inspiration photos for a given client that the current
 * user has not yet viewed on this appointment's Photos tab.
 *
 * "Unviewed" = uploaded_at is newer than the user's last_viewed_at for
 * (appointment_id, tab_key='photos'), OR the user has never opened the tab.
 */
export function useUnviewedInspirationPhotos(
  appointmentId: string | null | undefined,
  clientId: string | null | undefined,
) {
  const { data: photos } = useClientInspirationPhotos(clientId);

  const lastViewQuery = useQuery({
    queryKey: ['appointment-tab-view', appointmentId, 'photos'],
    queryFn: async (): Promise<string | null> => {
      if (!appointmentId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('appointment_tab_views')
        .select('last_viewed_at')
        .eq('user_id', user.id)
        .eq('appointment_id', appointmentId)
        .eq('tab_key', 'photos')
        .maybeSingle();

      if (error) throw error;
      return data?.last_viewed_at ?? null;
    },
    enabled: !!appointmentId,
    staleTime: 30_000,
  });

  const lastViewedAt = lastViewQuery.data;
  const unviewedCount = (photos ?? []).filter((p) => {
    if (!lastViewedAt) return true;
    return new Date(p.uploaded_at).getTime() > new Date(lastViewedAt).getTime();
  }).length;

  return {
    unviewedCount,
    isLoading: lastViewQuery.isLoading,
  };
}
