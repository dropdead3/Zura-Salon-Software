import { useOrganizationFeature } from '@/hooks/useOrganizationFeature';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Checks whether the current organization has Backroom enabled.
 * Uses the organization_feature_flags system with key 'backroom_enabled'.
 *
 * When `locationId` is provided, also checks the per-location entitlement table.
 * Both the org-level flag AND the location entitlement must be active.
 */
export function useBackroomEntitlement(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { isEnabled: orgEnabled, isLoading: orgLoading } =
    useOrganizationFeature('backroom_enabled');

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
