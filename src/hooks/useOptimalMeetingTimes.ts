import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface BusyBlock {
  start: number; // minutes from midnight
  end: number;
}

interface SuggestedSlot {
  startTime: string; // HH:mm
  endTime: string;
  score: number; // higher = better
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Score slots by preference: late morning > early afternoon > morning > late afternoon
function scoreSlot(startMins: number): number {
  if (startMins >= 600 && startMins < 720) return 100; // 10-12 AM
  if (startMins >= 780 && startMins < 900) return 90;  // 1-3 PM
  if (startMins >= 540 && startMins < 600) return 80;  // 9-10 AM
  if (startMins >= 720 && startMins < 780) return 70;  // 12-1 PM
  if (startMins >= 900 && startMins < 1020) return 60; // 3-5 PM
  if (startMins >= 420 && startMins < 540) return 50;  // 7-9 AM
  return 40; // 5-9 PM
}

export function useOptimalMeetingTimes(
  date: string | null,
  attendeeUserIds: string[],
  durationMinutes: number,
  enabled: boolean = true,
) {
  const { data: busyBlocks } = useQuery({
    queryKey: ['optimal-times-busy', date, attendeeUserIds],
    queryFn: async () => {
      if (!date || attendeeUserIds.length === 0) return new Map<string, BusyBlock[]>();

      const blocks = new Map<string, BusyBlock[]>();

      // Fetch phorest appointments
      const { data: phorest } = await supabase
        .from('v_all_appointments')
        .select('stylist_user_id, start_time, end_time')
        .eq('appointment_date', date)
        .in('stylist_user_id', attendeeUserIds)
        .not('status', 'in', '("cancelled","no_show")');

      for (const a of phorest || []) {
        if (!a.stylist_user_id) continue;
        const arr = blocks.get(a.stylist_user_id) || [];
        arr.push({ start: timeToMinutes(a.start_time), end: timeToMinutes(a.end_time) });
        blocks.set(a.stylist_user_id, arr);
      }

      // Fetch native appointments
      const { data: native } = await supabase
        .from('appointments')
        .select('staff_user_id, start_time, end_time')
        .eq('appointment_date', date)
        .in('staff_user_id', attendeeUserIds)
        .not('status', 'in', '("cancelled","no_show")');

      for (const a of native || []) {
        if (!a.staff_user_id) continue;
        const arr = blocks.get(a.staff_user_id) || [];
        arr.push({ start: timeToMinutes(a.start_time), end: timeToMinutes(a.end_time) });
        blocks.set(a.staff_user_id, arr);
      }

      // Fetch existing meetings
      const { data: meetings } = await supabase
        .from('admin_meetings')
        .select('id, start_time, end_time, organizer_user_id, admin_meeting_attendees(user_id)')
        .eq('start_date', date)
        .eq('status', 'scheduled');

      for (const m of meetings || []) {
        const mStart = timeToMinutes(m.start_time);
        const mEnd = timeToMinutes(m.end_time);

        if (attendeeUserIds.includes(m.organizer_user_id)) {
          const arr = blocks.get(m.organizer_user_id) || [];
          arr.push({ start: mStart, end: mEnd });
          blocks.set(m.organizer_user_id, arr);
        }

        const attendees = m.admin_meeting_attendees as { user_id: string }[] | null;
        for (const att of attendees || []) {
          if (attendeeUserIds.includes(att.user_id)) {
            const arr = blocks.get(att.user_id) || [];
            arr.push({ start: mStart, end: mEnd });
            blocks.set(att.user_id, arr);
          }
        }
      }

      return blocks;
    },
    enabled: enabled && !!date && attendeeUserIds.length > 0,
    staleTime: 30000,
  });

  const suggestions = useMemo((): SuggestedSlot[] => {
    if (!busyBlocks || attendeeUserIds.length === 0) return [];

    const DAY_START = 7 * 60; // 7 AM
    const DAY_END = 21 * 60;  // 9 PM
    const STEP = 15;

    const slots: SuggestedSlot[] = [];

    for (let start = DAY_START; start + durationMinutes <= DAY_END; start += STEP) {
      const end = start + durationMinutes;
      let allFree = true;

      for (const uid of attendeeUserIds) {
        const userBlocks = busyBlocks.get(uid) || [];
        for (const b of userBlocks) {
          if (start < b.end && end > b.start) {
            allFree = false;
            break;
          }
        }
        if (!allFree) break;
      }

      if (allFree) {
        slots.push({
          startTime: minutesToTime(start),
          endTime: minutesToTime(end),
          score: scoreSlot(start),
        });
      }
    }

    // Sort by score descending, return top 5
    slots.sort((a, b) => b.score - a.score);
    return slots.slice(0, 5);
  }, [busyBlocks, attendeeUserIds, durationMinutes]);

  return {
    suggestions,
    isLoading: !busyBlocks && enabled && !!date && attendeeUserIds.length > 0,
    busyBlocks,
  };
}
