import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface DoubleBookingStaffStats {
  stylistUserId: string;
  staffName: string;
  totalDoubleBookedMinutes: number;
  doubleBookedSessions: number;
  totalBookedMinutes: number;
  percentOfSchedule: number;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function computeOverlapMinutes(
  intervals: { start: number; end: number }[]
): { overlapMinutes: number; sessionsInvolved: number } {
  if (intervals.length < 2) return { overlapMinutes: 0, sessionsInvolved: 0 };

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let overlapMinutes = 0;
  let sessionsInvolved = new Set<number>();

  // Merge intervals and track overlap
  const merged: { start: number; end: number }[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start < last.end) {
      // Overlap detected
      const overlapEnd = Math.min(current.end, last.end);
      overlapMinutes += overlapEnd - current.start;
      sessionsInvolved.add(i);
      sessionsInvolved.add(i - 1); // approximate — marks adjacent
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return { overlapMinutes, sessionsInvolved: sessionsInvolved.size };
}

export function useDoubleBookingStats(
  dateFrom: string,
  dateTo: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['double-booking-stats', orgId, dateFrom, dateTo, locationId],
    queryFn: async () => {
      let query = supabase
        .from('v_all_appointments' as any)
        .select('stylist_user_id, staff_name, appointment_date, start_time, end_time, status')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show","Cancelled","No Show")');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as {
        stylist_user_id: string | null;
        staff_name: string | null;
        appointment_date: string;
        start_time: string;
        end_time: string;
        status: string | null;
      }[];

      // Group by stylist + date
      const grouped = new Map<string, Map<string, { start: number; end: number }[]>>();
      const nameMap = new Map<string, string>();

      for (const row of rows) {
        if (!row.stylist_user_id || !row.start_time || !row.end_time) continue;

        const key = row.stylist_user_id;
        if (!grouped.has(key)) grouped.set(key, new Map());
        if (row.staff_name) nameMap.set(key, row.staff_name);

        const dayMap = grouped.get(key)!;
        if (!dayMap.has(row.appointment_date)) dayMap.set(row.appointment_date, []);

        dayMap.get(row.appointment_date)!.push({
          start: timeToMinutes(row.start_time),
          end: timeToMinutes(row.end_time),
        });
      }

      // Calculate per stylist
      const results: DoubleBookingStaffStats[] = [];

      for (const [stylistId, dayMap] of grouped) {
        let totalOverlap = 0;
        let totalSessions = 0;
        let totalBooked = 0;

        for (const [, intervals] of dayMap) {
          const { overlapMinutes, sessionsInvolved } = computeOverlapMinutes(intervals);
          totalOverlap += overlapMinutes;
          totalSessions += sessionsInvolved;

          for (const iv of intervals) {
            totalBooked += iv.end - iv.start;
          }
        }

        if (totalOverlap > 0) {
          results.push({
            stylistUserId: stylistId,
            staffName: nameMap.get(stylistId) || 'Unknown',
            totalDoubleBookedMinutes: totalOverlap,
            doubleBookedSessions: totalSessions,
            totalBookedMinutes: totalBooked,
            percentOfSchedule: totalBooked > 0
              ? Math.round((totalOverlap / totalBooked) * 100)
              : 0,
          });
        }
      }

      results.sort((a, b) => b.totalDoubleBookedMinutes - a.totalDoubleBookedMinutes);
      return results;
    },
    enabled: !!orgId && !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000,
  });
}
