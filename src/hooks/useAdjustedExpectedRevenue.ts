import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface AdjustedExpectedResult {
  adjustedExpected: number;
  originalExpected: number;
  resolvedCount: number;
  pendingCount: number;
  completedActualRevenue: number;
  completedScheduledRevenue: number;
  pendingScheduledRevenue: number;
  pendingExpectedRevenue: number;
  cancelledCount: number;
  noShowCount: number;
  discountedAppointmentCount: number;
  totalDiscountAmount: number;
}

/**
 * Computes a real-time "adjusted expected" revenue for today by blending:
 * - Actual POS revenue for completed appointments
 * - Scheduled price for pending/in-progress appointments
 * - $0 for cancelled / no-show appointments
 *
 * Only meaningful for "today" — past ranges should use useScheduledRevenue.
 */
export function useAdjustedExpectedRevenue(
  locationId?: string | null,
  enabled = true
) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return useQuery<AdjustedExpectedResult>({
    queryKey: ['adjusted-expected-revenue', todayStr, locationId],
    queryFn: async () => {
      // 1. Fetch all today's appointments
      let apptQuery = supabase
        .from('phorest_appointments')
        .select('id, phorest_client_id, total_price, expected_price, discount_amount, status, location_id')
        .eq('appointment_date', todayStr)
        .not('total_price', 'is', null);

      if (locationId && locationId !== 'all') {
        apptQuery = apptQuery.eq('location_id', locationId);
      }

      const { data: appointments, error: apptError } = await apptQuery;
      if (apptError) throw apptError;

      const allAppts = appointments ?? [];

      // Partition by status
      const resolved = allAppts.filter(a => a.status === 'completed');
      const pending = allAppts.filter(a =>
        a.status && ['booked', 'confirmed', 'arrived', 'started', 'pending', 'in_progress'].includes(a.status)
      );
      const cancelled = allAppts.filter(a => a.status === 'cancelled');
      const noShow = allAppts.filter(a => a.status === 'no_show');

      // Helper: get expected price (discount-aware) for an appointment
      const getExpectedPrice = (a: typeof allAppts[0]) => Number(a.expected_price) || Number(a.total_price) || 0;

      // Original expected = sum of ALL appointments' full price (for reference)
      const originalExpected = allAppts.reduce((s, a) => s + (Number(a.total_price) || 0), 0);

      // Pending scheduled revenue (not yet completed) — uses full price
      const pendingScheduledRevenue = pending.reduce((s, a) => s + (Number(a.total_price) || 0), 0);

      // Pending expected revenue — uses discount-adjusted price
      const pendingExpectedRevenue = pending.reduce((s, a) => s + getExpectedPrice(a), 0);

      // Count discounted appointments and total discount amount
      const discountedAppts = allAppts.filter(a => (Number(a.discount_amount) || 0) > 0);
      const discountedAppointmentCount = discountedAppts.length;
      const totalDiscountAmount = discountedAppts.reduce((s, a) => s + (Number(a.discount_amount) || 0), 0);

      // 2. For completed appointments, get actual POS revenue
      const completedClientIds = [
        ...new Set(resolved.map(a => a.phorest_client_id).filter((id): id is string => !!id))
      ];

      let completedActualRevenue = 0;

      if (completedClientIds.length > 0) {
        // Fetch POS transaction items for these clients today
        for (let i = 0; i < completedClientIds.length; i += 100) {
          const chunk = completedClientIds.slice(i, i + 100);
          let posQuery = supabase
            .from('phorest_transaction_items')
            .select('total_amount, tax_amount')
            .in('phorest_client_id', chunk)
            .gte('transaction_date', todayStr)
            .lte('transaction_date', todayStr);

          if (locationId && locationId !== 'all') {
            posQuery = posQuery.eq('location_id', locationId);
          }

          const { data: posData, error: posError } = await posQuery;
          if (posError) throw posError;

          completedActualRevenue += (posData ?? []).reduce(
            (s, t) => s + (Number(t.total_amount) || 0) + (Number(t.tax_amount) || 0),
            0
          );
        }
      }

      // For completed appointments with no client ID (walk-ins), fall back to scheduled price
      const walkInCompleted = resolved.filter(a => !a.phorest_client_id);
      const walkInRevenue = walkInCompleted.reduce((s, a) => s + (Number(a.total_price) || 0), 0);
      completedActualRevenue += walkInRevenue;

      // Sum of total_price for completed appointments (what was originally on the books)
      const completedScheduledRevenue = resolved.reduce((s, a) => s + (Number(a.total_price) || 0), 0);

      // Adjusted expected uses discount-aware pending price
      const adjustedExpected = completedActualRevenue + pendingExpectedRevenue;

      return {
        adjustedExpected,
        originalExpected,
        resolvedCount: resolved.length,
        pendingCount: pending.length,
        completedActualRevenue,
        completedScheduledRevenue,
        pendingScheduledRevenue,
        pendingExpectedRevenue,
        cancelledCount: cancelled.length,
        noShowCount: noShow.length,
        discountedAppointmentCount,
        totalDiscountAmount,
      };
    },
    enabled,
    staleTime: 30 * 1000, // 30s — real-time-ish
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}
