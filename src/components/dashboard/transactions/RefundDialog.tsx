import { useState } from 'react';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Gift, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { TransactionItem } from '@/hooks/useTransactions';
import { useProcessRefund } from '@/hooks/useRefunds';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface RefundDialogProps {
  transaction: TransactionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REFUND_REASONS = [
  'Product damaged or defective',
  'Service unsatisfactory',
  'Wrong item charged',
  'Client request',
  'Pricing error',
  'Other',
];

export function RefundDialog({ transaction, open, onOpenChange }: RefundDialogProps) {
  const [refundType, setRefundType] = useState<'original_payment' | 'salon_credit' | 'gift_card'>('salon_credit');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  
  const { effectiveOrganization } = useOrganizationContext();
  const processRefund = useProcessRefund();
  const { formatCurrency, currency } = useFormatCurrency();
  const { formatDate } = useFormatDate();

  const maxAmount = Number(transaction?.total_amount) || 0;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && transaction) {
      setRefundAmount(maxAmount.toFixed(2));
      setRefundType('salon_credit');
      setReason('');
      setNotes('');
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!transaction || !effectiveOrganization) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > maxAmount) {
      return;
    }

    await processRefund.mutateAsync({
      organizationId: effectiveOrganization.id,
      clientId: transaction.phorest_client_id || null,
      transactionId: transaction.transaction_id,
      transactionDate: transaction.transaction_date,
      itemName: transaction.item_name,
      refundAmount: amount,
      refundType,
      reason: reason || undefined,
      notes: notes || undefined,
    });

    onOpenChange(false);
  };

  const amount = parseFloat(refundAmount) || 0;
  const isValidAmount = amount > 0 && amount <= maxAmount;

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Issue a refund for this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Original Transaction Info */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">Original Transaction</p>
            <p className="font-medium">{transaction.item_name}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-muted-foreground">
                {transaction.client_name || 'Walk-in'} • {formatDate(new Date(transaction.transaction_date), 'MMM d, yyyy')}
              </span>
              <span className="font-medium">{formatCurrency(maxAmount)}</span>
            </div>
          </div>

          {/* Refund Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Refund Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="pl-7"
              />
            </div>
            {!isValidAmount && refundAmount && (
              <p className="text-sm text-destructive">
                Amount must be between {formatCurrency(0.01)} and {formatCurrency(maxAmount)}
              </p>
            )}
          </div>

          {/* Refund Method */}
          <div className="space-y-3">
            <Label>Refund Method</Label>
            <RadioGroup value={refundType} onValueChange={(v) => setRefundType(v as typeof refundType)}>
              <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setRefundType('original_payment')}>
                <RadioGroupItem value="original_payment" id="original" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="original" className="cursor-pointer flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Original Payment Method
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Flag for manual processing via PhorestPay terminal
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setRefundType('salon_credit')}>
                <RadioGroupItem value="salon_credit" id="credit" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="credit" className="cursor-pointer flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Salon Credit
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Added instantly to client's account
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setRefundType('gift_card')}>
                <RadioGroupItem value="gift_card" id="giftcard" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="giftcard" className="cursor-pointer flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Gift Card
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Add to client's gift card balance
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Warning for original payment */}
          {refundType === 'original_payment' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will create a pending refund that needs to be processed manually on the PhorestPay terminal.
              </AlertDescription>
            </Alert>
          )}

          {/* No client warning */}
          {!transaction.phorest_client_id && refundType !== 'original_payment' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This transaction has no linked client. Salon credits and gift cards require a client account.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              processRefund.isPending || 
              !isValidAmount || 
              (!transaction.phorest_client_id && refundType !== 'original_payment')
            }
          >
            {processRefund.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
