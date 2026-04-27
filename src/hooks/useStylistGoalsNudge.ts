import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const STYLIST_GOALS_NUDGE_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure gate function (testable). Returns true when the stylist should see
 * the empty-goals coach nudge.
 *
 * Inputs are explicit so the function is deterministic and side-effect free.
 */
export function shouldShowStylistGoalsNudge(args: {
  accountCreatedAt: string | null | undefined;
  goals: { weekly_target: number | null; monthly_target: number | null } | null;
  now?: number;
}): boolean {
  const now = args.now ?? Date.now();
  if (!args.accountCreatedAt) return false;
  const ageMs = now - new Date(args.accountCreatedAt).getTime();
  if (ageMs <= STYLIST_GOALS_NUDGE_MIN_AGE_MS) return false;
  if (!args.goals) return true;
  const weekly = Number(args.goals.weekly_target ?? 0);
  const monthly = Number(args.goals.monthly_target ?? 0);
  return weekly === 0 && monthly === 0;
}


/**
 * Stylist Privacy Contract — coach nudge signal.
 *
 * Returns `true` when the viewing stylist has not yet set personal sales
 * targets AND their account is more than 7 days old. Silence is valid output:
 * brand-new stylists are not nagged during onboarding (alert-fatigue
 * doctrine).
 *
 * Reads only the viewer's own `stylist_personal_goals` row (RLS-scoped).
 * No org-wide, peer, or financial data is touched.
 */
export function useStylistGoalsNudge(enabled: boolean) {
  const { user } = useAuth();
  const userId = user?.id;
  const createdAt = user?.created_at;

  return useQuery({
    queryKey: ['stylist-goals-nudge', userId],
    queryFn: async () => {
      if (!userId || !createdAt) return false;

      // Cheap account-age gate before hitting the DB.
      const ageMs = Date.now() - new Date(createdAt).getTime();
      if (ageMs <= STYLIST_GOALS_NUDGE_MIN_AGE_MS) return false;

      const { data, error } = await supabase
        .from('stylist_personal_goals')
        .select('weekly_target, monthly_target')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return false;

      return shouldShowStylistGoalsNudge({
        accountCreatedAt: createdAt,
        goals: data
          ? { weekly_target: data.weekly_target as number | null, monthly_target: data.monthly_target as number | null }
          : null,
      });
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
