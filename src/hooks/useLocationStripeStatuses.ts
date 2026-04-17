import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * useLocationStripeStatuses — bulk-fetch Stripe Connect status for a list of
 * visible locations in one query. Mirrors the `useAppointmentDeclinedReasons`
 * pattern: stable cache key (sorted ids), single network round-trip, returns
 * a Map keyed by location_id for O(1) lookup at the call site.
 *
 * Used by calendar surfaces to render a "Setup needed" pill on appointment
 * cards for any location whose Stripe Connect onboarding is incomplete —
 * surfaces the constraint *before* the operator opens checkout.
 */
export interface LocationStripeStatus {
  active: boolean;
  status: string;
}

export function useLocationStripeStatuses(locationIds: (string | null | undefined)[]) {
  // Filter, dedupe, sort for a stable cache key
  const cleanIds = Array.from(
    new Set(locationIds.filter((id): id is string => !!id))
  ).sort();
  const keyHash = cleanIds.join(',');

  return useQuery({
    queryKey: ['location-stripe-status', keyHash],
    queryFn: async (): Promise<Map<string, LocationStripeStatus>> => {
      if (cleanIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from('locations')
        .select('id, stripe_status, stripe_payments_enabled')
        .in('id', cleanIds);

      if (error) {
        console.warn('[useLocationStripeStatuses] query failed', error);
        return new Map();
      }

      const map = new Map<string, LocationStripeStatus>();
      for (const row of data ?? []) {
        const status = (row.stripe_status as string | null) ?? 'not_connected';
        const paymentsEnabled = (row.stripe_payments_enabled as boolean | null) ?? false;
        map.set(row.id as string, {
          status,
          active: status === 'active' && paymentsEnabled,
        });
      }
      return map;
    },
    enabled: cleanIds.length > 0,
    staleTime: 60_000,
  });
}
