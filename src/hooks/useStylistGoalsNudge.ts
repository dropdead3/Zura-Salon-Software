import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
      if (!userId) return false;

      // Account age gate (>7 days)
      if (!createdAt) return false;
      const ageMs = Date.now() - new Date(createdAt).getTime();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (ageMs <= SEVEN_DAYS_MS) return false;

      const { data, error } = await supabase
        .from('stylist_personal_goals')
        .select('weekly_target, monthly_target')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return false;

      // No row yet → nudge.
      if (!data) return true;

      // Row exists but both targets are zero → nudge.
      const weekly = Number(data.weekly_target ?? 0);
      const monthly = Number(data.monthly_target ?? 0);
      return weekly === 0 && monthly === 0;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
