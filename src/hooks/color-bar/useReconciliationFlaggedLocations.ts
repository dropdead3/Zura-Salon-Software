/**
 * useReconciliationFlaggedLocations — Returns the set of location IDs
 * for the active org whose Color Bar entitlements are currently flagged
 * `requires_inventory_reconciliation = true`.
 *
 * Doctrine: data integrity gate. Consumed by alert hooks (supply-low,
 * formula-cost-drift) to suppress recommendations until a physical
 * inventory recount restores trust in tracked quantities.
 */

import { useMemo } from 'react';
import { useColorBarLocationEntitlements } from './useColorBarLocationEntitlements';
import { useColorBarOrgId } from './useColorBarOrgId';

export function useReconciliationFlaggedLocations() {
  const orgId = useColorBarOrgId();
  const { entitlements, isLoading } = useColorBarLocationEntitlements(orgId);

  const flaggedSet = useMemo(() => {
    return new Set(
      entitlements
        .filter((e) => e.requires_inventory_reconciliation)
        .map((e) => e.location_id),
    );
  }, [entitlements]);

  const isFlagged = (locationId?: string | null) => {
    if (!locationId) return false;
    return flaggedSet.has(locationId);
  };

  return {
    flaggedLocationIds: flaggedSet,
    isFlagged,
    hasAnyFlagged: flaggedSet.size > 0,
    isLoading,
  };
}
