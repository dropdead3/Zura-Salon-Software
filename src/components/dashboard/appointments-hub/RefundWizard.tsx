import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useProcessRefund } from '@/hooks/useRefunds';
import {
  type TransactionBreakdown,
  type TransactionLineItem,
} from '@/hooks/useAppointmentTransactionBreakdown';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Check, CreditCard, Wallet, Gift, Undo2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RefundWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown: TransactionBreakdown;
  organizationId: string;
  clientId: string | null;
  appointmentDate: string;
}

type RefundMethod = 'original_payment' | 'salon_credit' | 'gift_card';

interface ItemRefundState {
  selected: boolean;
  amount: number; // actual refund amount
  maxAmount: number; // original totalAmount
  percentageMode: boolean;
  percentage: number;
}

const REASONS = [
  { value: 'service_dissatisfaction', label: 'Service dissatisfaction' },
  { value: 'pricing_error', label: 'Pricing error' },
  { value: 'duplicate_charge', label: 'Duplicate charge' },
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'other', label: 'Other' },
];

const METHOD_OPTIONS: { value: RefundMethod; label: string; desc: string; icon: React.ElementType }[] = [
  { value: 'original_payment', label: 'Original Payment', desc: 'Flagged for PhorestPay processing', icon: CreditCard },
  { value: 'salon_credit', label: 'Salon Credit', desc: 'Applied to client balance immediately', icon: Wallet },
  { value: 'gift_card', label: 'Gift Card Balance', desc: 'Added to gift card balance immediately', icon: Gift },
];

export function RefundWizard({
  open,
  onOpenChange,
  breakdown,
  organizationId,
  clientId,
  appointmentDate,
}: RefundWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const processRefund = useProcessRefund();

  // Determine which items are already refunded
  const refundedTransactionIds = new Set(
    breakdown.refunds
      .filter((r) => r.status === 'completed' || r.status === 'approved')
      .map((r) => r.originalTransactionId)
  );

  // Filter to refundable items only (exclude already-refunded)
  const refundableItems = breakdown.items.filter(
    (item) => !refundedTransactionIds.has(item.transactionId)
  );

  // Item selection state
  const [itemStates, setItemStates] = useState<Record<string, ItemRefundState>>(() => {
    const init: Record<string, ItemRefundState> = {};
    refundableItems.forEach((item) => {
      init[item.id] = {
        selected: false,
        amount: item.totalAmount,
        maxAmount: item.totalAmount,
        percentageMode: false,
        percentage: 100,
      };
    });
    return init;
  });

  const [includeTip, setIncludeTip] = useState(false);
  const [method, setMethod] = useState<RefundMethod>('original_payment');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [manualOverride, setManualOverride] = useState(false);
  const [manualAmount, setManualAmount] = useState('');

  // Computed totals
  const selectedItems = useMemo(
    () => refundableItems.filter((i) => itemStates[i.id]?.selected),
    [refundableItems, itemStates]
  );

  const itemsRefundTotal = useMemo(() => {
    if (manualOverride && manualAmount) return Math.min(Number(manualAmount) || 0, breakdown.summary.grandTotal);
    return selectedItems.reduce((s, i) => s + (itemStates[i.id]?.amount || 0), 0);
  }, [selectedItems, itemStates, manualOverride, manualAmount, breakdown.summary.grandTotal]);

  // Proportional tax
  const totalBeforeTax = breakdown.items.reduce((s, i) => s + i.totalAmount, 0);
  const proportionalTax = totalBeforeTax > 0
    ? (itemsRefundTotal / totalBeforeTax) * breakdown.summary.taxTotal
    : 0;

  const tipRefund = includeTip ? breakdown.summary.tip : 0;
  const totalRefund = itemsRefundTotal + proportionalTax + tipRefund;

  // Quick actions
  const selectAll = () => {
    setManualOverride(false);
    setItemStates((prev) => {
      const next = { ...prev };
      refundableItems.forEach((i) => {
        next[i.id] = { ...next[i.id], selected: true, amount: next[i.id].maxAmount, percentage: 100 };
      });
      return next;
    });
  };

  const selectAllLessFees = () => {
    setManualOverride(false);
    setItemStates((prev) => {
      const next = { ...prev };
      refundableItems.forEach((i) => {
        const isFee = i.itemType?.toLowerCase() === 'sale_fee';
        next[i.id] = { ...next[i.id], selected: !isFee, amount: next[i.id].maxAmount, percentage: 100 };
      });
      return next;
    });
  };

  const selectServicesOnly = () => {
    setManualOverride(false);
    setItemStates((prev) => {
      const next = { ...prev };
      refundableItems.forEach((i) => {
        const isService = i.itemType?.toLowerCase() === 'service' || i.itemType?.toLowerCase() === 'special_offer_item';
        next[i.id] = { ...next[i.id], selected: isService, amount: next[i.id].maxAmount, percentage: 100 };
      });
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setManualOverride(false);
    setItemStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id].selected },
    }));
  };

  const updateItemPercentage = (id: string, pct: number) => {
    setItemStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        percentage: pct,
        amount: Math.round((prev[id].maxAmount * pct) / 100 * 100) / 100,
        percentageMode: true,
      },
    }));
  };

  const handleSubmit = async () => {
    if (totalRefund <= 0) {
      toast.error('Refund amount must be greater than zero');
      return;
    }

    try {
      // If manual override, create a single refund record
      if (manualOverride) {
        await processRefund.mutateAsync({
          organizationId,
          clientId,
          transactionId: breakdown.items[0]?.transactionId || 'manual',
          transactionDate: appointmentDate,
          itemName: 'Manual refund override',
          refundAmount: totalRefund,
          refundType: method,
          reason: reason || undefined,
          notes: notes || undefined,
        });
      } else {
        // Create one refund per selected item
        for (const item of selectedItems) {
          const state = itemStates[item.id];
          if (!state || state.amount <= 0) continue;

          // Calculate proportional tax for this item
          const itemPropTax = totalBeforeTax > 0
            ? (state.amount / totalBeforeTax) * breakdown.summary.taxTotal
            : 0;

          await processRefund.mutateAsync({
            organizationId,
            clientId,
            transactionId: item.transactionId,
            transactionDate: appointmentDate,
            itemName: item.itemName,
            refundAmount: state.amount + itemPropTax,
            refundType: method,
            reason: reason || undefined,
            notes: notes || undefined,
          });
        }

        // Tip refund as separate record
        if (includeTip && tipRefund > 0) {
          await processRefund.mutateAsync({
            organizationId,
            clientId,
            transactionId: breakdown.items[0]?.transactionId || 'tip',
            transactionDate: appointmentDate,
            itemName: 'Tip refund',
            refundAmount: tipRefund,
            refundType: method,
            reason: reason || undefined,
            notes: 'Tip refund',
          });
        }
      }

      onOpenChange(false);
    } catch {
      // Error handled by hook's onError
    }
  };

  const canProceedStep1 = totalRefund > 0;
  const canSubmit = totalRefund > 0 && !processRefund.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={tokens.heading.card}>
            <Undo2 className="w-5 h-5 inline mr-2 -mt-0.5" />
            Issue Refund
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 — {step === 1 ? 'Select items' : step === 2 ? 'Choose method' : 'Confirm'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* ── Step 1: Select items ── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Refund All</Button>
              <Button variant="outline" size="sm" onClick={selectAllLessFees}>All Less Fees</Button>
              <Button variant="outline" size="sm" onClick={selectServicesOnly}>Services Only</Button>
              <Button
                variant={manualOverride ? 'default' : 'outline'}
                size="sm"
                onClick={() => setManualOverride(!manualOverride)}
              >
                Manual Amount
              </Button>
            </div>

            {manualOverride ? (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Enter refund amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={breakdown.summary.grandTotal}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Max: <BlurredAmount>${breakdown.summary.grandTotal.toFixed(2)}</BlurredAmount>
                </p>
              </div>
            ) : (
              <>
                {/* Item list */}
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {refundableItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                      All items have already been refunded.
                    </div>
                  ) : (
                    refundableItems.map((item) => {
                      const state = itemStates[item.id];
                      if (!state) return null;
                      return (
                        <div key={item.id} className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={state.selected}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{item.itemName}</span>
                              <Badge variant="outline" className="ml-2 text-[10px]">{item.itemType}</Badge>
                            </div>
                            <span className="text-sm shrink-0">
                              <BlurredAmount>${state.amount.toFixed(2)}</BlurredAmount>
                            </span>
                          </div>
                          {state.selected && (
                            <div className="pl-8 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{state.percentage}%</span>
                                <Slider
                                  value={[state.percentage]}
                                  onValueChange={([v]) => updateItemPercentage(item.id, v)}
                                  min={1}
                                  max={100}
                                  step={1}
                                  variant="filled"
                                  className="flex-1"
                                />
                                <span><BlurredAmount>${state.amount.toFixed(2)}</BlurredAmount></span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Tip toggle */}
                {breakdown.summary.tip > 0 && (
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Checkbox checked={includeTip} onCheckedChange={() => setIncludeTip(!includeTip)} />
                    <span className="text-sm flex-1">Include tip refund</span>
                    <span className="text-sm">
                      <BlurredAmount>${breakdown.summary.tip.toFixed(2)}</BlurredAmount>
                    </span>
                  </div>
                )}
              </>
            )}

            <Separator />

            {/* Running total */}
            <div className="flex justify-between font-medium text-sm">
              <span>Refund Total</span>
              <span className="text-destructive">
                <BlurredAmount>-${totalRefund.toFixed(2)}</BlurredAmount>
              </span>
            </div>
            {proportionalTax > 0 && !manualOverride && (
              <p className="text-xs text-muted-foreground">
                Includes <BlurredAmount>${proportionalTax.toFixed(2)}</BlurredAmount> proportional tax
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Method ── */}
        {step === 2 && (
          <div className="space-y-3">
            {METHOD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = method === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                  onClick={() => setMethod(opt.value)}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                  {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}

            {!clientId && method !== 'original_payment' && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                No client linked — credit/gift card balance cannot be applied.
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div className="space-y-4">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason (optional)" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Additional notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />

            <Separator />

            {/* Summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{manualOverride ? 'Manual override' : `${selectedItems.length} item(s)`}</span>
              </div>
              {!manualOverride && selectedItems.map((i) => (
                <div key={i.id} className="flex justify-between pl-4 text-xs text-muted-foreground">
                  <span>{i.itemName}</span>
                  <span><BlurredAmount>${itemStates[i.id]?.amount.toFixed(2)}</BlurredAmount></span>
                </div>
              ))}
              {includeTip && (
                <div className="flex justify-between pl-4 text-xs text-muted-foreground">
                  <span>Tip</span>
                  <span><BlurredAmount>${tipRefund.toFixed(2)}</BlurredAmount></span>
                </div>
              )}
              {proportionalTax > 0 && !manualOverride && (
                <div className="flex justify-between pl-4 text-xs text-muted-foreground">
                  <span>Tax (proportional)</span>
                  <span><BlurredAmount>${proportionalTax.toFixed(2)}</BlurredAmount></span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Refund</span>
                <span className="text-destructive">
                  <BlurredAmount>-${totalRefund.toFixed(2)}</BlurredAmount>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span>{METHOD_OPTIONS.find((m) => m.value === method)?.label}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && !canProceedStep1}
              className="gap-1.5"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processRefund.isPending ? 'Processing…' : 'Confirm Refund'}
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
