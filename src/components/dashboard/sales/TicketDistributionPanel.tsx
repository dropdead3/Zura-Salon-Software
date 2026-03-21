import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useTicketDistribution } from '@/hooks/useTicketDistribution';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface TicketDistributionPanelProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function TicketDistributionPanel({ isOpen, dateFrom, dateTo, locationId }: TicketDistributionPanelProps) {
  const { data, isLoading } = useTicketDistribution(dateFrom, dateTo, locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  const hasData = data && data.buckets.some(b => b.count > 0);
  const maxCount = hasData ? Math.max(...data!.buckets.map(b => b.count)) : 0;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="ticket-distribution"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pt-3 pb-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs tracking-wide uppercase text-muted-foreground font-medium">
                Ticket Distribution
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : !hasData ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No ticket data for this period</p>
            ) : (
              <>
                {/* Median vs Average comparison */}
                <div className="flex items-center gap-4 px-2 py-2 bg-muted/20 rounded-lg">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Median</p>
                    <p className="text-sm font-display tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(Math.round(data!.median))}</BlurredAmount>
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border/50" />
                  <div className="flex-1 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average</p>
                    <p className="text-sm font-display tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(Math.round(data!.average))}</BlurredAmount>
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border/50" />
                  <div className="flex-1 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Above Avg</p>
                    <p className="text-sm font-display tabular-nums">{data!.aboveAvgPct}%</p>
                  </div>
                </div>

                {/* Histogram bars */}
                <div className="space-y-1">
                  {data!.buckets.map((bucket, index) => {
                    const pct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                    const isSweetSpot = bucket.label === data!.sweetSpotLabel && bucket.count > 0;
                    return (
                      <motion.div
                        key={bucket.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="flex items-center gap-3 py-1 px-2 rounded-md hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-xs text-muted-foreground tabular-nums w-[60px] text-right">
                          {bucket.label}
                        </span>
                        <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${isSweetSpot ? 'bg-primary' : 'bg-primary/60'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: index * 0.04, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs tabular-nums w-[32px] text-right font-medium">
                          {bucket.count}
                        </span>
                        {isSweetSpot && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                            Sweet Spot
                          </Badge>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
