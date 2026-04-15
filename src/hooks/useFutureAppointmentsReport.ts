import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { format } from 'date-fns';

export interface FutureAppointmentEntry {
  date: string;
  appointmentCount: number;
  estimatedRevenue: number;
  newClientCount: number;
}

export interface FutureAppointmentsSummary {
  entries: FutureAppointmentEntry[];
  totalAppointments: number;
  totalEstimatedRevenue: number;
  totalNewClients: number;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function useFutureAppointmentsReport(filters: Filters) {
  return useQuery({
    queryKey: ['future-appointments-report', filters],
    queryFn: async (): Promise<FutureAppointmentsSummary> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const rows = await fetchAllBatched<{
        appointment_date: string;
        total_price: number | null;
        expected_price: number | null;
        is_new_client: boolean | null;
        status: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('appointment_date, total_price, expected_price, is_new_client, status')
          .gte('appointment_date', today)
          .lte('appointment_date', filters.dateTo)
          .not('status', 'in', '("cancelled","no_show","deleted")')
          .range(from, to);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        return q;
      });

      const dayMap = new Map<string, { count: number; revenue: number; newClients: number }>();

      for (const row of rows) {
        const date = row.appointment_date;
        const entry = dayMap.get(date) || { count: 0, revenue: 0, newClients: 0 };
        entry.count += 1;
        entry.revenue += Number(row.expected_price) || Number(row.total_price) || 0;
        if (row.is_new_client) entry.newClients += 1;
        dayMap.set(date, entry);
      }

      let totalAppointments = 0;
      let totalEstimatedRevenue = 0;
      let totalNewClients = 0;

      const entries: FutureAppointmentEntry[] = Array.from(dayMap.entries())
        .map(([date, v]) => {
          totalAppointments += v.count;
          totalEstimatedRevenue += v.revenue;
          totalNewClients += v.newClients;
          return { date, appointmentCount: v.count, estimatedRevenue: v.revenue, newClientCount: v.newClients };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return { entries, totalAppointments, totalEstimatedRevenue, totalNewClients };
    },
    staleTime: 2 * 60_000,
  });
}
