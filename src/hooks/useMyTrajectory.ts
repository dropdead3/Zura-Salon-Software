/**
 * useMyTrajectory — Last 8 weeks of personal booked revenue + retail
 * for the authenticated stylist.
 *
 * Stylist Privacy Contract: scoped strictly by stylist_user_id. No
 * peer or org-wide aggregation.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export interface TrajectoryPoint {
  weekStart: string;
  weekLabel: string;
  serviceRevenue: number;
  retailRevenue: number;
  appointments: number;
}

const WEEKS = 8;

export function useMyTrajectory() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const userId = user?.id;

  return useQuery<TrajectoryPoint[]>({
    queryKey: ['my-trajectory', orgId, userId, WEEKS],
    queryFn: async () => {
      if (!userId || !orgId) return [];

      const today = new Date();
      const earliest = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 });
      const latest = endOfWeek(today, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from('v_all_appointments' as any)
        .select('appointment_date, total_price, tip_amount, retail_total, status')
        .eq('stylist_user_id', userId)
        .gte('appointment_date', format(earliest, 'yyyy-MM-dd'))
        .lte('appointment_date', format(latest, 'yyyy-MM-dd'))
        .not('status', 'in', '("cancelled","no_show")')
        .eq('is_demo', false);

      if (error) throw error;

      const buckets: TrajectoryPoint[] = [];
      for (let i = WEEKS - 1; i >= 0; i--) {
        const ws = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
        buckets.push({
          weekStart: format(ws, 'yyyy-MM-dd'),
          weekLabel: format(ws, 'MMM d'),
          serviceRevenue: 0,
          retailRevenue: 0,
          appointments: 0,
        });
      }

      for (const row of (data || []) as any[]) {
        const apptDate = new Date(row.appointment_date);
        const ws = startOfWeek(apptDate, { weekStartsOn: 1 });
        const key = format(ws, 'yyyy-MM-dd');
        const bucket = buckets.find((b) => b.weekStart === key);
        if (!bucket) continue;
        const service =
          (Number(row.total_price) || 0) - (Number(row.tip_amount) || 0) - (Number(row.retail_total) || 0);
        bucket.serviceRevenue += Math.max(0, service);
        bucket.retailRevenue += Number(row.retail_total) || 0;
        bucket.appointments += 1;
      }

      return buckets;
    },
    enabled: !!userId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
