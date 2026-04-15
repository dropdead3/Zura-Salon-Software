import { useQuery } from '@tanstack/react-query';
import { getDay, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

interface DayOfWeekData {
  dayName: string;
  total: number;
  noShows: number;
  rate: number;
}

interface NoShowData {
  totalAppointments: number;
  noShows: number;
  noShowRate: number;
  cancellations: number;
  cancellationRate: number;
  revenueLost: number;
  byDayOfWeek: DayOfWeekData[];
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useNoShowReport(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['no-show-report', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<NoShowData> => {
      const appointments = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('id, appointment_date, status, total_price, tip_amount')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .range(from, to);

        if (locationId) {
          q = q.eq('location_id', locationId);
        }

        return q;
      });

      if (appointments.length === 0) {
        return {
          totalAppointments: 0,
          noShows: 0,
          noShowRate: 0,
          cancellations: 0,
          cancellationRate: 0,
          revenueLost: 0,
          byDayOfWeek: [],
        };
      }

      const total = appointments.length;
      const noShows = appointments.filter(a => a.status?.toLowerCase() === 'no_show' || a.status?.toLowerCase() === 'no-show').length;
      const cancellations = appointments.filter(a => a.status?.toLowerCase() === 'cancelled' || a.status?.toLowerCase() === 'canceled').length;

      // Calculate revenue lost from no-shows
      const revenueLost = appointments
        .filter(a => a.status?.toLowerCase() === 'no_show' || a.status?.toLowerCase() === 'no-show')
        .reduce((sum, a) => sum + ((Number(a.total_price) || 0) - (Number(a.tip_amount) || 0)), 0);

      // Group by day of week
      const byDay: Record<number, { total: number; noShows: number }> = {};
      
      appointments.forEach(apt => {
        const dayOfWeek = getDay(new Date(apt.appointment_date));
        if (!byDay[dayOfWeek]) {
          byDay[dayOfWeek] = { total: 0, noShows: 0 };
        }
        byDay[dayOfWeek].total += 1;
        if (apt.status?.toLowerCase() === 'no_show' || apt.status?.toLowerCase() === 'no-show') {
          byDay[dayOfWeek].noShows += 1;
        }
      });

      const byDayOfWeek: DayOfWeekData[] = Object.entries(byDay)
        .map(([day, data]) => ({
          dayName: dayNames[parseInt(day)],
          total: data.total,
          noShows: data.noShows,
          rate: data.total > 0 ? (data.noShows / data.total) * 100 : 0,
        }))
        .sort((a, b) => dayNames.indexOf(a.dayName) - dayNames.indexOf(b.dayName));

      return {
        totalAppointments: total,
        noShows,
        noShowRate: total > 0 ? (noShows / total) * 100 : 0,
        cancellations,
        cancellationRate: total > 0 ? (cancellations / total) * 100 : 0,
        revenueLost,
        byDayOfWeek,
      };
    },
  });
}
