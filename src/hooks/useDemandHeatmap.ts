import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { getDay } from 'date-fns';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface HeatmapCell {
  day: number;
  dayName: string;
  hour: number;
  count: number;
}

export function useDemandHeatmap(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['demand-heatmap', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<{ cells: HeatmapCell[]; maxCount: number; peakDay: string; peakHour: number }> => {
      const data = await fetchAllBatched<{
        appointment_date: string;
        start_time: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('appointment_date, start_time')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('status', 'in', '("cancelled","no_show")')
          .not('start_time', 'is', null)
          .range(from, to);
        if (locationId && locationId !== 'all') {
          const ids = locationId.split(',').filter(Boolean);
          if (ids.length === 1) q = q.eq('location_id', ids[0]);
          else if (ids.length > 1) q = q.in('location_id', ids);
        }
        return q;
      });

      const grid: Record<string, number> = {};
      data.forEach(apt => {
        const day = getDay(new Date(apt.appointment_date));
        const hour = parseInt(apt.start_time!.split(':')[0]);
        const key = `${day}:${hour}`;
        grid[key] = (grid[key] || 0) + 1;
      });

      const cells: HeatmapCell[] = [];
      let maxCount = 0;
      for (let d = 0; d < 7; d++) {
        for (let h = 7; h <= 21; h++) {
          const count = grid[`${d}:${h}`] || 0;
          if (count > maxCount) maxCount = count;
          cells.push({ day: d, dayName: DAY_NAMES[d], hour: h, count });
        }
      }

      // Peak
      let peakDay = 'Mon';
      let peakHour = 10;
      let peakVal = 0;
      cells.forEach(c => { if (c.count > peakVal) { peakVal = c.count; peakDay = c.dayName; peakHour = c.hour; } });

      return { cells, maxCount, peakDay, peakHour };
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
