import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MarkViewedParams {
  appointmentId: string;
  tabKey: string;
}

/**
 * Upserts the current user's last_viewed_at for a given appointment + tab,
 * clearing any unread badges keyed off that timestamp.
 */
export function useMarkAppointmentTabViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, tabKey }: MarkViewedParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('appointment_tab_views')
        .upsert(
          {
            user_id: user.id,
            appointment_id: appointmentId,
            tab_key: tabKey,
            last_viewed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,appointment_id,tab_key' },
        );

      if (error) throw error;
      return { appointmentId, tabKey };
    },
    onSuccess: ({ appointmentId, tabKey }) => {
      queryClient.invalidateQueries({
        queryKey: ['appointment-tab-view', appointmentId, tabKey],
      });
    },
  });
}
