import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type EmployeeProfile = Database['public']['Tables']['employee_profiles']['Row'];

/**
 * Fetches the employee profile for the ACTUAL signed-in user, ignoring any
 * View As / impersonation state.
 *
 * Use this on platform surfaces (sidebar, header, platform overview) where
 * the chrome must always reflect the real super-admin identity — impersonation
 * is an organization-scoped concept and must never bleed into platform chrome.
 *
 * Cache key is intentionally distinct from `useEmployeeProfile` so that
 * exiting View As immediately reflects the real identity without stale-cache
 * collisions.
 */
export function useActualEmployeeProfile() {
  const { user } = useAuth();
  const actualUserId = user?.id;

  return useQuery({
    queryKey: ['employee-profile-actual', actualUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', actualUserId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as EmployeeProfile | null;
    },
    enabled: !!actualUserId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
