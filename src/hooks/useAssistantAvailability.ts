import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, getDay } from 'date-fns';
import { formatDisplayName } from '@/lib/utils';

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface AssistantProfile {
  user_id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  location_ids: string[] | null;
}

interface AssistantSchedule {
  user_id: string;
  location_id: string;
  work_days: string[];
}

interface AssistantWithSchedule extends AssistantProfile {
  schedules: AssistantSchedule[];
}

/**
 * Fetches all active stylist assistants with their location schedules
 */
export function useActiveAssistants() {
  return useQuery({
    queryKey: ['active-assistants'],
    queryFn: async () => {
      // Get all users with stylist_assistant or assistant role
      const { data: assistantRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist_assistant', 'assistant']);

      if (rolesError) throw rolesError;
      if (!assistantRoles?.length) return [];

      const assistantUserIds = assistantRoles.map(r => r.user_id);

      // Get their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url, location_ids')
        .in('user_id', assistantUserIds)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (profilesError) throw profilesError;

      // Get their location schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('employee_location_schedules')
        .select('user_id, location_id, work_days')
        .in('user_id', assistantUserIds);

      if (schedulesError) throw schedulesError;

      // Combine profiles with schedules
      const assistants: AssistantWithSchedule[] = (profiles || []).map(profile => ({
        ...profile,
        schedules: (schedules || []).filter(s => s.user_id === profile.user_id),
      }));

      return assistants;
    },
  });
}

/**
 * Gets locations that have at least one assistant available on a given date
 */
export function useLocationsWithAssistants(date: Date | undefined) {
  const { data: assistants = [] } = useActiveAssistants();

  if (!date) return [];

  const dayOfWeek = DAY_KEYS[getDay(date)];

  // Find all location IDs that have at least one assistant working that day
  const locationsWithAssistants = new Set<string>();

  assistants.forEach(assistant => {
    assistant.schedules.forEach(schedule => {
      if (schedule.work_days?.includes(dayOfWeek)) {
        locationsWithAssistants.add(schedule.location_id);
      }
    });
  });

  return Array.from(locationsWithAssistants);
}

/**
 * Hook to check if a specific location has assistants available on a given date
 */
export function useHasAssistantAvailability(locationId: string | undefined, date: Date | undefined) {
  const { data: assistants = [] } = useActiveAssistants();

  if (!date || !locationId) return false;

  const dayOfWeek = DAY_KEYS[getDay(date)];

  return assistants.some(assistant =>
    assistant.schedules.some(
      schedule => schedule.location_id === locationId && schedule.work_days?.includes(dayOfWeek)
    )
  );
}

/**
 * Get assistants available at a specific location on a specific date
 */
export function useAssistantsAtLocation(locationId: string | undefined, date: Date | undefined) {
  const { data: assistants = [] } = useActiveAssistants();

  if (!date || !locationId) return [];

  const dayOfWeek = DAY_KEYS[getDay(date)];

  return assistants.filter(assistant =>
    assistant.schedules.some(
      schedule => schedule.location_id === locationId && schedule.work_days?.includes(dayOfWeek)
    )
  );
}

/**
 * Get a summary of assistant coverage by location
 */
export function useAssistantCoverageSummary() {
  const { data: assistants = [], isLoading } = useActiveAssistants();

  const summary = assistants.reduce((acc, assistant) => {
    assistant.schedules.forEach(schedule => {
      if (!acc[schedule.location_id]) {
        acc[schedule.location_id] = {
          assistantCount: 0,
          assistants: [],
          daysCovered: new Set<string>(),
        };
      }
      acc[schedule.location_id].assistantCount++;
      acc[schedule.location_id].assistants.push({
        user_id: assistant.user_id,
        name: formatDisplayName(assistant.full_name, assistant.display_name),
        photo_url: assistant.photo_url,
        work_days: schedule.work_days || [],
      });
      schedule.work_days?.forEach(day => acc[schedule.location_id].daysCovered.add(day));
    });
    return acc;
  }, {} as Record<string, {
    assistantCount: number;
    assistants: Array<{
      user_id: string;
      name: string;
      photo_url: string | null;
      work_days: string[];
    }>;
    daysCovered: Set<string>;
  }>);

  // Convert Sets to arrays for easier use
  const result = Object.entries(summary).reduce((acc, [locationId, data]) => {
    acc[locationId] = {
      ...data,
      daysCovered: Array.from(data.daysCovered),
    };
    return acc;
  }, {} as Record<string, {
    assistantCount: number;
    assistants: Array<{
      user_id: string;
      name: string;
      photo_url: string | null;
      work_days: string[];
    }>;
    daysCovered: string[];
  }>);

  return { data: result, isLoading };
}
