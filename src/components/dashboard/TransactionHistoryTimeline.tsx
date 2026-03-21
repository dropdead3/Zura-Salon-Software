import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ShoppingBag, Scissors, User, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { EmptyState } from '@/components/ui/empty-state';
import { tokens } from '@/lib/design-tokens';
import type { ClientTransaction, ClientTransactionSummary } from '@/hooks/useClientTransactionHistory';

interface TransactionHistoryTimelineProps {
  transactions: ClientTransaction[];
  summary: ClientTransactionSummary;
  isLoading: boolean;
}

function SpendSummary({ summary }: { summary: ClientTransactionSummary }) {
  const { formatCurrencyWhole } = useFormatCurrency();

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <Card className="p-3 text-center bg-card/80 backdrop-blur-xl border-border/60">
        <p className="text-xs text-muted-foreground">Total Spend</p>
        <p className="font-display text-lg tracking-wide">
          <BlurredAmount>{formatCurrencyWhole(summary.totalSpend)}</BlurredAmount>
        </p>
      </Card>
      <Card className="p-3 text-center bg-card/80 backdrop-blur-xl border-border/60">
        <p className="text-xs text-muted-foreground">Avg Ticket</p>
        <p className="font-display text-lg tracking-wide">
          <BlurredAmount>{formatCurrencyWhole(summary.averageTicket)}</BlurredAmount>
        </p>
      </Card>
      <Card className="p-3 text-center bg-card/80 backdrop-blur-xl border-border/60">
        <Scissors className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
        <p className="text-xs text-muted-foreground">Services</p>
        <p className="font-display text-base tracking-wide">
          <BlurredAmount>{formatCurrencyWhole(summary.serviceSpend)}</BlurredAmount>
        </p>
      </Card>
      <Card className="p-3 text-center bg-card/80 backdrop-blur-xl border-border/60">
        <ShoppingBag className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
        <p className="text-xs text-muted-foreground">Products</p>
        <p className="font-display text-base tracking-wide">
          <BlurredAmount>{formatCurrencyWhole(summary.productSpend)}</BlurredAmount>
        </p>
      </Card>
    </div>
  );
}

export function TransactionHistoryTimeline({ transactions, summary, isLoading }: TransactionHistoryTimelineProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions"
        description="No transaction history found for this client."
        className="py-10"
      />
    );
  }

  // Group transactions by date
  const byDate = transactions.reduce((acc, tx) => {
    const date = tx.transactionDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, ClientTransaction[]>);

  return (
    <div>
      <SpendSummary summary={summary} />

      <div className="space-y-4">
        {Object.entries(byDate).map(([date, dateTxs]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatDate(new Date(date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            <div className="space-y-2 ml-6 border-l-2 border-muted pl-4">
              {dateTxs.map((tx, idx) => (
                <Card key={`${tx.transactionId}-${idx}`} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.itemName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            tx.itemType === 'product'
                              ? "border-blue-500/40 text-blue-600 dark:text-blue-400"
                              : "border-green-500/40 text-green-600 dark:text-green-400"
                          )}
                        >
                          {tx.itemType === 'product' ? (
                            <><ShoppingBag className="w-3 h-3 mr-1" />Product</>
                          ) : (
                            <><Scissors className="w-3 h-3 mr-1" />Service</>
                          )}
                        </Badge>
                        {tx.itemCategory && (
                          <Badge variant="outline" className="text-xs">
                            {tx.itemCategory}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-sm shrink-0">
                      <BlurredAmount>{formatCurrencyWhole(tx.totalAmount)}</BlurredAmount>
                    </span>
                  </div>

                  {(tx.staffName || tx.quantity > 1) && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {tx.staffName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {tx.staffName}
                        </span>
                      )}
                      {tx.quantity > 1 && (
                        <span>Qty: {tx.quantity}</span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
