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
  awaitingCheckoutCount: number;
  awaitingCheckoutRevenue: number;
}

/**
 * Computes a real-time "adjusted expected" revenue for today by blending:
 * - Actual POS revenue for completed appointments
 * - Scheduled price (minus tips) for pending/in-progress appointments
 * - Scheduled price (minus tips) for completed appointments awaiting checkout
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
        .select('id, phorest_client_id, total_price, expected_price, discount_amount, tip_amount, status, location_id')
        .eq('appointment_date', todayStr)
        .not('total_price', 'is', null);

      if (locationId && locationId !== 'all') {
        apptQuery = apptQuery.eq('location_id', locationId);
      }

      const { data: appointments, error: apptError } = await apptQuery;
      if (apptError) throw apptError;

      const allAppts = appointments ?? [];

      // Helper: get price minus tips
      const getPriceExTips = (a: typeof allAppts[0]) => (Number(a.total_price) || 0) - (Number(a.tip_amount) || 0);

      // Helper: get expected price (discount-aware, tip-excluded) for an appointment
      const getExpectedPrice = (a: typeof allAppts[0]) => {
        const expected = Number(a.expected_price) || 0;
        if (expected > 0) return expected - (Number(a.tip_amount) || 0);
        return getPriceExTips(a);
      };

      // Partition by status
      const resolved = allAppts.filter(a => a.status === 'completed');
      const pending = allAppts.filter(a =>
        a.status && ['booked', 'confirmed', 'arrived', 'started', 'pending', 'in_progress'].includes(a.status)
      );
      const cancelled = allAppts.filter(a => a.status === 'cancelled');
      const noShow = allAppts.filter(a => a.status === 'no_show');

      // Original expected = sum of ALL appointments' price ex tips (for reference)
      const originalExpected = allAppts.reduce((s, a) => s + getPriceExTips(a), 0);

      // Pending scheduled revenue (not yet completed) — uses full price ex tips
      const pendingScheduledRevenue = pending.reduce((s, a) => s + getPriceExTips(a), 0);

      // Pending expected revenue — uses discount-adjusted price ex tips
      const pendingExpectedRevenue = pending.reduce((s, a) => s + getExpectedPrice(a), 0);

      // Count discounted appointments and total discount amount
      const discountedAppts = allAppts.filter(a => (Number(a.discount_amount) || 0) > 0);
      const discountedAppointmentCount = discountedAppts.length;
      const totalDiscountAmount = discountedAppts.reduce((s, a) => s + (Number(a.discount_amount) || 0), 0);

      // 2. For completed appointments, get actual POS revenue
      const completedClientIds = [
        ...new Set(resolved.map(a => a.phorest_client_id).filter((id): id is string => !!id))
      ];

      // Track which client IDs actually have POS data
      const clientsWithPOS = new Set<string>();
      let completedActualRevenue = 0;

      if (completedClientIds.length > 0) {
        // Fetch POS transaction items for these clients today
        for (let i = 0; i < completedClientIds.length; i += 100) {
          const chunk = completedClientIds.slice(i, i + 100);
          let posQuery = supabase
            .from('phorest_transaction_items')
            .select('total_amount, tax_amount, phorest_client_id')
            .in('phorest_client_id', chunk)
            .gte('transaction_date', todayStr)
            .lte('transaction_date', todayStr);

          if (locationId && locationId !== 'all') {
            posQuery = posQuery.eq('location_id', locationId);
          }

          const { data: posData, error: posError } = await posQuery;
          if (posError) throw posError;

          (posData ?? []).forEach(t => {
            completedActualRevenue += (Number(t.total_amount) || 0) + (Number(t.tax_amount) || 0);
            if (t.phorest_client_id) clientsWithPOS.add(t.phorest_client_id);
          });
        }
      }

      // For completed appointments with no client ID (walk-ins), fall back to scheduled price ex tips
      const walkInCompleted = resolved.filter(a => !a.phorest_client_id);
      const walkInRevenue = walkInCompleted.reduce((s, a) => s + getPriceExTips(a), 0);
      completedActualRevenue += walkInRevenue;

      // Identify completed appointments awaiting checkout (have client ID but no POS data)
      const awaitingCheckout = resolved.filter(a => a.phorest_client_id && !clientsWithPOS.has(a.phorest_client_id));
      const awaitingCheckoutCount = awaitingCheckout.length;
      const awaitingCheckoutRevenue = awaitingCheckout.reduce((s, a) => s + getExpectedPrice(a), 0);

      // Sum of total_price ex tips for completed appointments (what was originally on the books)
      const completedScheduledRevenue = resolved.reduce((s, a) => s + getPriceExTips(a), 0);

      // Adjusted expected uses: actual POS + awaiting checkout + pending
      const adjustedExpected = completedActualRevenue + awaitingCheckoutRevenue + pendingExpectedRevenue;

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
        awaitingCheckoutCount,
        awaitingCheckoutRevenue,
      };
    },
    enabled,
    staleTime: 30 * 1000, // 30s — real-time-ish
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}
