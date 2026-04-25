/**
 * useScheduleDayCapacity — lightweight per-day capacity signal for the
 * rebook calendar. Returns a Map keyed by 'yyyy-MM-dd' with appointment
 * counts and a coarse load classification (light / moderate / heavy / full).
 *
 * Doctrine: this is a *signal* surface, not an analytics surface. We do not
 * compute exact stylist utilization here — the goal is to nudge the operator
 * toward calmer days while rebooking. Thresholds are intentionally generous
 * and tunable from a single place.
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

// Thresholds are coarse on purpose — see header doctrine.
function classify(count: number): DayLoad {
  if (count >= 60) return 'full';
  if (count >= 40) return 'heavy';
  if (count >= 20) return 'moderate';
  return 'light';
}

export function useScheduleDayCapacity(startDate: Date, endDate: Date) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['schedule-day-capacity', orgId, startStr, endStr],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('v_all_appointments' as any)
        .select('appointment_date, status')
        .eq('organization_id', orgId!)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr)
        .eq('is_demo', false)
        .neq('status', 'cancelled')
        .neq('status', 'no_show');

      if (error) throw error;

      const counts = new Map<string, number>();
      (rows || []).forEach((r: any) => {
        const d = r.appointment_date as string;
        counts.set(d, (counts.get(d) || 0) + 1);
      });

      const map = new Map<string, DayCapacity>();
      counts.forEach((count, date) => {
        map.set(date, { date, apptCount: count, load: classify(count) });
      });
      return map;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  return { capacityMap: data ?? new Map<string, DayCapacity>(), isLoading };
}
