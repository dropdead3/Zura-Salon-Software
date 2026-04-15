import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { resolveStaffNamesByPhorestIds } from '@/utils/resolveStaffNames';

export interface StaffRebookRow {
  staffId: string;
  name: string;
  todayCompleted: number;
  todayRebooked: number;
  todayMissed: number;
  thirtyDayRate: number;
}

const PAGE_SIZE = 1000;

async function paginatedFetch(
  dateFrom: string,
  dateTo: string,
  locationId?: string
) {
  const rows: { phorest_staff_id: string | null; rebooked_at_checkout: boolean | null }[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let q = supabase
      .from('v_all_appointments')
      .select('phorest_staff_id, rebooked_at_checkout')
      .gte('appointment_date', dateFrom)
      .lte('appointment_date', dateTo)
      .eq('status', 'completed')
      .range(offset, offset + PAGE_SIZE - 1);

    if (locationId && locationId !== 'all') {
      const ids = locationId.split(',').filter(Boolean);
      if (ids.length === 1) q = q.eq('location_id', ids[0]);
      else if (ids.length > 1) q = q.in('location_id', ids);
    }

    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data || []));
    hasMore = (data?.length || 0) === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return rows;
}

function groupByStaff(rows: { phorest_staff_id: string | null; rebooked_at_checkout: boolean | null }[]) {
  const map = new Map<string, { completed: number; rebooked: number }>();
  for (const r of rows) {
    const sid = r.phorest_staff_id || 'unknown';
    const entry = map.get(sid) || { completed: 0, rebooked: 0 };
    entry.completed++;
    if (r.rebooked_at_checkout) entry.rebooked++;
    map.set(sid, entry);
  }
  return map;
}

export function useStaffRebookDrilldown(date: string, locationId?: string) {
  const thirtyDaysAgo = format(subDays(new Date(date), 30), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['staff-rebook-drilldown', date, locationId],
    queryFn: async (): Promise<StaffRebookRow[]> => {
      // Fetch today + 30-day in parallel
      const [todayRows, rollingRows] = await Promise.all([
        paginatedFetch(date, date, locationId),
        paginatedFetch(thirtyDaysAgo, date, locationId),
      ]);

      const todayMap = groupByStaff(todayRows);
      const rollingMap = groupByStaff(rollingRows);

      // Collect all staff IDs
      const allIds = new Set<string>();
      todayMap.forEach((_, k) => allIds.add(k));
      // Only include rolling staff if they also have today data
      // Actually include all from today
      const staffIds = Array.from(allIds).filter((id) => id !== 'unknown');

      // Fetch staff names via centralized resolution
      const resolvedNames = await resolveStaffNamesByPhorestIds(staffIds);
      const nameMap = new Map<string, string>(Object.entries(resolvedNames));

      // Build result
      const result: StaffRebookRow[] = [];
      for (const [staffId, today] of todayMap) {
        if (staffId === 'unknown') continue;
        const rolling = rollingMap.get(staffId);
        const thirtyDayRate = rolling && rolling.completed > 0
          ? (rolling.rebooked / rolling.completed) * 100
          : 0;

        result.push({
          staffId,
          name: nameMap.get(staffId) || 'Unknown Staff',
          todayCompleted: today.completed,
          todayRebooked: today.rebooked,
          todayMissed: today.completed - today.rebooked,
          thirtyDayRate,
        });
      }

      // Sort by missed descending
      result.sort((a, b) => b.todayMissed - a.todayMissed);
      return result;
    },
    enabled: !!date,
  });
}
