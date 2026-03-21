import { ArrowUpRight, ArrowDownRight, Minus, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { ComparisonResult } from '@/hooks/useComparisonData';

interface ComparisonResultsGridProps {
  data: ComparisonResult | undefined;
  isLoading: boolean;
  periodALabel?: string;
  periodBLabel?: string;
}

export function ComparisonResultsGrid({ data, isLoading, periodALabel = 'Period A', periodBLabel = 'Period B' }: ComparisonResultsGridProps) {
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-card rounded-lg p-5 border animate-pulse">
            <div className="h-3 bg-muted rounded w-24 mb-3" />
            <div className="h-8 bg-muted rounded w-32 mb-2" />
            <div className="h-3 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Select periods to compare
      </div>
    );
  }

  const changePct = data.changes.totalRevenue;
  const diffVal = data.difference.revenue;
  const isPositive = changePct > 0;
  const isNeutral = changePct === 0;

  return (
    <div className="space-y-3">
      {/* Revenue cards side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Period A */}
        <div className="bg-card rounded-lg p-4 border border-l-2 border-l-primary">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {periodALabel}
          </p>
          <p className="text-2xl font-display tabular-nums">
            <BlurredAmount>{formatCurrencyWhole(data.periodA.totalRevenue)}</BlurredAmount>
          </p>
          <div className="flex gap-3 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
            <span>Services: {formatCurrencyWhole(data.periodA.serviceRevenue)}</span>
            <span>Products: {formatCurrencyWhole(data.periodA.productRevenue)}</span>
          </div>
        </div>

        {/* Period B */}
        <div className="bg-card rounded-lg p-4 border border-l-2 border-l-muted-foreground/30">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {periodBLabel}
          </p>
          <p className="text-2xl font-display tabular-nums text-muted-foreground">
            <BlurredAmount>{formatCurrencyWhole(data.periodB.totalRevenue)}</BlurredAmount>
          </p>
          <div className="flex gap-3 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground/60">
            <span>Services: {formatCurrencyWhole(data.periodB.serviceRevenue)}</span>
            <span>Products: {formatCurrencyWhole(data.periodB.productRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Change + Difference row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Change badge */}
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg border',
          isNeutral
            ? 'bg-muted/30 border-border/50'
            : isPositive
            ? 'bg-chart-2/5 border-chart-2/20'
            : 'bg-destructive/5 border-destructive/20'
        )}>
          {isNeutral ? (
            <Minus className="w-4 h-4 text-muted-foreground" />
          ) : isPositive ? (
            <ArrowUpRight className="w-4 h-4 text-chart-2" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-destructive" />
          )}
          <span className={cn(
            'text-lg font-display tabular-nums',
            isNeutral ? 'text-muted-foreground' : isPositive ? 'text-chart-2' : 'text-destructive'
          )}>
            {isPositive ? '+' : ''}{changePct.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">change</span>
        </div>

        {/* Difference badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-muted/20">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className={cn(
            'text-sm font-display tabular-nums',
            isNeutral ? 'text-muted-foreground' : isPositive ? 'text-chart-2' : 'text-destructive'
          )}>
            {diffVal >= 0 ? '+' : '-'}{formatCurrencyWhole(Math.abs(diffVal))}
          </span>
          <span className="text-xs text-muted-foreground">difference</span>
        </div>

        {/* Transactions change */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-muted/20">
          <span className="text-xs text-muted-foreground">Transactions:</span>
          <span className={cn(
            'text-sm font-medium tabular-nums',
            data.changes.totalTransactions === 0 ? 'text-muted-foreground'
              : data.changes.totalTransactions > 0 ? 'text-chart-2' : 'text-destructive'
          )}>
            {data.changes.totalTransactions > 0 ? '+' : ''}{data.changes.totalTransactions.toFixed(1)}%
          </span>
        </div>

        {/* Avg ticket change */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-muted/20">
          <span className="text-xs text-muted-foreground">Avg Ticket:</span>
          <span className={cn(
            'text-sm font-medium tabular-nums',
            data.changes.averageTicket === 0 ? 'text-muted-foreground'
              : data.changes.averageTicket > 0 ? 'text-chart-2' : 'text-destructive'
          )}>
            {data.changes.averageTicket > 0 ? '+' : ''}{data.changes.averageTicket.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
