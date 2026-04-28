import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGodModeTargetUserId } from './useGodModeTargetUserId';

/**
 * Resolves "is the effective user the primary owner of the effective org?"
 *
 * In God Mode (platform impersonation), this resolves against the impersonation
 * target — i.e. the org's actual primary owner — so the dashboard renders the
 * `account_owner` canvas the real owner would see, not the platform admin's
 * fallback `leadership` canvas.
 */
export function useIsPrimaryOwner() {
  const { user } = useAuth();
  const { targetUserId } = useGodModeTargetUserId();
  const effectiveUserId = targetUserId || user?.id;

  return useQuery({
    queryKey: ['is-primary-owner', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return false;

      const { data, error } = await supabase
        .from('employee_profiles')
        .select('is_primary_owner')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (error) return false;
      return data?.is_primary_owner ?? false;
    },
    enabled: !!effectiveUserId,
  });
}
