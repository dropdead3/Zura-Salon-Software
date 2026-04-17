import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppointmentNote } from './useAppointmentNotes';

/**
 * Returns the count of appointment notes authored by someone OTHER than the
 * current user that have been added since the user's last view of the Notes
 * tab on this appointment.
 *
 * "Unviewed" = note.author_id !== current user AND
 *   (no last_viewed_at row OR note.created_at > last_viewed_at).
 *
 * Demo appointments (phorest_id starting with `demo-`) short-circuit to 0
 * since their notes live in sessionStorage and have no server-side cursor.
 */
export function useUnviewedAppointmentNotes(
  appointmentId: string | null | undefined,
  notes: AppointmentNote[] | undefined,
) {
  const isDemo = appointmentId?.startsWith('demo-') ?? false;

  const lastViewQuery = useQuery({
    queryKey: ['appointment-tab-view', appointmentId, 'notes'],
    queryFn: async (): Promise<{ userId: string; lastViewedAt: string | null } | null> => {
      if (!appointmentId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('appointment_tab_views')
        .select('last_viewed_at')
        .eq('user_id', user.id)
        .eq('appointment_id', appointmentId)
        .eq('tab_key', 'notes')
        .maybeSingle();

      if (error) throw error;
      return { userId: user.id, lastViewedAt: data?.last_viewed_at ?? null };
    },
    enabled: !!appointmentId && !isDemo,
    staleTime: 30_000,
  });

  if (isDemo) {
    return { unviewedCount: 0, isLoading: false };
  }

  const userId = lastViewQuery.data?.userId;
  const lastViewedAt = lastViewQuery.data?.lastViewedAt ?? null;

  const unviewedCount = (notes ?? []).filter((n) => {
    if (!userId) return false;
    if (n.author_id === userId) return false;
    if (!lastViewedAt) return true;
    return new Date(n.created_at).getTime() > new Date(lastViewedAt).getTime();
  }).length;

  return {
    unviewedCount,
    isLoading: lastViewQuery.isLoading,
  };
}
