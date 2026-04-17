/**
 * InventoryReconciliationBanner — Calm advisory banner shown on Color Bar
 * surfaces (settings page, Supply Library, Dock) when a location's
 * entitlement is flagged requires_inventory_reconciliation=true.
 *
 * Doctrine: data integrity gate. Suppress recommendations when the system
 * can't trust quantities, and tell the operator exactly what to do to
 * restore trust.
 */

import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useColorBarLocationEntitlements } from '@/hooks/color-bar/useColorBarLocationEntitlements';
import { useMarkInventoryVerified } from '@/hooks/color-bar/useMarkInventoryVerified';
import { formatRelativeTime } from '@/lib/format';
import { useColorBarOrgId } from '@/hooks/color-bar/useColorBarOrgId';
import { cn } from '@/lib/utils';

interface Props {
  /** Location to check. If omitted, banner aggregates across all org locations. */
  locationId?: string;
  className?: string;
  /** Optional CTA — typically "Begin reconciliation" linking to Supply Library. */
  onBegin?: () => void;
}

export function InventoryReconciliationBanner({ locationId, className, onBegin }: Props) {
  const orgId = useColorBarOrgId();
  const { entitlements } = useColorBarLocationEntitlements(orgId);
  const markVerified = useMarkInventoryVerified();

  // Filter to locations that need reconciliation
  const flagged = entitlements.filter((e) => {
    if (!e.requires_inventory_reconciliation) return false;
    if (locationId) return e.location_id === locationId;
    return true;
  });

  if (flagged.length === 0) return null;

  // For single-location surfaces, show specific copy + verify action
  const singleLoc = locationId ? flagged[0] : null;
  const suspendedAt = singleLoc?.suspended_at ?? null;
  const duration = suspendedAt ? formatRelativeTime(new Date(suspendedAt)) : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3',
        'flex items-start gap-3',
        className
      )}
      role="status"
    >
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium text-foreground">
          Inventory reconciliation required
        </p>
        <p className="font-sans text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {singleLoc ? (
            <>
              Color Bar tracking was off
              {duration ? <> for <strong>{duration}</strong></> : null}. Counts
              may be inaccurate until each item is physically verified — supply
              alerts and cost calculations are suspended for this location
              until then.
            </>
          ) : (
            <>
              {flagged.length} location{flagged.length > 1 ? 's require' : ' requires'} a
              physical inventory recount before supply alerts and cost
              calculations resume.
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onBegin && (
          <Button
            size="sm"
            variant="outline"
            className="font-sans text-xs h-8"
            onClick={onBegin}
          >
            Begin reconciliation
          </Button>
        )}
        {singleLoc && orgId && (
          <Button
            size="sm"
            className="font-sans text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() =>
              markVerified.mutate({
                organization_id: orgId,
                location_id: singleLoc.location_id,
              })
            }
            disabled={markVerified.isPending}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Mark verified
          </Button>
        )}
      </div>
    </div>
  );
}
