import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Banknote, CreditCard, DollarSign, HandCoins } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { resolvePaymentKey } from './PaymentMethodBadge';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';

interface TillBalanceSummaryProps {
  transactions: GroupedTransaction[];
}

export function TillBalanceSummary({ transactions }: TillBalanceSummaryProps) {
  const { formatCurrency } = useFormatCurrency();

  const totals = transactions.reduce(
    (acc, txn) => {
      // Exclude voided and fully refunded transactions
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

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 px-5 py-3 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <span className={cn(tokens.kpi.label, 'text-[10px]')}>Till Balance</span>
        <MetricInfoTooltip description="Total of subtotal + tax for non-voided, non-refunded transactions. Tips shown separately." />
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
      </div>
    </div>
  );
}
