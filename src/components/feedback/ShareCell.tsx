/**
 * ShareCell — gates the "Share" affordance on a per-location review with
 * `useCanActOnLocation`.
 *
 * Stylist Privacy Contract: a user mapped to Location A must not publish
 * a Location B review even though their org owns the OAuth token. Fail-closed:
 * hook returns false on RPC error → button hidden.
 *
 * Three gates (covered by `ShareCell.test.tsx`):
 *   1. locationId set + isLoading → render nothing (no button flash).
 *   2. locationId set + canAct !== true → render nothing.
 *   3. locationId set + canAct === true → render button.
 *
 * Legacy data (locationId == null, pre-federation rows) bypasses the hook
 * and renders the button — RLS at write-time is the backstop. Surfacing the
 * action lets org-admins drive backfill from Connect-Google.
 */
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useCanActOnLocation } from '@/hooks/useCanActOnLocation';

interface ShareCellProps {
  locationId: string | null;
  onShare: () => void;
}

export function ShareCell({ locationId, onShare }: ShareCellProps) {
  const { data: canAct, isLoading } = useCanActOnLocation(locationId);
  if (locationId && isLoading) return null;
  if (locationId && canAct !== true) return null;
  return (
    <Button
      variant="ghost"
      size={tokens.button.inline}
      className="gap-1.5"
      onClick={onShare}
      data-testid="share-cell-button"
    >
      <Share2 className="h-3.5 w-3.5" /> Share
    </Button>
  );
}
