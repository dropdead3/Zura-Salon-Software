/**
 * useScheduleDayCapacity — lightweight per-day capacity signal for the
 * rebook calendar. Returns a Map keyed by 'yyyy-MM-dd' with appointment
 * counts and a coarse load classification (light / moderate / heavy / full).
 *
 * Doctrine: this is a *signal* surface, not an analytics surface. We do not
 * compute exact stylist utilization here — the goal is to nudge the operator
 * toward calmer days while rebooking. Thresholds are intentionally generous
 * and tunable from a single place.
 *
 * When `stylistUserId` is provided, the load reflects only that stylist's
 * book — which is the load that actually matters when rebooking with a
 * preferred provider. Thresholds shift down accordingly because a single
 * stylist's day caps out around 8–12 appointments.
 */

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type DayLoad = 'light' | 'moderate' | 'heavy' | 'full';

export interface DayCapacity {
  date: string;            // yyyy-MM-dd
  apptCount: number;       // total non-cancelled appointments
  load: DayLoad;
}

interface CapacityOptions {
  /** When set, capacity reflects only this stylist's book. */
  stylistUserId?: string | null;
}

// Thresholds are coarse on purpose — see header doctrine.
function classifyOrg(count: number): DayLoad {
  if (count >= 60) return 'full';
  if (count >= 40) return 'heavy';
  if (count >= 20) return 'moderate';
  return 'light';
}

function classifyStylist(count: number): DayLoad {
  if (count >= 9) return 'full';
  if (count >= 7) return 'heavy';
  if (count >= 4) return 'moderate';
  return 'light';
}

export function useScheduleDayCapacity(
  startDate: Date,
  endDate: Date,
  options: CapacityOptions = {},
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const stylistUserId = options.stylistUserId ?? null;

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: [
      'schedule-day-capacity',
      orgId,
      startStr,
      endStr,
      stylistUserId ?? 'org',
    ],
    queryFn: async () => {
      let query = supabase
        .from('v_all_appointments' as any)
        .select('appointment_date, status, stylist_user_id')
        .eq('organization_id', orgId!)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr)
        .eq('is_demo', false)
        .neq('status', 'cancelled')
        .neq('status', 'no_show');

      if (stylistUserId) {
        query = query.eq('stylist_user_id', stylistUserId);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      const counts = new Map<string, number>();
      (rows || []).forEach((r: any) => {
        const d = r.appointment_date as string;
        counts.set(d, (counts.get(d) || 0) + 1);
      });

      const classify = stylistUserId ? classifyStylist : classifyOrg;
      const map = new Map<string, DayCapacity>();
      counts.forEach((count, date) => {
        map.set(date, { date, apptCount: count, load: classify(count) });
      });
      return map;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    capacityMap: data ?? new Map<string, DayCapacity>(),
    isLoading,
    /** True when the returned signal is filtered to a single stylist. */
    isStylistScoped: !!stylistUserId,
  };
}
