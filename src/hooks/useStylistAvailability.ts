import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface StylistWithAvailability {
  user_id: string;
  full_name: string;
  display_name: string | null;
  availableMinutes: number;
  isWorkingToday: boolean;
  phorest_staff_id?: string;
  stylist_level?: string | null;
}

interface Appointment {
  start_time: string;
  end_time: string;
  phorest_staff_id: string | null;
  stylist_user_id: string | null;
}

/**
 * Converts time string (HH:mm or HH:mm:ss) to minutes from midnight
 */
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

/**
 * Calculates total available minutes for a stylist based on their appointments
 * Only counts time from now until end of day
 */
function calculateAvailableMinutes(
  appointments: { start_time: string; end_time: string }[],
  dayStart: string = '08:00',
  dayEnd: string = '20:00'
): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const dayStartMinutes = Math.max(timeToMinutes(dayStart), currentMinutes);
  const dayEndMinutes = timeToMinutes(dayEnd);
  
  // If day has ended, no availability
  if (dayStartMinutes >= dayEndMinutes) {
    return 0;
  }
  
  // Sort appointments by start time
  const sorted = [...appointments]
    .map(a => ({
      start: timeToMinutes(a.start_time),
      end: timeToMinutes(a.end_time),
    }))
    .filter(a => a.end > dayStartMinutes && a.start < dayEndMinutes) // Only overlapping with remaining day
    .sort((a, b) => a.start - b.start);
  
  // If no appointments, full day is available
  if (sorted.length === 0) {
    return dayEndMinutes - dayStartMinutes;
  }
  
  let totalAvailable = 0;
  let cursor = dayStartMinutes;
  
  for (const appt of sorted) {
    // Gap before this appointment
    if (appt.start > cursor) {
      const gap = appt.start - cursor;
      // Only count gaps of 15+ minutes as usable
      if (gap >= 15) {
        totalAvailable += gap;
      }
    }
    // Move cursor past this appointment
    cursor = Math.max(cursor, appt.end);
  }
  
  // Gap after last appointment until end of day
  if (cursor < dayEndMinutes) {
    const gap = dayEndMinutes - cursor;
    if (gap >= 15) {
      totalAvailable += gap;
    }
  }
  
  return totalAvailable;
}

/**
 * Formats available minutes into a human-readable string
 */
export function formatAvailability(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m free` : `${hours}h free`;
  }
  return `${minutes}m free`;
}

/**
 * Hook to fetch stylists working today at a location with their availability
 */
export function useStylistAvailability(
  locationId: string | undefined,
  serviceDurationMinutes: number = 60
) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayOfWeek = format(new Date(), 'EEE'); // Mon, Tue, Wed, etc.

  return useQuery({
    queryKey: ['stylist-availability', locationId, today, serviceDurationMinutes],
    queryFn: async (): Promise<StylistWithAvailability[]> => {
      // If no location, return empty (or could fetch all)
      if (!locationId || locationId === 'all') {
        // Fallback: fetch all active stylists without availability filtering
        const { data: allStylists, error } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name, stylist_level')
          .eq('is_active', true)
          .order('full_name');
        
        if (error) throw error;
        
        return (allStylists || []).map(s => ({
          user_id: s.user_id,
          full_name: s.full_name,
          display_name: s.display_name,
          availableMinutes: 720, // Default 12 hours
          isWorkingToday: true,
          stylist_level: s.stylist_level,
        }));
      }

      // 1. Get stylists at this location with their schedules
      const { data: schedules, error: schedError } = await supabase
        .from('employee_location_schedules')
        .select('user_id, work_days')
        .eq('location_id', locationId);
      
      if (schedError) throw schedError;
      
      // Filter to those working today
      const workingTodayUserIds = (schedules || [])
        .filter(s => s.work_days?.includes(dayOfWeek))
        .map(s => s.user_id);
      
      if (workingTodayUserIds.length === 0) {
        return [];
      }

      // 2. Get employee profiles for working stylists
      const { data: profiles, error: profError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, stylist_level')
        .eq('is_active', true)
        .in('user_id', workingTodayUserIds as string[]);
      
      if (profError) throw profError;
      
      if (!profiles || profiles.length === 0) {
        return [];
      }

      // 3. Get Phorest staff mappings for these users at this location
      const { data: staffMappings, error: mappingError } = await supabase
        .from('phorest_staff_mapping')
        .select('user_id, phorest_staff_id, phorest_branch_id, show_on_calendar');
      
      if (mappingError) throw mappingError;
      
      // Filter in JavaScript to avoid deep type instantiation issues
      const filteredMappings = (staffMappings || []).filter(
        m => m.phorest_branch_id === locationId && m.show_on_calendar === true
      );
      
      // Map user_id to phorest_staff_id
      const userToPhorestMap = new Map<string, string>();
      (staffMappings || []).forEach(m => {
        if (m.phorest_staff_id) {
          userToPhorestMap.set(m.user_id, m.phorest_staff_id);
        }
      });

      // 4. Get today's appointments at this location
      const { data: appointments, error: apptError } = await supabase
        .from('v_all_appointments')
        .select('start_time, end_time, phorest_staff_id, stylist_user_id')
        .eq('appointment_date', today)
        .eq('location_id', locationId)
        .not('status', 'eq', 'cancelled');
      
      if (apptError) throw apptError;

      // 5. Calculate availability for each stylist
      const stylistsWithAvailability: StylistWithAvailability[] = profiles.map(profile => {
        const phorestStaffId = userToPhorestMap.get(profile.user_id);
        
        // Get appointments for this stylist (by user_id or phorest_staff_id)
        const stylistAppts = (appointments || []).filter((a: Appointment) => 
          a.stylist_user_id === profile.user_id || 
          (phorestStaffId && a.phorest_staff_id === phorestStaffId)
        );
        
        const availableMinutes = calculateAvailableMinutes(stylistAppts);
        
        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          display_name: profile.display_name,
          availableMinutes,
          isWorkingToday: true,
          phorest_staff_id: phorestStaffId,
          stylist_level: profile.stylist_level,
        };
      });

      // 6. Filter to those with enough availability and sort by most available
      return stylistsWithAvailability
        .filter(s => s.availableMinutes >= serviceDurationMinutes)
        .sort((a, b) => b.availableMinutes - a.availableMinutes);
    },
    enabled: true,
    staleTime: 60000, // Cache for 1 minute
  });
}
