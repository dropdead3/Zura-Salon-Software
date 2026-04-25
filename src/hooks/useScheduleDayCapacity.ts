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
export type TimeBand = 'morning' | 'afternoon' | 'evening';

export interface DayCapacity {
  date: string;            // yyyy-MM-dd
  apptCount: number;       // total non-cancelled appointments
  load: DayLoad;
  /**
   * Per-band appointment counts. Present only when the query is stylist-scoped
   * (i.e. options.stylistUserId is set) — that's the only context where bands
   * carry meaningful signal for the rebook UI.
   */
  bands?: Record<TimeBand, number>;
}

function bandOf(startTime: string): TimeBand {
  const h = parseInt(startTime.split(':')[0] ?? '0', 10);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
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
      // Pull start_time too when stylist-scoped so we can bucket per band.
      const selectCols = stylistUserId
        ? 'appointment_date, status, stylist_user_id, start_time'
        : 'appointment_date, status, stylist_user_id';

      let query = supabase
        .from('v_all_appointments' as any)
        .select(selectCols)
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
      const bandCounts = new Map<string, Record<TimeBand, number>>();
      (rows || []).forEach((r: any) => {
        const d = r.appointment_date as string;
        counts.set(d, (counts.get(d) || 0) + 1);
        if (stylistUserId && r.start_time) {
          const b = bandOf(r.start_time as string);
          const cur = bandCounts.get(d) || { morning: 0, afternoon: 0, evening: 0 };
          cur[b]++;
          bandCounts.set(d, cur);
        }
      });

      const classify = stylistUserId ? classifyStylist : classifyOrg;
      const map = new Map<string, DayCapacity>();
      counts.forEach((count, date) => {
        const entry: DayCapacity = { date, apptCount: count, load: classify(count) };
        if (stylistUserId) {
          entry.bands = bandCounts.get(date) || { morning: 0, afternoon: 0, evening: 0 };
        }
        map.set(date, entry);
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
