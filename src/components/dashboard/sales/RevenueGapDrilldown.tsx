import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Ban, UserX, AlertTriangle, Tag, ArrowRight, Shuffle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { RevenueGapAnalysis, GapItem, GapReason } from '@/hooks/useRevenueGapAnalysis';

interface RevenueGapDrilldownProps {
  isOpen: boolean;
  data: RevenueGapAnalysis | undefined;
  isLoading: boolean;
  showDates?: boolean;
}

const INITIAL_VISIBLE = 10;

const REASON_CONFIG: Record<GapReason, {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
}> = {
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    badgeClass: 'bg-destructive/10 text-destructive/80 border-destructive/20',
  },
  no_show: {
    label: 'No-show',
    icon: UserX,
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
  },
  no_pos_record: {
    label: 'No POS record',
    icon: AlertTriangle,
    badgeClass: 'bg-destructive/10 text-destructive/70 border-destructive/15',
  },
  discount: {
    label: 'Discount',
    icon: Tag,
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
  },
  service_changed: {
    label: 'Service changed',
    icon: Shuffle,
    badgeClass: 'bg-primary/10 text-primary/80 border-primary/20',
  },
  pricing_diff: {
    label: 'Pricing diff',
    icon: HelpCircle,
    badgeClass: 'bg-muted text-muted-foreground border-border/40',
  },
};

function GapItemRow({ item, showDates, formatCurrency }: {
  item: GapItem;
  showDates: boolean;
  formatCurrency: (v: number) => string;
}) {
  const config = REASON_CONFIG[item.reason];
  const Icon = config.icon;
  const showAmountShift = item.reason !== 'cancelled' && item.reason !== 'no_show' && item.actualAmount > 0;

  return (
    <div className="flex flex-col gap-1 text-[11px] py-2 px-2.5 rounded-md bg-muted/40 border border-border/20">
      {/* Row 1: Badge + client name + variance */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border shrink-0",
            config.badgeClass
          )}>
            <Icon className="w-2.5 h-2.5" />
            {config.label}
          </span>
          <span className="font-sans text-foreground truncate">{item.clientName}</span>
        </div>
        <BlurredAmount>
          <span className="font-sans text-destructive/80 whitespace-nowrap">
            -{formatCurrency(item.variance)}
          </span>
        </BlurredAmount>
      </div>

      {/* Row 2: Service · stylist · optional amount shift */}
      <div className="flex items-center gap-1 text-muted-foreground pl-0.5">
        <span className="truncate">
          {[
            item.serviceName,
            item.stylistName ? `w/ ${item.stylistName}` : null,
            showDates ? item.appointmentDate : null,
          ].filter(Boolean).join(' · ')}
        </span>
        {showAmountShift && (
          <span className="flex items-center gap-0.5 shrink-0 ml-auto">
            <BlurredAmount><span>{formatCurrency(item.scheduledAmount)}</span></BlurredAmount>
            <ArrowRight className="w-2.5 h-2.5" />
            <BlurredAmount><span>{formatCurrency(item.actualAmount)}</span></BlurredAmount>
          </span>
        )}
      </div>
    </div>
  );
}

export function RevenueGapDrilldown({ isOpen, data, isLoading, showDates = false }: RevenueGapDrilldownProps) {
  const { formatCurrency } = useFormatCurrency();
  const [showAll, setShowAll] = useState(false);

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

                {/* Unified gap item list */}
                {data.gapAmount > 0 && data.gapItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-display tracking-wide text-muted-foreground">
                      WHERE THE GAP CAME FROM
                    </p>

                    <div className="space-y-1">
                      {(showAll ? data.gapItems : data.gapItems.slice(0, INITIAL_VISIBLE)).map((item) => (
                        <GapItemRow
                          key={item.id + item.reason}
                          item={item}
                          showDates={showDates}
                          formatCurrency={formatCurrency}
                        />
                      ))}

                      {data.gapItems.length > INITIAL_VISIBLE && !showAll && (
                        <button
                          onClick={() => setShowAll(true)}
                          className="w-full text-[11px] text-primary/80 hover:text-primary py-1.5 transition-colors"
                        >
                          Show all {data.gapItems.length} items
                        </button>
                      )}
                    </div>

                    {/* Summary by category */}
                    {data.summaries.length > 1 && (
                      <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
                        {data.summaries.map(s => (
                          <div key={s.reason} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {s.label} ({s.count})
                            </span>
                            <BlurredAmount>
                              <span className="text-muted-foreground">
                                -{formatCurrency(s.totalVariance)}
                              </span>
                            </BlurredAmount>
                          </div>
                        ))}
                        {data.unexplainedGap > 0 && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Other / rounding</span>
                            <BlurredAmount>
                              <span className="text-muted-foreground">
                                -{formatCurrency(data.unexplainedGap)}
                              </span>
                            </BlurredAmount>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
