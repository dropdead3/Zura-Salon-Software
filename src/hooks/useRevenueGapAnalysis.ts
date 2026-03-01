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

export interface PricingVarianceItem {
  clientName: string | null;
  scheduledServices: string[];
  actualServices: string[];
  scheduledAmount: number;
  actualAmount: number;
  variance: number;
  appointmentDate: string;
  stylistName: string | null;
  hasDiscount: boolean;
  noTransaction: boolean;
}

export interface RevenueGapAnalysis {
  expectedRevenue: number;
  actualRevenue: number;
  gapAmount: number;
  gapPercent: number;
  cancellations: { count: number; lostRevenue: number; appointments: GapAppointment[] };
  noShows: { count: number; lostRevenue: number; appointments: GapAppointment[] };
  pricingVariances: { count: number; totalVariance: number; items: PricingVarianceItem[] };
  unexplainedGap: number;
}

/**
 * Gap analysis hook: fetches cancellation/no-show data with full appointment
 * details (client, service, stylist) for a date range and computes the
 * revenue gap breakdown including pricing variances.
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

      // Fetch completed appointments for pricing variance analysis
      const { data: completedData, error: completedError } = await supabase
        .from('phorest_appointments')
        .select('id, service_name, client_name, total_price, appointment_date, phorest_client_id, phorest_staff_id')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .eq('status', 'completed');

      if (completedError) throw completedError;

      // Get unique client IDs from completed appointments for POS lookup
      const completedClientIds = [...new Set(
        (completedData ?? [])
          .map(a => a.phorest_client_id)
          .filter((id): id is string => !!id)
      )];

      // Fetch POS transaction items for those clients in the date range
      let posItems: Array<{
        phorest_client_id: string | null;
        transaction_date: string;
        item_name: string;
        total_amount: number | null;
        tax_amount: number | null;
        discount: number | null;
        item_type: string;
      }> = [];

      if (completedClientIds.length > 0) {
        // Batch fetch in chunks of 100 to avoid query limits
        for (let i = 0; i < completedClientIds.length; i += 100) {
          const chunk = completedClientIds.slice(i, i + 100);
          const { data: posData, error: posError } = await supabase
            .from('phorest_transaction_items')
            .select('phorest_client_id, transaction_date, item_name, total_amount, tax_amount, discount, item_type')
            .in('phorest_client_id', chunk)
            .gte('transaction_date', dateFrom)
            .lte('transaction_date', dateTo)
            .in('item_type', ['service', 'sale_fee']);

          if (posError) throw posError;
          posItems = posItems.concat(posData ?? []);
        }
      }

      // Group completed appointments by client-day
      const clientDayScheduled = new Map<string, {
        clientName: string | null;
        services: string[];
        totalScheduled: number;
        appointmentDate: string;
        stylistName: string | null;
      }>();

      (completedData ?? []).forEach(a => {
        if (!a.phorest_client_id) return;
        const key = `${a.phorest_client_id}|${a.appointment_date}`;
        const existing = clientDayScheduled.get(key);
        const stylist = a.phorest_staff_id ? (staffLookup.get(a.phorest_staff_id) ?? null) : null;
        if (existing) {
          existing.services.push(a.service_name || 'Unknown service');
          existing.totalScheduled += Number(a.total_price) || 0;
          if (!existing.stylistName && stylist) existing.stylistName = stylist;
        } else {
          clientDayScheduled.set(key, {
            clientName: a.client_name ?? null,
            services: [a.service_name || 'Unknown service'],
            totalScheduled: Number(a.total_price) || 0,
            appointmentDate: a.appointment_date,
            stylistName: stylist,
          });
        }
      });

      // Group POS items by client-day
      const clientDayActual = new Map<string, {
        services: string[];
        totalActual: number;
        hasDiscount: boolean;
      }>();

      posItems.forEach(t => {
        if (!t.phorest_client_id) return;
        // Match transaction_date (may include time) to appointment_date
        const txDate = t.transaction_date.substring(0, 10);
        const key = `${t.phorest_client_id}|${txDate}`;
        const existing = clientDayActual.get(key);
        const amount = (Number(t.total_amount) || 0) + (Number(t.tax_amount) || 0);
        const hasDisc = (Number(t.discount) || 0) > 0;
        if (existing) {
          existing.services.push(t.item_name || 'Unknown');
          existing.totalActual += amount;
          if (hasDisc) existing.hasDiscount = true;
        } else {
          clientDayActual.set(key, {
            services: [t.item_name || 'Unknown'],
            totalActual: amount,
            hasDiscount: hasDisc,
          });
        }
      });

      // Compute per-client-day variances
      const varianceItems: PricingVarianceItem[] = [];
      clientDayScheduled.forEach((scheduled, key) => {
        const actual = clientDayActual.get(key);
        const actualAmount = actual?.totalActual ?? 0;
        const variance = scheduled.totalScheduled - actualAmount;

        // Only surface variances > $1
        if (variance > 1) {
          varianceItems.push({
            clientName: scheduled.clientName,
            scheduledServices: scheduled.services,
            actualServices: actual?.services ?? [],
            scheduledAmount: scheduled.totalScheduled,
            actualAmount,
            variance,
            appointmentDate: scheduled.appointmentDate,
            stylistName: scheduled.stylistName,
            hasDiscount: actual?.hasDiscount ?? false,
            noTransaction: !actual,
          });
        }
      });

      // Sort by variance descending
      varianceItems.sort((a, b) => b.variance - a.variance);

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

      const pricingVariances = {
        count: varianceItems.length,
        totalVariance: varianceItems.reduce((sum, v) => sum + v.variance, 0),
        items: varianceItems,
      };

      const gapAmount = expectedRevenue - actualRevenue;
      const gapPercent = expectedRevenue > 0 ? (gapAmount / expectedRevenue) * 100 : 0;
      const explainedGap = cancellations.lostRevenue + noShows.lostRevenue + pricingVariances.totalVariance;
      const unexplainedGap = Math.max(0, gapAmount - explainedGap);

      return {
        expectedRevenue,
        actualRevenue,
        gapAmount,
        gapPercent,
        cancellations,
        noShows,
        pricingVariances,
        unexplainedGap,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
