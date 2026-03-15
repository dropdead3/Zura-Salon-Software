import { useOrganizationFeature } from '@/hooks/useOrganizationFeature';

/**
 * Checks whether the current organization has Backroom enabled.
 * Uses the organization_feature_flags system with key 'backroom_enabled'.
 */
export function useBackroomEntitlement() {
  const { isEnabled, isLoading } = useOrganizationFeature('backroom_enabled');

  return {
    isEntitled: isEnabled,
    isLoading,
  };
}
