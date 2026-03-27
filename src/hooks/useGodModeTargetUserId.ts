import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Resolves the target user ID for dashboard layout persistence.
 * In God Mode, returns the org's primary owner user_id.
 * Otherwise, returns the current authenticated user's ID.
 */
export function useGodModeTargetUserId(): string | undefined {
  const { user } = useAuth();
  const { isImpersonating, selectedOrganization } = useOrganizationContext();

  const { data: ownerUserId } = useQuery({
    queryKey: ['org-primary-owner', selectedOrganization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id')
        .eq('organization_id', selectedOrganization!.id)
        .eq('is_primary_owner', true)
        .maybeSingle();
      return data?.user_id ?? null;
    },
    enabled: isImpersonating && !!selectedOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (!isImpersonating) return user?.id;
  return ownerUserId ?? user?.id;
}
