/**
 * CancelReasonDialog — Captured BEFORE the soft-disable cascade runs.
 * Records *why* an organization is being suspended so the platform admin
 * has context on reactivation (e.g. non-payment vs. paused operations).
 *
 * Doctrine: silent suspensions destroy operator memory. Forcing a one-click
 * reason makes "why is this org off?" answerable from the dashboard alone.
 */

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CancelReason =
  | 'non_payment'
  | 'trial_ended'
  | 'paused_operations'
  | 'churned'
  | 'other';

const REASON_OPTIONS: { value: CancelReason; label: string; description: string }[] = [
  {
    value: 'non_payment',
    label: 'Non-payment',
    description: 'Card declined or invoice unpaid',
  },
  {
    value: 'trial_ended',
    label: 'Trial ended',
    description: 'Pilot period expired without conversion',
  },
  {
    value: 'paused_operations',
    label: 'Paused operations',
    description: 'Salon is temporarily closed',
  },
  {
    value: 'churned',
    label: 'Churned',
    description: 'Operator chose to leave the platform',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Capture details in the note below',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  isPending?: boolean;
  onConfirm: (payload: { reason: CancelReason; notes: string }) => void;
}

export function CancelReasonDialog({
  open,
  onOpenChange,
  orgName,
  isPending,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [notes, setNotes] = useState('');

  const handleClose = (next: boolean) => {
    if (!next) {
      setReason(null);
      setNotes('');
    }
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm({ reason, notes: notes.trim() });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <PauseCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            <AlertDialogTitle className="font-display tracking-wide">
              Suspend Color Bar
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="font-sans text-sm leading-relaxed pt-2">
            You're suspending Color Bar for <strong>{orgName}</strong>. Capture
            the reason — it surfaces in the reactivation dialog so the next
            admin understands the context.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="font-sans text-xs text-muted-foreground">
              Reason
            </Label>
            <div className="grid gap-1.5">
              {REASON_OPTIONS.map((opt) => {
                const active = reason === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReason(opt.value)}
                    className={cn(
                      'text-left rounded-lg border px-3 py-2 transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-muted/40',
                    )}
                  >
                    <div className="font-sans text-sm font-medium text-foreground">
                      {opt.label}
                    </div>
                    <div className="font-sans text-xs text-muted-foreground mt-0.5">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suspension-notes" className="font-sans text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              id="suspension-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the next admin should know…"
              className="font-sans text-sm min-h-[72px] resize-none"
              maxLength={500}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending || !reason}
          >
            {isPending ? 'Suspending…' : 'Suspend Color Bar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
