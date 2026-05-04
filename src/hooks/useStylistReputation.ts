/**
 * useStylistReputation — Per-stylist reputation scoring.
 * Aggregates client_feedback_responses + recovery_tasks per staff_user_id.
 *
 * Score (0-100): weighted blend of rating share (60%), NPS (25%), recovery rate (15%).
 * Suppresses scores for stylists with < 5 responses (signal preservation doctrine).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

const MIN_RESPONSES = 5;

export interface StylistReputationRow {
  staffUserId: string;
  staffName: string;
  responseCount: number;
  avgRating: number;
  nps: number;
  promoters: number;
  detractors: number;
  recoveryOpened: number;
  recoveryResolved: number;
  reputationScore: number | null; // null when below MIN_RESPONSES
}

export function useStylistReputation(days: number = 90, locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const locFilter = locationId && locationId !== 'all' ? locationId : undefined;

  return useQuery({
    queryKey: ['stylist-reputation', orgId, days, locFilter ?? 'all'],
    queryFn: async (): Promise<StylistReputationRow[]> => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const responses = await fetchAllBatched<{
        staff_user_id: string | null;
        overall_rating: number | null;
        nps_score: number | null;
      }>((from, to) => {
        let q = supabase
          .from('client_feedback_responses')
          .select('staff_user_id, overall_rating, nps_score')
          .eq('organization_id', orgId!)
          .gte('responded_at', since)
          .not('staff_user_id', 'is', null)
          .range(from, to);
        if (locFilter) q = q.eq('location_id', locFilter);
        return q;
      });

      let recoveryQ = supabase
        .from('recovery_tasks')
        .select('staff_user_id, status')
        .eq('organization_id', orgId!)
        .gte('created_at', since)
        .not('staff_user_id', 'is', null);
      if (locFilter) recoveryQ = recoveryQ.eq('location_id', locFilter);
      const { data: recovery } = await recoveryQ;

      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name');
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name || p.full_name || 'Unknown']));

      const buckets = new Map<string, {
        ratings: number[];
        nps: number[];
        recoveryOpened: number;
        recoveryResolved: number;
      }>();

      for (const r of responses) {
        if (!r.staff_user_id) continue;
        const b = buckets.get(r.staff_user_id) ?? { ratings: [], nps: [], recoveryOpened: 0, recoveryResolved: 0 };
        if (r.overall_rating != null) b.ratings.push(r.overall_rating);
        if (r.nps_score != null) b.nps.push(r.nps_score);
        buckets.set(r.staff_user_id, b);
      }
      for (const t of recovery ?? []) {
        if (!t.staff_user_id) continue;
        const b = buckets.get(t.staff_user_id) ?? { ratings: [], nps: [], recoveryOpened: 0, recoveryResolved: 0 };
        b.recoveryOpened += 1;
        if (['resolved', 'refunded', 'redo_booked', 'closed'].includes(t.status as string)) {
          b.recoveryResolved += 1;
        }
        buckets.set(t.staff_user_id, b);
      }

      const rows: StylistReputationRow[] = [];
      for (const [staffUserId, b] of buckets) {
        const responseCount = b.ratings.length;
        const avgRating = responseCount > 0 ? b.ratings.reduce((s, v) => s + v, 0) / responseCount : 0;
        const promoters = b.nps.filter((s) => s >= 9).length;
        const detractors = b.nps.filter((s) => s <= 6).length;
        const nps = b.nps.length > 0 ? Math.round(((promoters - detractors) / b.nps.length) * 100) : 0;
        const recoveryRate = b.recoveryOpened > 0 ? b.recoveryResolved / b.recoveryOpened : 1;

        let score: number | null = null;
        if (responseCount >= MIN_RESPONSES) {
          // 5★ → 100, NPS [-100..100] → [0..100], recovery [0..1] → [0..100]
          const ratingComponent = (avgRating / 5) * 100;
          const npsComponent = ((nps + 100) / 200) * 100;
          const recoveryComponent = recoveryRate * 100;
          score = Math.round(ratingComponent * 0.6 + npsComponent * 0.25 + recoveryComponent * 0.15);
        }

        rows.push({
          staffUserId,
          staffName: nameMap.get(staffUserId) || 'Unknown',
          responseCount,
          avgRating,
          nps,
          promoters,
          detractors,
          recoveryOpened: b.recoveryOpened,
          recoveryResolved: b.recoveryResolved,
          reputationScore: score,
        });
      }

      return rows.sort((a, b) => (b.reputationScore ?? -1) - (a.reputationScore ?? -1));
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
