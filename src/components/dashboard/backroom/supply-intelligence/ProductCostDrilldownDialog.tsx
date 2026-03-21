/**
 * ProductCostDrilldownDialog — Full cost history timeline for a single product.
 */
import { format } from 'date-fns';
import { TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import {
  DRILLDOWN_DIALOG_CONTENT_CLASS,
  DRILLDOWN_OVERLAY_CLASS,
} from '@/components/dashboard/drilldownDialogStyles';
import type { ProductCostTrendItem } from '@/hooks/backroom/useProductCostTrend';

interface ProductCostDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductCostTrendItem | null;
}

export function ProductCostDrilldownDialog({
  open,
  onOpenChange,
  product,
}: ProductCostDrilldownDialogProps) {
  if (!product) return null;

  const entries = [...(product.costHistoryDetailed ?? [])].reverse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={DRILLDOWN_DIALOG_CONTENT_CLASS}
        overlayClassName={DRILLDOWN_OVERLAY_CLASS}
      >
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className={tokens.card.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className={cn(tokens.card.title, 'truncate')}>
                {product.productName}
              </DialogTitle>
              <DialogDescription className={tokens.body.muted}>
                {product.supplierName
                  ? `${product.supplierName} · `
                  : ''}
                90-day cost history
              </DialogDescription>
            </div>
            <div className="text-right shrink-0">
              <p className={tokens.body.emphasis}>
                <BlurredAmount>${product.currentCost.toFixed(2)}</BlurredAmount>
              </p>
              <p
                className={cn(
                  'text-xs font-sans',
                  product.changePercent > 0
                    ? product.changePercent > 10
                      ? 'text-destructive'
                      : 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {product.changePercent > 0 ? '+' : ''}
                {product.changePercent}%
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Timeline */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-5 pt-3">
            {entries.length === 0 ? (
              <p className={cn(tokens.body.muted, 'text-center py-6')}>
                No cost history available.
              </p>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-0">
                  {entries.map((entry, idx) => {
                    const prevEntry = idx < entries.length - 1 ? entries[idx + 1] : null;
                    const changePct = prevEntry && prevEntry.cost > 0
                      ? ((entry.cost - prevEntry.cost) / prevEntry.cost) * 100
                      : null;

                    return (
                      <div key={idx} className="flex items-start gap-3 py-2 relative">
                        {/* Dot */}
                        <div
                          className={cn(
                            'w-[9px] h-[9px] rounded-full mt-1.5 shrink-0 z-10 ring-2 ring-background',
                            idx === 0
                              ? 'bg-primary'
                              : 'bg-muted-foreground/40',
                          )}
                          style={{ marginLeft: '11px' }}
                        />

                        {/* Content */}
                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className={tokens.body.emphasis}>
                              <BlurredAmount>${entry.cost.toFixed(2)}</BlurredAmount>
                            </p>
                            <p className={cn(tokens.body.muted, 'text-xs')}>
                              {format(new Date(entry.date), 'MMM d, yyyy')}
                              {entry.supplier && ` · ${entry.supplier}`}
                            </p>
                          </div>

                          {changePct !== null && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'font-sans text-[10px] shrink-0 gap-0.5',
                                changePct > 0
                                  ? 'text-destructive'
                                  : changePct < 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-muted-foreground',
                              )}
                            >
                              {changePct > 0 ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : changePct < 0 ? (
                                <ArrowDown className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              {Math.abs(Math.round(changePct * 10) / 10)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
