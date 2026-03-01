import { AnimatePresence, motion } from 'framer-motion';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Ban, UserX, HelpCircle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { RevenueGapAnalysis } from '@/hooks/useRevenueGapAnalysis';

interface RevenueGapDrilldownProps {
  isOpen: boolean;
  data: RevenueGapAnalysis | undefined;
  isLoading: boolean;
}

export function RevenueGapDrilldown({ isOpen, data, isLoading }: RevenueGapDrilldownProps) {
  const { formatCurrency } = useFormatCurrency();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="mt-4 mx-auto max-w-sm space-y-4 border-t border-border/40 pt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : data ? (
              <>
                {/* Summary bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Actual vs Expected</span>
                    <BlurredAmount>
                      <span className={cn(
                        "font-medium",
                        data.gapAmount <= 0 ? "text-success-foreground" : "text-warning"
                      )}>
                        {data.gapAmount <= 0 ? '+' : '-'}{formatCurrency(Math.abs(data.gapAmount))}
                      </span>
                    </BlurredAmount>
                  </div>
                  <Progress
                    value={data.expectedRevenue > 0
                      ? Math.min((data.actualRevenue / data.expectedRevenue) * 100, 100)
                      : 0
                    }
                    className="h-1.5"
                    indicatorClassName={data.gapAmount <= 0 ? "bg-success-foreground" : undefined}
                  />
                </div>

                {/* Gap breakdown */}
                {data.gapAmount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-display tracking-wide text-muted-foreground">GAP BREAKDOWN</p>

                    {/* Cancellations */}
                    {data.cancellations.count > 0 && (
                      <div className="flex items-center justify-between text-xs bg-card-inner rounded-lg px-3 py-2 border border-border/30">
                        <div className="flex items-center gap-2">
                          <Ban className="w-3.5 h-3.5 text-destructive/70" />
                          <span className="text-muted-foreground">
                            {data.cancellations.count} cancellation{data.cancellations.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <BlurredAmount>
                          <span className="font-medium text-destructive/80">
                            -{formatCurrency(data.cancellations.lostRevenue)}
                          </span>
                        </BlurredAmount>
                      </div>
                    )}

                    {/* No-shows */}
                    {data.noShows.count > 0 && (
                      <div className="flex items-center justify-between text-xs bg-card-inner rounded-lg px-3 py-2 border border-border/30">
                        <div className="flex items-center gap-2">
                          <UserX className="w-3.5 h-3.5 text-warning" />
                          <span className="text-muted-foreground">
                            {data.noShows.count} no-show{data.noShows.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <BlurredAmount>
                          <span className="font-medium text-warning">
                            -{formatCurrency(data.noShows.lostRevenue)}
                          </span>
                        </BlurredAmount>
                      </div>
                    )}

                    {/* Unexplained variance */}
                    {data.unexplainedGap > 0 && (
                      <div className="flex items-center justify-between text-xs bg-card-inner rounded-lg px-3 py-2 border border-border/30">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Pricing / discounts / other</span>
                        </div>
                        <BlurredAmount>
                          <span className="font-medium text-muted-foreground">
                            -{formatCurrency(data.unexplainedGap)}
                          </span>
                        </BlurredAmount>
                      </div>
                    )}
                  </div>
                )}

                {/* Insight text */}
                {data.gapAmount > 0 && (data.cancellations.count > 0 || data.noShows.count > 0) && (
                  <p className="text-xs text-muted-foreground/80 text-center leading-relaxed">
                    {(() => {
                      const totalExplained = data.cancellations.lostRevenue + data.noShows.lostRevenue;
                      if (totalExplained <= 0 || data.gapAmount <= 0) return null;
                      const pct = Math.round((data.cancellations.lostRevenue / data.gapAmount) * 100);
                      if (data.cancellations.lostRevenue > data.noShows.lostRevenue) {
                        return `Cancellations accounted for ${pct}% of the revenue gap this period.`;
                      }
                      const noShowPct = Math.round((data.noShows.lostRevenue / data.gapAmount) * 100);
                      return `No-shows accounted for ${noShowPct}% of the revenue gap this period.`;
                    })()}
                  </p>
                )}

                {data.gapAmount <= 0 && (
                  <p className="text-xs text-success-foreground/80 text-center">
                    Actual revenue met or exceeded expectations for this period.
                  </p>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
