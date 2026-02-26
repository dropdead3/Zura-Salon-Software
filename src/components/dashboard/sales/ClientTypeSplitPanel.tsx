import { AnimatePresence, motion } from 'framer-motion';
import { UserPlus, UserCheck, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { cn } from '@/lib/utils';
import { useClientTypeSplit, type ClientTypeSegment } from '@/hooks/useClientTypeSplit';

interface ClientTypeSplitPanelProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

function SegmentCard({ segment, total, icon, color, delay }: {
  segment: ClientTypeSegment;
  total: number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const pct = total > 0 ? Math.round((segment.count / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium font-display">{segment.label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" indicatorClassName={color} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-display">Visits</p>
          <p className="text-sm font-display tabular-nums">{formatNumber(segment.count)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-display">Avg Ticket</p>
          <p className="text-sm font-display tabular-nums">
            <BlurredAmount>{formatCurrencyWhole(Math.round(segment.avgTicket))}</BlurredAmount>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-display">Revenue</p>
          <p className="text-sm font-display tabular-nums">
            <BlurredAmount>{formatCurrencyWhole(Math.round(segment.revenue))}</BlurredAmount>
          </p>
        </div>
      </div>
      {/* Rebooking rate */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/30">
        <RefreshCw className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Rebooking Rate</span>
        <span className="text-xs font-medium ml-auto tabular-nums">
          {segment.rebookingRate}%
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          ({segment.rebookedCount} of {segment.count})
        </span>
      </div>
    </motion.div>
  );
}

export function ClientTypeSplitPanel({ isOpen, dateFrom, dateTo, locationId }: ClientTypeSplitPanelProps) {
  const { data, isLoading } = useClientTypeSplit({ dateFrom, dateTo, locationId, enabled: isOpen });

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-medium font-display">
                  Client Type Breakdown
                </span>
              </div>
              {data && (
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Overall Rebook: <span className="font-medium text-foreground">{data.overallRebookingRate}%</span>
                  </span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            ) : !data ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            ) : (
              <>
                {/* Visual split bar */}
                <div className="space-y-1">
                  <div className="h-3 rounded-full overflow-hidden flex bg-muted/50">
                    <div
                      className="h-full bg-chart-4 transition-all"
                      style={{ width: `${data.totalTransactions > 0 ? (data.newClients.count / data.totalTransactions) * 100 : 0}%` }}
                    />
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${data.totalTransactions > 0 ? (data.returningClients.count / data.totalTransactions) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-chart-4" /> New
                    </span>
                    <span className="flex items-center gap-1">
                      Returning <div className="w-2 h-2 rounded-full bg-primary" />
                    </span>
                  </div>
                </div>

                {/* Segment cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SegmentCard
                    segment={data.newClients}
                    total={data.totalTransactions}
                    icon={<UserPlus className="w-4 h-4 text-chart-4" />}
                    color="bg-chart-4"
                    delay={0.05}
                  />
                  <SegmentCard
                    segment={data.returningClients}
                    total={data.totalTransactions}
                    icon={<UserCheck className="w-4 h-4 text-primary" />}
                    color="bg-primary"
                    delay={0.1}
                  />
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
