import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface MeetingConflict {
  userId: string;
  type: 'appointment' | 'meeting';
  title: string;
  startTime: string;
  endTime: string;
}

/**
 * Checks for scheduling conflicts across appointments AND admin meetings
 * for the given attendee user IDs on a specific date/time range.
 */
export function useMeetingConflicts(
  date: string | null,
  startTime: string | null,
  endTime: string | null,
  attendeeUserIds: string[],
  enabled: boolean = true,
) {
  // Check appointment conflicts
  const { data: appointmentConflicts } = useQuery({
    queryKey: ['meeting-conflicts-appointments', date, startTime, endTime, attendeeUserIds],
    queryFn: async () => {
      if (!date || !startTime || !endTime || attendeeUserIds.length === 0) return [];

      // Check phorest_appointments
      const { data: phorest, error: pError } = await supabase
        .from('v_all_appointments' as any)
        .select('id, stylist_user_id, start_time, end_time, client_name, service_name')
        .eq('appointment_date', date)
        .in('stylist_user_id', attendeeUserIds)
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .not('status', 'in', '("cancelled","no_show")');

      if (pError) console.warn('Phorest conflict check failed:', pError);

      // Check native appointments
      const { data: native, error: nError } = await supabase
        .from('appointments')
        .select('id, staff_user_id, start_time, end_time, client_name, service_name')
        .eq('appointment_date', date)
        .in('staff_user_id', attendeeUserIds)
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .not('status', 'in', '("cancelled","no_show")');

      if (nError) console.warn('Native conflict check failed:', nError);

      const conflicts: MeetingConflict[] = [];

      for (const apt of ((phorest || []) as any[])) {
        if (apt.stylist_user_id) {
          conflicts.push({
            userId: apt.stylist_user_id,
            type: 'appointment',
            title: `${apt.client_name || 'Client'} - ${apt.service_name || 'Service'}`,
            startTime: apt.start_time,
            endTime: apt.end_time,
          });
        }
      }

      for (const apt of (native || [])) {
        if (apt.staff_user_id) {
          conflicts.push({
            userId: apt.staff_user_id,
            type: 'appointment',
            title: `${apt.client_name || 'Client'} - ${apt.service_name || 'Service'}`,
            startTime: apt.start_time,
            endTime: apt.end_time,
          });
        }
      }

      return conflicts;
    },
    enabled: enabled && !!date && !!startTime && !!endTime && attendeeUserIds.length > 0,
    staleTime: 30000,
  });

  // Check meeting conflicts
  const { data: meetingConflicts } = useQuery({
    queryKey: ['meeting-conflicts-meetings', date, startTime, endTime, attendeeUserIds],
    queryFn: async () => {
      if (!date || !startTime || !endTime || attendeeUserIds.length === 0) return [];

      // Get meetings on this date that overlap
      const { data: meetings, error } = await supabase
        .from('admin_meetings')
        .select('id, title, start_time, end_time, organizer_user_id, admin_meeting_attendees(user_id)')
        .eq('start_date', date)
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .eq('status', 'scheduled');

      if (error) {
        console.warn('Meeting conflict check failed:', error);
        return [];
      }

      const conflicts: MeetingConflict[] = [];

      for (const mtg of (meetings || [])) {
        // Check organizer
        if (attendeeUserIds.includes(mtg.organizer_user_id)) {
          conflicts.push({
            userId: mtg.organizer_user_id,
            type: 'meeting',
            title: mtg.title,
            startTime: mtg.start_time,
            endTime: mtg.end_time,
          });
        }

        // Check attendees
        const attendees = mtg.admin_meeting_attendees as { user_id: string }[] | null;
        if (attendees) {
          for (const att of attendees) {
            if (attendeeUserIds.includes(att.user_id) && att.user_id !== mtg.organizer_user_id) {
              conflicts.push({
                userId: att.user_id,
                type: 'meeting',
                title: mtg.title,
                startTime: mtg.start_time,
                endTime: mtg.end_time,
              });
            }
          }
        }
      }

      return conflicts;
    },
    enabled: enabled && !!date && !!startTime && !!endTime && attendeeUserIds.length > 0,
    staleTime: 30000,
  });

  const allConflicts = useMemo(() => [
    ...(appointmentConflicts || []),
    ...(meetingConflicts || []),
  ], [appointmentConflicts, meetingConflicts]);

  const conflictsByUser = useMemo(() => {
    const map = new Map<string, MeetingConflict[]>();
    for (const c of allConflicts) {
      const existing = map.get(c.userId) || [];
      existing.push(c);
      map.set(c.userId, existing);
    }
    return map;
  }, [allConflicts]);

  return {
    conflicts: allConflicts,
    conflictsByUser,
    hasConflicts: allConflicts.length > 0,
    getConflictsForUser: (userId: string) => conflictsByUser.get(userId) || [],
  };
}
