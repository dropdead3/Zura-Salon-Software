import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';

export interface AssistantProfile {
  display_name: string | null;
  full_name: string;
  photo_url: string | null;
}

export function useAppointmentAssistantNames(appointmentIds: string[]) {
  return useQuery({
    queryKey: ['appointment-assistant-names', appointmentIds],
    queryFn: async () => {
      if (appointmentIds.length === 0) return {
        assistantNamesMap: new Map<string, string[]>(),
        assistantProfilesMap: new Map<string, AssistantProfile[]>(),
      };

      const { data, error } = await supabase
        .from('appointment_assistants')
        .select('appointment_id, assistant_user_id')
        .in('appointment_id', appointmentIds);

      if (error) throw error;
      if (!data || data.length === 0) return {
        assistantNamesMap: new Map<string, string[]>(),
        assistantProfilesMap: new Map<string, AssistantProfile[]>(),
      };

      // Fetch profiles for all unique assistant user IDs
      const userIds = [...new Set(data.map(a => a.assistant_user_id))];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const namesMap = new Map<string, string[]>();
      const profilesMap = new Map<string, AssistantProfile[]>();

      data.forEach((row) => {
        const profile = profileMap.get(row.assistant_user_id);
        const name = profile
          ? formatDisplayName(profile.full_name, profile.display_name)
          : 'Assistant';
        
        // Names map
        const existingNames = namesMap.get(row.appointment_id) || [];
        existingNames.push(name);
        namesMap.set(row.appointment_id, existingNames);

        // Profiles map
        const existingProfiles = profilesMap.get(row.appointment_id) || [];
        existingProfiles.push({
          display_name: profile?.display_name ?? null,
          full_name: profile?.full_name ?? 'Assistant',
          photo_url: profile?.photo_url ?? null,
        });
        profilesMap.set(row.appointment_id, existingProfiles);
      });

      return { assistantNamesMap: namesMap, assistantProfilesMap: profilesMap };
    },
    enabled: appointmentIds.length > 0,
    staleTime: 30000,
  });
}
