import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useTransactionsByHour } from '@/hooks/useTransactionsByHour';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionsByHourPanelProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr} ${ampm}`;
}

export function TransactionsByHourPanel({ isOpen, dateFrom, dateTo, locationId }: TransactionsByHourPanelProps) {
  const { data, isLoading } = useTransactionsByHour(dateFrom, dateTo, locationId);

  const { maxCount, peakHour, avgPerHour } = useMemo(() => {
    if (!data || data.length === 0) return { maxCount: 0, peakHour: -1, avgPerHour: 0 };
    const max = Math.max(...data.map(d => d.count));
    const peak = data.find(d => d.count === max);
    const total = data.reduce((s, d) => s + d.count, 0);
    return { maxCount: max, peakHour: peak?.hour ?? -1, avgPerHour: Math.round(total / data.length) };
  }, [data]);

  const hasData = data && data.some(d => d.count > 0);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="transactions-by-hour"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pt-3 pb-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs tracking-wide uppercase text-muted-foreground font-medium font-display">
                  Volume by Hour
                </span>
              </div>
              {hasData && (
                <span className="text-xs text-muted-foreground">
                  Avg: <span className="font-medium text-foreground">{avgPerHour}</span>/hr
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : !hasData ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No transaction data for this period</p>
            ) : (
              <div className="space-y-1">
                {data!.map((entry, index) => {
                  const pct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
                  const isPeak = entry.hour === peakHour && entry.count > 0;
                  return (
                    <motion.div
                      key={entry.hour}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "grid grid-cols-[50px_1fr_36px_auto] items-center gap-3 py-1 px-2 rounded-md hover:bg-muted/30 transition-colors",
                        index % 2 === 0 && "bg-muted/15"
                      )}
                    >
                      <span className="text-xs text-muted-foreground tabular-nums text-right">
                        {formatHour(entry.hour)}
                      </span>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${isPeak ? 'bg-primary' : 'bg-primary/60'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: index * 0.03, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-right font-medium">
                        {entry.count}
                      </span>
                      <span className="w-[60px]">
                        {isPeak && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                            Peak
                          </Badge>
                        )}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
