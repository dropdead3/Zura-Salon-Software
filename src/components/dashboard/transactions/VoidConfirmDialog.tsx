import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useVoidTransaction } from '@/hooks/useVoidTransaction';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { DRILLDOWN_DIALOG_CONTENT_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { tokens } from '@/lib/design-tokens';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';

interface VoidConfirmDialogProps {
  transaction: GroupedTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoidConfirmDialog({ transaction, open, onOpenChange }: VoidConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const voidMutation = useVoidTransaction();
  const { formatCurrency } = useFormatCurrency();

  // Reset reason when dialog opens
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleVoid = async () => {
    if (!transaction) return;
    try {
      await voidMutation.mutateAsync({
        transactionId: transaction.transactionId,
        reason,
      });
      setReason('');
      onOpenChange(false);
    } catch {
      // Toast is handled by the mutation's onError — dialog stays open for retry
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={DRILLDOWN_DIALOG_CONTENT_CLASS}
        style={{ left: 'calc(50% + var(--sidebar-offset, 0px))' }}
      >
        <AlertDialogHeader className="p-5 pb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle className={tokens.drawer.title}>
              Void Transaction
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className={tokens.body.muted}>
            This will permanently void the transaction for{' '}
            <span className="font-medium text-foreground">
              {transaction?.clientName || 'Walk-in'}
            </span>{' '}
            totalling{' '}
            <span className="font-medium text-foreground">
              <BlurredAmount>{formatCurrency(transaction?.totalAmount || 0)}</BlurredAmount>
            </span>.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="px-5 pb-4">
          <Label className={tokens.label.default}>Reason for voiding</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for voiding this transaction..."
            className="mt-2 resize-none"
            rows={3}
          />
        </div>

        <AlertDialogFooter className="px-5 pb-5 pt-0">
          <AlertDialogCancel className="rounded-full" disabled={voidMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleVoid}
            disabled={!reason.trim() || voidMutation.isPending}
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {voidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Void Transaction
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
