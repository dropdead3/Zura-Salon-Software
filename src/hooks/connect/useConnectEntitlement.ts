import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Checks whether the current organization has Zura Connect enabled.
 * Uses the organization_feature_flags system with key 'connect_enabled'.
 * Mirrors the Color Bar entitlement pattern.
 */
export function useConnectEntitlement() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();

  // Fallback org resolution (same pattern as Color Bar)
  const { data: fallbackOrgId } = useQuery({
    queryKey: ['connect-org-fallback', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.organization_id ?? null;
    },
    enabled: !!user?.id && !effectiveOrganization?.id,
    staleTime: 1000 * 60 * 10,
  });

  const orgId = effectiveOrganization?.id ?? fallbackOrgId ?? undefined;

  const { data: isEntitled = false, isLoading } = useQuery({
    queryKey: ['connect-entitlement', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .select('is_enabled')
        .eq('organization_id', orgId!)
        .eq('flag_key', 'connect_enabled')
        .maybeSingle();
      if (error) throw error;
      return data?.is_enabled ?? false;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  return { isEntitled, isLoading };
}
