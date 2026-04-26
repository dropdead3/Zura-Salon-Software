import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * prefetchPostLogin — warms the React Query cache with the queries every
 * dashboard page needs for first paint:
 *   • ['user-preferences', userId] — drives layout + custom landing page
 *   • ['employee-profile', userId] — drives location access + role gates
 *
 * Called from login success handlers (UnifiedLogin email/password and
 * OrgBrandedLogin PIN) so by the time the dashboard route mounts the
 * data is already hot. Target: <50ms time-in-AuthFlowLoader on warm
 * sessions vs. 100–400ms before.
 *
 * Failures are swallowed — this is a latency optimization, not a
 * correctness contract. Downstream useQuery calls will refetch normally.
 *
 * The query keys here MUST match exactly what useDashboardLayout and
 * useEmployeeProfile use, otherwise the cache won't be hit.
 */
export function prefetchPostLogin(queryClient: QueryClient, userId: string): void {
  if (!userId) return;

  const prefetchUserPrefs = queryClient.prefetchQuery({
    queryKey: ['user-preferences', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const prefetchProfile = queryClient.prefetchQuery({
    queryKey: ['employee-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fire-and-forget — never block navigation on prefetch.
  Promise.allSettled([prefetchUserPrefs, prefetchProfile]).catch(() => {});
}
