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

  const { isLocationEntitled, isLoading: locLoading } =
    useBackroomLocationEntitlements(orgId);

  // If no locationId provided, fall back to org-level only (backward compat)
  if (!locationId) {
    return {
      isEntitled: orgEnabled,
      isLoading: orgLoading,
    };
  }

  // Dual check: org master switch + location entitlement
  return {
    isEntitled: orgEnabled && isLocationEntitled(locationId),
    isLoading: orgLoading || locLoading,
  };
}
