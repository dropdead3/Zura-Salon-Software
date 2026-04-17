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
import {
  useColorBarLocationEntitlements,
  type ColorBarLocationEntitlement,
} from './useColorBarLocationEntitlements';
import { useColorBarOrgId } from './useColorBarOrgId';

export function useReconciliationFlaggedLocations() {
  const orgId = useColorBarOrgId();
  const { entitlements, isLoading } = useColorBarLocationEntitlements(orgId);

  const flagged = useMemo<ColorBarLocationEntitlement[]>(
    () => entitlements.filter((e) => e.requires_inventory_reconciliation),
    [entitlements],
  );

  const flaggedSet = useMemo<Set<string>>(
    () => new Set(flagged.map((e) => e.location_id)),
    [flagged],
  );

  /** Strict-typed; pass `null`/`undefined` to short-circuit safely. */
  const isFlagged = (locationId?: string | null): boolean => {
    if (!locationId) return false;
    return flaggedSet.has(locationId);
  };

  return {
    /** Full entitlement rows currently flagged for reconciliation. */
    flagged,
    /** Set of location IDs only — handy for filter operations. */
    flaggedLocationIds: flaggedSet,
    isFlagged,
    hasAnyFlagged: flaggedSet.size > 0,
    isLoading,
  };
}
