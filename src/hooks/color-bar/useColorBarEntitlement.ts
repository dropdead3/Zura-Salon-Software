import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';

/**
 * Checks whether the current organization has Backroom enabled.
 * Uses the organization_feature_flags system with key 'backroom_enabled'.
 *
 * When `locationId` is provided, also checks the per-location entitlement table.
 * Both the org-level flag AND the location entitlement must be active.
 */
export function useBackroomEntitlement(locationId?: string) {
  const orgId = useBackroomOrgId();

  const { data: orgEnabled = false, isLoading: orgLoading } = useQuery({
    queryKey: ['backroom-org-flag', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .select('is_enabled')
        .eq('organization_id', orgId!)
        .eq('flag_key', 'backroom_enabled')
        .maybeSingle();
      if (error) throw error;
      return data?.is_enabled ?? false;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const { isLocationEntitled, isLoading: locLoading, activeCount } =
    useBackroomLocationEntitlements(orgId);

  // If no locationId provided, require org flag AND at least one active location
  if (!locationId) {
    return {
      isEntitled: orgEnabled && activeCount > 0,
      isLoading: orgLoading || locLoading,
      /** Org master switch is on but no locations have been activated */
      isPendingActivation: orgEnabled && !locLoading && activeCount === 0,
    };
  }

  // Dual check: org master switch + location entitlement
  return {
    isEntitled: orgEnabled && isLocationEntitled(locationId),
    isLoading: orgLoading || locLoading,
    isPendingActivation: false,
  };
}
