/**
 * CancelReasonDialog — Captured BEFORE the soft-disable cascade runs.
 * Records *why* an organization is being suspended so the platform admin
 * has context on reactivation (e.g. non-payment vs. paused operations).
 *
 * Doctrine: silent suspensions destroy operator memory. Forcing a one-click
 * reason makes "why is this org off?" answerable from the dashboard alone.
 *
 * Theme: Platform-scoped. All chrome reads from `--platform-*` tokens via
 * Platform* primitive wrappers — never from the org-side global tokens.
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogHeader,
  PlatformAlertDialogCancel,
  PlatformAlertDialogContent,
  PlatformAlertDialogDescription,
  PlatformAlertDialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
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
      <PlatformAlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center shrink-0">
              <PauseCircle className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
            </div>
            <PlatformAlertDialogTitle className="font-display tracking-wide">
              Suspend Color Bar
            </PlatformAlertDialogTitle>
          </div>
          <PlatformAlertDialogDescription className="font-sans text-sm leading-relaxed pt-2">
            You're suspending Color Bar for <strong>{orgName}</strong>. Capture
            the reason — it surfaces in the reactivation dialog so the next
            admin understands the context.
          </PlatformAlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <PlatformLabel className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
              Reason
            </PlatformLabel>
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
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--platform-primary))]',
                      active
                        ? 'border-[hsl(var(--platform-primary))] bg-[hsl(var(--platform-primary)/0.1)]'
                        : 'border-[hsl(var(--platform-border))] hover:border-[hsl(var(--platform-border)/0.8)] hover:bg-[hsl(var(--platform-bg-hover))]',
                    )}
                  >
                    <div className="font-sans text-sm font-medium text-[hsl(var(--platform-foreground))]">
                      {opt.label}
                    </div>
                    <div className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] mt-0.5">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <PlatformLabel htmlFor="suspension-notes" className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
              Notes (optional)
            </PlatformLabel>
            <PlatformTextarea
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
          <PlatformAlertDialogCancel disabled={isPending}>Cancel</PlatformAlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending || !reason}
            className="bg-[hsl(var(--platform-primary))] text-[hsl(var(--platform-primary-foreground))] hover:bg-[hsl(var(--platform-primary)/0.9)]"
          >
            {isPending ? 'Suspending…' : 'Suspend Color Bar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </PlatformAlertDialogContent>
    </AlertDialog>
  );
}
