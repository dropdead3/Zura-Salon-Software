/**
 * useStylistWorkDays — returns the union of `work_days` (Sun..Sat) across all
 * of a stylist's location schedules. Used by the rebook picker to detect
 * "Off this week" days so we never recommend a calmest day the stylist isn't
 * actually working.
 *
 * Doctrine: when no schedule is configured for the stylist, return an empty
 * set — the consumer should treat empty as "unknown, do not flag" rather
 * than "off every day". Silence on low confidence (Alerting Doctrine).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WeekdayToken = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export function useStylistWorkDays(stylistUserId: string | null) {
  const { data } = useQuery({
    queryKey: ['stylist-work-days', stylistUserId],
    queryFn: async () => {
      if (!stylistUserId) return new Set<WeekdayToken>();
      const { data: rows, error } = await supabase
        .from('employee_location_schedules')
        .select('work_days')
        .eq('user_id', stylistUserId);
      if (error) throw error;
      const set = new Set<WeekdayToken>();
      (rows || []).forEach((r: any) => {
        (r.work_days as string[] | null)?.forEach((d) => set.add(d as WeekdayToken));
      });
      return set;
    },
    enabled: !!stylistUserId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    workDays: data ?? new Set<WeekdayToken>(),
    /** True when a schedule exists for this stylist (i.e. data is meaningful). */
    hasSchedule: (data?.size ?? 0) > 0,
  };
}
