/**
 * ReactivationConfirmDialog — Shown before re-enabling Color Bar for an
 * organization that was previously suspended. Forces explicit acknowledgment
 * that inventory levels can no longer be trusted and a physical recount is
 * required at every affected location before formula costs and supply
 * alerts will resume accuracy.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  /** ISO timestamp of the most recent suspension (used to compute duration). */
  suspendedAt: string | null;
  /** Names of locations that will require inventory reconciliation. */
  affectedLocations: string[];
  isPending?: boolean;
  onConfirm: () => void;
}

export function ReactivationConfirmDialog({
  open,
  onOpenChange,
  orgName,
  suspendedAt,
  affectedLocations,
  isPending,
  onConfirm,
}: Props) {
  const duration = suspendedAt ? formatRelativeTime(new Date(suspendedAt)) : 'an unknown period';
  const suspendedDate = suspendedAt ? new Date(suspendedAt).toLocaleDateString() : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <AlertDialogTitle className="font-display tracking-wide">
              Confirm inventory reconciliation
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="font-sans text-sm leading-relaxed pt-2 space-y-3">
            <span className="block">
              Color Bar tracking has been off for <strong>{duration}</strong>
              {suspendedDate ? <> (since {suspendedDate})</> : null}. Inventory
              levels recorded before the pause cannot be trusted — products may
              have been used, restocked, or wasted without tracking.
            </span>
            <span className="block">
              Reactivating <strong>{orgName}</strong> will require each location
              to perform a physical count and update quantities before formula
              costs and supply-low alerts will resume accuracy.
            </span>
            {affectedLocations.length > 0 && (
              <span className="block">
                <span className="text-muted-foreground">Locations requiring reconciliation:</span>
                <span className="block mt-1 pl-3 border-l-2 border-amber-500/30">
                  {affectedLocations.map((name) => (
                    <span key={name} className="block text-foreground">
                      • {name}
                    </span>
                  ))}
                </span>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isPending ? 'Reactivating…' : 'Reactivate and require reconciliation'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
