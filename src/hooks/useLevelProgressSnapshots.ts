import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, startOfMonth, subMonths } from 'date-fns';
import type { TeamMemberProgress } from './useTeamLevelProgress';

/** Get the first of the current month as YYYY-MM-DD */
function currentMonthKey(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
}

/**
 * Writes current month's composite scores for all team members.
 * Deduped by the unique constraint (org, user, month) — upserts on conflict.
 */
export function useWriteLevelSnapshots(teamProgress: TeamMemberProgress[]) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const hasWritten = useRef(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (members: TeamMemberProgress[]) => {
      if (!orgId || members.length === 0) return;

      const monthKey = currentMonthKey();
      const rows = members
        .filter(m => m.currentLevel && m.status !== 'at_top_level')
        .map(m => ({
          organization_id: orgId,
          user_id: m.userId,
          stylist_level_id: m.currentLevel!.id,
          composite_score: m.compositeScore,
          criteria_snapshot: m.criteriaProgress,
          snapshot_month: monthKey,
        }));

      if (rows.length === 0) return;

      const { error } = await supabase
        .from('level_progress_snapshots')
        .upsert(rows, { onConflict: 'organization_id,user_id,snapshot_month' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-progress-snapshots', orgId] });
    },
  });

  useEffect(() => {
    if (!hasWritten.current && teamProgress.length > 0 && orgId) {
      hasWritten.current = true;
      mutation.mutate(teamProgress);
    }
  }, [teamProgress, orgId]);
}

/**
 * Reads historical snapshots for all team members going back N months.
 * Returns a map of userId → snapshot[] sorted by month ascending.
 */
export function useReadLevelSnapshots(months = 6) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const sinceDate = format(startOfMonth(subMonths(new Date(), months)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['level-progress-snapshots', orgId, months],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_progress_snapshots')
        .select('user_id, composite_score, snapshot_month')
        .eq('organization_id', orgId!)
        .gte('snapshot_month', sinceDate)
        .order('snapshot_month', { ascending: true });

      if (error) throw error;

      // Group by user_id
      const map = new Map<string, { compositeScore: number; snapshotMonth: string }[]>();
      for (const row of data ?? []) {
        const key = row.user_id;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({
          compositeScore: Number(row.composite_score),
          snapshotMonth: row.snapshot_month,
        });
      }
      return map;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Determines if a stylist is stalled based on snapshot history.
 * Returns true if their score delta over the lookback period is <= threshold.
 * Falls back to null if insufficient data.
 */
export function isSnapshotStalled(
  snapshots: { compositeScore: number; snapshotMonth: string }[] | undefined,
  currentScore: number,
  deltaThreshold = 2,
): boolean | null {
  if (!snapshots || snapshots.length === 0) return null; // no history → can't determine

  const oldest = snapshots[0];
  const delta = currentScore - oldest.compositeScore;
  return delta <= deltaThreshold;
}
