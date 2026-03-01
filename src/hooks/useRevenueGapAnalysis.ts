import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GapAppointment {
  id: string;
  clientName: string | null;
  serviceName: string | null;
  stylistName: string | null;
  totalPrice: number;
  appointmentDate: string;
  startTime: string | null;
}

export interface RevenueGapAnalysis {
  expectedRevenue: number;
  actualRevenue: number;
  gapAmount: number;
  gapPercent: number;
  cancellations: { count: number; lostRevenue: number; appointments: GapAppointment[] };
  noShows: { count: number; lostRevenue: number; appointments: GapAppointment[] };
  unexplainedGap: number;
}

/**
 * Gap analysis hook: fetches cancellation/no-show data with full appointment
 * details (client, service, stylist) for a date range and computes the
 * revenue gap breakdown.
 */
export function useRevenueGapAnalysis(
  dateFrom: string,
  dateTo: string,
  expectedRevenue: number,
  actualRevenue: number,
  enabled: boolean
) {
  return useQuery<RevenueGapAnalysis>({
    queryKey: ['revenue-gap-analysis', dateFrom, dateTo],
    queryFn: async () => {
      // Fetch staff mapping for name resolution
      const { data: staffMap } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, phorest_staff_name');

      const staffLookup = new Map<string, string>();
      (staffMap ?? []).forEach((s) => {
        if (s.phorest_staff_id && s.phorest_staff_name) {
          staffLookup.set(s.phorest_staff_id, s.phorest_staff_name);
        }
      });

      // Fetch cancelled appointments with details
      const { data: cancelledData, error: cancelledError } = await supabase
        .from('phorest_appointments')
        .select('id, service_name, client_name, total_price, appointment_date, start_time, phorest_staff_id')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .eq('status', 'cancelled');

      if (cancelledError) throw cancelledError;

      // Fetch no-show appointments with details
      const { data: noShowData, error: noShowError } = await supabase
        .from('phorest_appointments')
        .select('id, service_name, client_name, total_price, appointment_date, start_time, phorest_staff_id')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .eq('status', 'no_show');

      if (noShowError) throw noShowError;

      const toGapAppointments = (rows: typeof cancelledData): GapAppointment[] =>
        (rows ?? [])
          .map((a) => ({
            id: a.id,
            clientName: a.client_name ?? null,
            serviceName: a.service_name ?? null,
            stylistName: a.phorest_staff_id ? (staffLookup.get(a.phorest_staff_id) ?? null) : null,
            totalPrice: Number(a.total_price) || 0,
            appointmentDate: a.appointment_date,
            startTime: a.start_time ?? null,
          }))
          .sort((a, b) => b.totalPrice - a.totalPrice);

      const cancelledAppts = toGapAppointments(cancelledData);
      const noShowAppts = toGapAppointments(noShowData);

      const cancellations = {
        count: cancelledAppts.length,
        lostRevenue: cancelledAppts.reduce((sum, a) => sum + a.totalPrice, 0),
        appointments: cancelledAppts,
      };

      const noShows = {
        count: noShowAppts.length,
        lostRevenue: noShowAppts.reduce((sum, a) => sum + a.totalPrice, 0),
        appointments: noShowAppts,
      };

      const gapAmount = expectedRevenue - actualRevenue;
      const gapPercent = expectedRevenue > 0 ? (gapAmount / expectedRevenue) * 100 : 0;
      const explainedGap = cancellations.lostRevenue + noShows.lostRevenue;
      const unexplainedGap = Math.max(0, gapAmount - explainedGap);

      return {
        expectedRevenue,
        actualRevenue,
        gapAmount,
        gapPercent,
        cancellations,
        noShows,
        unexplainedGap,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
