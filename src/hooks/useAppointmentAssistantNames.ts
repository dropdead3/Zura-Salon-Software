import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';

export function useAppointmentAssistantNames(appointmentIds: string[]) {
  return useQuery({
    queryKey: ['appointment-assistant-names', appointmentIds],
    queryFn: async () => {
      if (appointmentIds.length === 0) return new Map<string, string[]>();

      const { data, error } = await supabase
        .from('appointment_assistants')
        .select('appointment_id, assistant_user_id')
        .in('appointment_id', appointmentIds);

      if (error) throw error;
      if (!data || data.length === 0) return new Map<string, string[]>();

      // Fetch profiles for all unique assistant user IDs
      const userIds = [...new Set(data.map(a => a.assistant_user_id))];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const map = new Map<string, string[]>();
      data.forEach((row) => {
        const profile = profileMap.get(row.assistant_user_id);
        const name = profile
          ? formatDisplayName(profile.full_name, profile.display_name)
          : 'Assistant';
        const existing = map.get(row.appointment_id) || [];
        existing.push(name);
        map.set(row.appointment_id, existing);
      });

      return map;
    },
    enabled: appointmentIds.length > 0,
    staleTime: 30000,
  });
}
