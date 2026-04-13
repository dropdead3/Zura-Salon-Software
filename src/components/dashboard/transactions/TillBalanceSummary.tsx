import { useState } from 'react';
import { format } from 'date-fns';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Banknote, CreditCard, DollarSign, HandCoins, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { resolvePaymentKey } from './PaymentMethodBadge';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';
import { useTillReconciliation, type ReconciliationResult } from '@/hooks/useTillReconciliation';
import { Button } from '@/components/ui/button';

interface TillBalanceSummaryProps {
  transactions: GroupedTransaction[];
  organizationId?: string;
  selectedDate?: Date;
}

export function TillBalanceSummary({ transactions, organizationId, selectedDate }: TillBalanceSummaryProps) {
  const { formatCurrency } = useFormatCurrency();
  const { reconcile, result: reconciliation, isLoading: isReconciling } = useTillReconciliation(organizationId);
  const [showDetails, setShowDetails] = useState(false);

  const totals = transactions.reduce(
    (acc, txn) => {
      if (txn.isVoided) return acc;
      if (txn.refundStatus === 'completed') return acc;

      const amount = txn.totalAmount;
      const key = resolvePaymentKey(txn.paymentMethod || '');
      if (key === 'cash') {
        acc.cash += amount;
      } else if (key === 'split') {
        acc.split += amount;
      } else {
        acc.card += amount;
      }
      acc.tips += txn.tipAmount;
      acc.total += amount;
      return acc;
    },
    { cash: 0, card: 0, split: 0, tips: 0, total: 0 }
  );

  const handleReconcile = () => {
    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    reconcile(dateStr);
  };

  const segments = [
    { label: 'Cash', value: totals.cash, icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Card', value: totals.card, icon: CreditCard, color: 'text-blue-600 dark:text-blue-400' },
    ...(totals.split > 0
      ? [{ label: 'Split', value: totals.split, icon: DollarSign, color: 'text-purple-600 dark:text-purple-400' }]
      : []),
    ...(totals.tips > 0
      ? [{ label: 'Tips', value: totals.tips, icon: HandCoins, color: 'text-amber-600 dark:text-amber-400' }]
      : []),
  ];

  const hasDiscrepancies = reconciliation && !reconciliation.is_reconciled;
  const stripeCardTotal = reconciliation
    ? (reconciliation.stripe.net_amount_cents / 100)
    : null;

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border/50 bg-muted/30 px-5 py-3 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className={cn(tokens.kpi.label, 'text-[10px]')}>Till Balance</span>
          <MetricInfoTooltip description="Total of subtotal + tax for non-voided, non-refunded transactions. Tips shown separately. Use Reconcile to verify card totals against Stripe." />
          <span className={cn(tokens.stat.large, 'text-lg')}>
            <BlurredAmount>{formatCurrency(totals.total)}</BlurredAmount>
          </span>
        </div>
        <div className="flex items-center gap-5">
          {segments.map(seg => (
            <div key={seg.label} className="flex items-center gap-1.5">
              <seg.icon className={cn('w-3.5 h-3.5', seg.color)} />
              <span className="text-xs text-muted-foreground">{seg.label}</span>
              <span className="text-xs font-medium tabular-nums">
                <BlurredAmount>{formatCurrency(seg.value)}</BlurredAmount>
              </span>
            </div>
          ))}
          {organizationId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={handleReconcile}
              disabled={isReconciling}
            >
              {isReconciling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : reconciliation?.is_reconciled ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : hasDiscrepancies ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              {reconciliation ? 'Re-check' : 'Reconcile'}
            </Button>
          )}
        </div>
      </div>

      {/* Reconciliation results */}
      {reconciliation && (
        <div
          className={cn(
            'rounded-xl border px-5 py-3 text-xs',
            reconciliation.is_reconciled
              ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {reconciliation.is_reconciled ? (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-medium">Reconciled</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Discrepancies found</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>Stripe: <strong className="text-foreground">{formatCurrency(stripeCardTotal ?? 0)}</strong> ({reconciliation.stripe.total_payments} payments)</span>
                <span>Local: <strong className="text-foreground">{formatCurrency(totals.card)}</strong></span>
                {stripeCardTotal !== null && Math.abs(stripeCardTotal - totals.card) > 0.01 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Δ {formatCurrency(Math.abs(stripeCardTotal - totals.card))}
                  </span>
                )}
              </div>
            </div>
            {!reconciliation.is_reconciled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Details'}
              </Button>
            )}
          </div>

          {showDetails && !reconciliation.is_reconciled && (
            <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
              {reconciliation.discrepancies.unmatched_stripe.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mb-1">
                    In Stripe but not in local records:
                  </p>
                  {reconciliation.discrepancies.unmatched_stripe.map(pi => (
                    <div key={pi.id} className="flex items-center gap-3 text-muted-foreground py-0.5">
                      <code className="text-[10px]">{pi.id.slice(0, 20)}…</code>
                      <span>{formatCurrency(pi.amount / 100)}</span>
                      {pi.metadata?.appointment_id && (
                        <span className="text-[10px]">Apt: {pi.metadata.appointment_id.slice(0, 8)}…</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {reconciliation.discrepancies.orphaned_local.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mb-1">
                    In local records but not in Stripe:
                  </p>
                  {reconciliation.discrepancies.orphaned_local.map(item => (
                    <div key={item.appointment_id} className="flex items-center gap-3 text-muted-foreground py-0.5">
                      <code className="text-[10px]">{item.stripe_payment_intent_id.slice(0, 20)}…</code>
                      <span className="text-[10px]">Status: {item.local_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
