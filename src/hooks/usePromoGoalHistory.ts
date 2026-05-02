/**
 * PR 4 enhancement — Goal history hook.
 *
 * Reads the last N rows of `promo_goal_runs` for the current org + offer
 * code so the editor can render the recalibration nudge ("last 3 promos
 * all hit cap in <48h"). Also exposes a one-shot `recordGoalHit` mutation
 * called by `PromoGoalCard` when it observes a fresh cap-hit.
 *
 * Tenant scoping: every query/mutation includes `organization_id`. RLS on
 * `promo_goal_runs` enforces the same — defense in depth.
 *
 * Honest silence: returns an empty array when no history yet (NOT a loading
 * placeholder); the caller's `summarizeGoalHistory` resolver handles the
 * "below materiality threshold" case.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import type { PromoGoalRun } from '@/lib/promo-goal-velocity';

const HISTORY_LIMIT = 10;

export function usePromoGoalHistory(
  offerCode: string | null | undefined,
  explicitOrgId?: string,
) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const code = (offerCode ?? '').trim();

  return useQuery<PromoGoalRun[]>({
    queryKey: ['promo-goal-history', orgId, code],
    queryFn: async () => {
      if (!orgId || !code) return [];
      const { data, error } = await supabase
        .from('promo_goal_runs')
        .select(
          'id, offer_code, cap, redemptions_at_hit, started_at, hit_at, days_taken',
        )
        .eq('organization_id', orgId)
        .eq('offer_code', code)
        .order('hit_at', { ascending: false })
        .limit(HISTORY_LIMIT);
      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id as string,
        offerCode: row.offer_code as string,
        cap: row.cap as number,
        redemptionsAtHit: row.redemptions_at_hit as number,
        startedAt: (row.started_at as string | null) ?? null,
        hitAt: row.hit_at as string,
        daysTaken:
          row.days_taken === null || row.days_taken === undefined
            ? null
            : Number(row.days_taken),
      }));
    },
    enabled: !!orgId && code.length > 0,
    staleTime: 60_000,
  });
}

export interface RecordGoalHitInput {
  offerCode: string;
  cap: number;
  redemptionsAtHit: number;
  /** ISO timestamp of when the goal cap was set on the popup. Null when
   *  unknown (operator didn't have started_at tracking earlier). */
  startedAt: string | null;
}

export function useRecordGoalHit(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordGoalHitInput) => {
      if (!orgId) throw new Error('No organization context');
      const code = input.offerCode.trim();
      if (!code) throw new Error('Offer code required');
      // days_taken: ceil((now - startedAt) / 1 day). Null when unknown.
      const startedAtMs = input.startedAt ? new Date(input.startedAt).getTime() : null;
      const daysTaken =
        startedAtMs && !Number.isNaN(startedAtMs)
          ? Math.max(0, (Date.now() - startedAtMs) / (24 * 60 * 60 * 1000))
          : null;
      const { error } = await supabase.from('promo_goal_runs').insert({
        organization_id: orgId,
        offer_code: code,
        cap: input.cap,
        redemptions_at_hit: input.redemptionsAtHit,
        started_at: input.startedAt,
        days_taken: daysTaken,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['promo-goal-history', orgId, input.offerCode.trim()],
      });
    },
  });
}
