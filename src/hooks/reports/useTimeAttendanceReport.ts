import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface TimeAttendanceEntry {
  staffName: string;
  userId: string;
  daysWorked: number;
  totalHours: number;
  avgHoursPerDay: number;
  breakHours: number;
  overtimeHours: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function useTimeAttendanceReport(filters: Filters) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['time-attendance-report', orgId, filters],
    queryFn: async (): Promise<TimeAttendanceEntry[]> => {
      // Get time entries
      const entries = await fetchAllBatched<{
        user_id: string;
        clock_in: string;
        clock_out: string | null;
        duration_minutes: number | null;
        break_minutes: number | null;
      }>((from, to) => {
        let q = supabase
          .from('time_entries')
          .select('user_id, clock_in, clock_out, duration_minutes, break_minutes')
          .gte('clock_in', filters.dateFrom)
          .lte('clock_in', filters.dateTo + 'T23:59:59')
          .range(from, to);
        if (orgId) q = q.eq('organization_id', orgId);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        return q;
      });

      // Get staff names
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name');

      const nameMap = new Map<string, string>();
      for (const p of profiles || []) {
        nameMap.set(p.user_id, p.display_name || p.full_name || 'Unknown');
      }

      // Aggregate by user
      const userMap = new Map<string, { days: Set<string>; totalMin: number; breakMin: number; dailyHours: Map<string, number> }>();

      for (const entry of entries || []) {
        if (!userMap.has(entry.user_id)) {
          userMap.set(entry.user_id, { days: new Set(), totalMin: 0, breakMin: 0, dailyHours: new Map() });
        }
        const agg = userMap.get(entry.user_id)!;
        const dayKey = entry.clock_in.split('T')[0];
        agg.days.add(dayKey);
        const dur = Number(entry.duration_minutes) || 0;
        agg.totalMin += dur;
        agg.breakMin += Number(entry.break_minutes) || 0;
        agg.dailyHours.set(dayKey, (agg.dailyHours.get(dayKey) || 0) + dur / 60);
      }

      const results: TimeAttendanceEntry[] = [];
      for (const [userId, agg] of userMap) {
        const totalHours = agg.totalMin / 60;
        const daysWorked = agg.days.size;
        let overtimeHours = 0;
        for (const [, hours] of agg.dailyHours) {
          if (hours > 8) overtimeHours += hours - 8;
        }
        results.push({
          staffName: nameMap.get(userId) || 'Unknown',
          userId,
          daysWorked,
          totalHours: Math.round(totalHours * 100) / 100,
          avgHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
          breakHours: Math.round((agg.breakMin / 60) * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
        });
      }

      return results.sort((a, b) => b.totalHours - a.totalHours);
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
